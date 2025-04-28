"use strict";

const path = require('path');
const fs = require('fs');
const csv = require('csvtojson');
const { SchemaFieldTypes } = require('@redis/search');
const config = require(path.resolve(process.cwd(), "config"));

// Import dependencies
const localEmbeddingsPath = path.resolve(process.cwd(), 'drivers', 'localEmbeddings.js');
if (!fs.existsSync(localEmbeddingsPath)) {
    console.error(`Error: Embeddings driver not found at ${localEmbeddingsPath}`);
    process.exit(1);
}
const { createEmbedding } = require(localEmbeddingsPath);

const redisClientPath = path.resolve(process.cwd(), 'drivers', 'redis.js');
if (!fs.existsSync(redisClientPath)) {
    console.error(`Error: Redis driver not found at ${redisClientPath}`);
    process.exit(1);
}
const { getClient } = require(redisClientPath);

// Constants
const MEDICINE_INDEX = 'medicine_idx';
const DOC_PREFIX = 'medicine:';

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

        // Create vector index
        try {
            await client.ft.create(MEDICINE_INDEX, {
                name: {
                    type: SchemaFieldTypes.TEXT,
                    sortable: true
                },
                category: {
                    type: SchemaFieldTypes.TAG,
                    sortable: true
                },
                dosage_form: {
                    type: SchemaFieldTypes.TAG,
                },
                strength: {
                    type: SchemaFieldTypes.TEXT,
                },
                manufacturer: {
                    type: SchemaFieldTypes.TAG,
                },
                indication: {
                    type: SchemaFieldTypes.TEXT,
                },
                classification: {
                    type: SchemaFieldTypes.TAG,
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
            console.error('Error creating index:', err);
            throw err;
        }
    } catch (err) {
        console.error('Error setting up index:', err);
        throw err;
    }
}

async function processData() {
    let client;
    try {
        // Check if the data file exists
        const csvFilePath = path.resolve(process.cwd(), 'fixtures', 'dataset_files', 'medicine_dataset_50k.csv');
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
        const jsonArray = await csv().fromFile(csvFilePath);

        console.log(`Loaded ${jsonArray.length} records from CSV`);
        console.log('Processing and storing records...');

        // Process in smaller batches for local embedding
        const BATCH_SIZE = 5;
        let count = 0;

        // Process a subset for testing
        const recordsToProcess = jsonArray.slice(0, 10);
        console.log(`Processing ${recordsToProcess.length} records...`);

        for (let i = 0; i < recordsToProcess.length; i += BATCH_SIZE) {
            const batch = recordsToProcess.slice(i, i + BATCH_SIZE);

            // Create combined texts for each record in the batch
            const combinedTexts = batch.map(record =>
                `Name: ${record.Name}. Category: ${record.Category}. Dosage Form: ${record['Dosage Form'] || 'N/A'}. Strength: ${record.Strength || 'N/A'}. Manufacturer: ${record.Manufacturer || 'N/A'}. Indication: ${record.Indication || 'N/A'}. Classification: ${record.Classification || 'N/A'}.`
            );

            try {
                // Generate embeddings in batch
                console.log(`Generating embeddings for batch ${Math.floor(i/BATCH_SIZE) + 1}...`);
                const embeddings = await createEmbedding(combinedTexts);
                console.log(`Successfully generated ${embeddings.length} embeddings`);

                // Store each record with its embedding
                console.log(`Storing batch ${Math.floor(i/BATCH_SIZE) + 1} in Redis...`);
                for (let idx = 0; idx < batch.length; idx++) {
                    const docId = `${DOC_PREFIX}${i + idx}`;
                    const record = batch[idx];
                    const combinedText = combinedTexts[idx];
                    const embedding = embeddings[idx];

                    try {
                        // IMPORTANT: Use HSET instead of JSON.SET since the index is defined for HASH types
                        // Convert embedding to a buffer for Redis storage
                        const vectorBuffer = Buffer.from(new Float32Array(embedding).buffer);

                        await client.hSet(docId, {
                            name: record.Name || '',
                            category: record.Category || '',
                            dosage_form: record['Dosage Form'] || '',
                            strength: record.Strength || '',
                            manufacturer: record.Manufacturer || '',
                            indication: record.Indication || '',
                            classification: record.Classification || '',
                            combined_text: combinedText,
                            content_vector: vectorBuffer
                        });

                        count++;
                        console.log(`Stored document ${docId}`);
                    } catch (docError) {
                        console.error(`Error storing document ${docId}:`, docError);
                    }
                }

                console.log(`Processed ${count} records so far...`);
            } catch (error) {
                console.error(`Error processing batch ${Math.floor(i/BATCH_SIZE) + 1}:`, error);
                console.log('Continuing with next batch...');
            }

            // Add a small delay between batches
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        console.log(`Successfully processed and stored ${count} records`);

        // Verify data was stored correctly
        console.log('Verifying data was stored correctly...');
        const info = await client.ft.info(MEDICINE_INDEX);
        console.log(`Index now has ${info.numDocs} documents`);

        if (info.numDocs > 0) {
            // Try a simple search to verify
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

        // Close connection
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

// Run the function
console.log('Starting data loading process...');
processData();