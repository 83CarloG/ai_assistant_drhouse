"use strict";

const path = require('path');
const fs = require('fs');
const csv = require('csvtojson');
const { SchemaFieldTypes } = require('@redis/search');
const config = require(path.resolve(process.cwd(), "config"));
const { createEmbedding } = require(path.resolve(process.cwd(), 'drivers', 'localEmbeddings'));
const { getClient } = require(path.resolve(process.cwd(), 'drivers', 'redis'));

// Constants
const MEDICINE_INDEX = 'medicine_idx';
const DOC_PREFIX = 'medicine:';
const BATCH_SIZE = 100; // Aumentato significativamente dai 5 originali

async function createIndex(client) {
    try {
        // Check if Redis supports RediSearch
        try {
            await client.sendCommand(['FT._LIST']);
            console.log('RediSearch module is available');
        } catch (err) {
            console.error('ERROR: RediSearch module is not loaded in Redis!');
            process.exit(1);
        }

        // Drop index if it exists
        try {
            await client.ft.dropIndex(MEDICINE_INDEX);
            console.log(`Dropped existing index: ${MEDICINE_INDEX}`);
        } catch (err) {
            console.log(`No existing index found to drop`);
        }

        // Create vector index with schema - versione semplificata
        await client.ft.create(MEDICINE_INDEX, {
            name: {
                type: SchemaFieldTypes.TEXT,
                sortable: true
            },
            composition: {
                type: SchemaFieldTypes.TEXT,
            },
            uses: {
                type: SchemaFieldTypes.TEXT,
                WEIGHT: 5.0  // Manteniamo il peso maggiore per il campo uses
            },
            side_effects: {
                type: SchemaFieldTypes.TEXT,
            },
            manufacturer: {
                type: SchemaFieldTypes.TAG,
                sortable: true
            },
            combined_text: {
                type: SchemaFieldTypes.TEXT,
            },
            content_vector: {
                type: SchemaFieldTypes.VECTOR,
                ALGORITHM: 'HNSW',
                TYPE: 'FLOAT32',
                DIM: config.VECTOR_DIMENSION || 384,
                DISTANCE_METRIC: 'COSINE'
            }
        }, {
            ON: 'HASH',
            PREFIX: DOC_PREFIX
        });

        console.log(`Created index: ${MEDICINE_INDEX}`);
    } catch (err) {
        console.error('Error setting up index:', err);
        throw err;
    }
}

async function processData() {
    let client;
    try {
        // Check if the data file exists
        const csvFilePath = path.resolve(process.cwd(), 'fixtures', 'dataset_files', 'medicine_details_11k.csv');
        if (!fs.existsSync(csvFilePath)) {
            console.error(`Error: Medicine dataset not found at ${csvFilePath}`);
            process.exit(1);
        }

        // Connect to Redis
        console.log('Connecting to Redis...');
        client = await getClient();
        console.log('Connected to Redis successfully');

        // Create index
        await createIndex(client);

        // Load data
        console.log(`Loading data from ${csvFilePath}...`);

        // Elabora il CSV in un array completo
        const jsonArray = await csv().fromFile(csvFilePath);
        console.log(`Loaded ${jsonArray.length} records from CSV`);

        // Numero totale di record da processare
        const recordsToProcess = jsonArray;
        const totalCount = recordsToProcess.length;
        console.log(`Processing ${totalCount} records in batches of ${BATCH_SIZE}...`);

        let count = 0;
        const startTime = Date.now();

        // Processo batch per batch
        for (let i = 0; i < recordsToProcess.length; i += BATCH_SIZE) {
            const batchStartTime = Date.now();
            const batch = recordsToProcess.slice(i, i + BATCH_SIZE);

            // Prepara testi e crea un array di promesse per le pipeline
            const combinedTexts = batch.map(record => {
                // Forma semplificata del combinedText - enfatizziamo solo gli usi
                return `Name: ${record['Medicine Name'] || 'N/A'}. ` +
                    `Composition: ${record.Composition || 'N/A'}. ` +
                    `Uses: ${record.Uses || 'N/A'}. ${record.Uses || 'N/A'}. ` + // Duplicato per enfasi
                    `Side Effects: ${record.Side_effects || 'N/A'}. ` +
                    `Manufacturer: ${record.Manufacturer || 'N/A'}.`;
            });

            try {
                // Genera gli embedding in un singolo batch
                console.log(`Generating embeddings for batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(totalCount/BATCH_SIZE)}...`);
                const embeddings = await createEmbedding(combinedTexts);

                // Crea pipeline Redis per inserimento in batch
                let pipeline = client.multi();

                for (let idx = 0; idx < batch.length; idx++) {
                    const docId = `${DOC_PREFIX}${i + idx}`;
                    const record = batch[idx];
                    const combinedText = combinedTexts[idx];
                    const embedding = embeddings[idx];

                    // Converti l'embedding in un buffer per Redis
                    const vectorBuffer = Buffer.from(new Float32Array(embedding).buffer);

                    // Aggiungi alla pipeline
                    pipeline.hSet(docId, {
                        name: record['Medicine Name'] || '',
                        composition: record.Composition || '',
                        uses: record.Uses || '',
                        side_effects: record.Side_effects || '',
                        manufacturer: record.Manufacturer || '',
                        combined_text: combinedText,
                        content_vector: vectorBuffer
                    });
                }

                // Esegui la pipeline come operazione atomica
                await pipeline.exec();
                count += batch.length;

                const batchTime = Date.now() - batchStartTime;
                const recordsPerSecond = Math.round((batch.length / batchTime) * 1000);
                const progress = Math.round((count / totalCount) * 100);
                const timeLeft = Math.round(((totalCount - count) / recordsPerSecond));

                console.log(`Batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(totalCount/BATCH_SIZE)} complete. ` +
                    `Progress: ${progress}% (${count}/${totalCount}). ` +
                    `Speed: ${recordsPerSecond} records/sec. ` +
                    `Est. time left: ${timeLeft} seconds.`);

            } catch (error) {
                console.error(`Error processing batch ${Math.floor(i/BATCH_SIZE) + 1}:`, error);
                console.log('Continuing with next batch...');
            }
        }

        const totalTime = (Date.now() - startTime) / 1000;
        console.log(`Successfully processed and stored ${count} records in ${totalTime} seconds (${Math.round(count/totalTime)} records/sec)`);

        // Verifica dati
        console.log('Verifying data was stored correctly...');
        const info = await client.ft.info(MEDICINE_INDEX);
        console.log(`Index now has ${info.numDocs} documents`);

        // Esempio di ricerca
        if (info.numDocs > 0) {
            const results = await client.ft.search(
                MEDICINE_INDEX,
                '*',
                { LIMIT: { from: 0, size: 5 }, RETURN: ['name'] }
            );
            console.log(`Search test returned ${results.total} results`);
            if (results.total > 0) {
                console.log('Sample document names:');
                results.documents.forEach(doc => console.log(` - ${doc.value.name}`));
            }
        }

        // Chiudi connessione
        if (client) {
            await client.quit();
            console.log('Disconnected from Redis');
        }
        console.log('Data loading complete');
    } catch (err) {
        console.error('Error processing data:', err);
        if (client) {
            await client.quit().catch(console.error);
        }
        process.exit(1);
    }
}

// Avvia il processo
console.log('Starting data loading process...');
processData();