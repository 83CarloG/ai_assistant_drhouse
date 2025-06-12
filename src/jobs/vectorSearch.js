"use strict";

const path = require('path');
const { getClient } = require(path.resolve(process.cwd(), 'drivers', 'redis'));
const { createEmbedding } = require(path.resolve(process.cwd(), 'drivers', 'localEmbeddings'));

// Constants
const MEDICINE_INDEX = 'medicine_idx';
const MAX_RESULTS = 5;

/**
 * Search for relevant medicine information based on a query
 * @param {string} query - The search query
 * @param {number} limit - Maximum number of results to return
 * @returns {Promise<Array>} - Array of matching documents
 */
module.exports = async function (query, limit = MAX_RESULTS) {
    try {
        const client = await getClient();

        // Identifica i sintomi principali per migliorare la ricerca
        const symptoms = extractKeySymptoms(query);

        // Crea una query ibrida semplice ma efficace
        let searchQuery;

        if (symptoms.length > 0) {
            // Se abbiamo identificato sintomi, crea un filtro specifico
            const symptomsFilter = symptoms.map(s => `@uses:${s}`).join(' | ');
            searchQuery = `(${symptomsFilter}) => [KNN ${limit * 2} @content_vector $query_vector AS score]`;
            console.log(`Using hybrid search with filter: ${symptomsFilter}`);
        } else {
            // Altrimenti usa solo ricerca vettoriale
            searchQuery = `*=>[KNN ${limit * 2} @content_vector $query_vector AS score]`;
            console.log("Using pure vector search");
        }

        // Ottieni l'embedding per la query
        const queryEmbedding = await createEmbedding(query);
        const vectorBuffer = Buffer.from(new Float32Array(queryEmbedding).buffer);

        // Esegui la ricerca
        const results = await client.ft.search(
            MEDICINE_INDEX,
            searchQuery,
            {
                PARAMS: {
                    query_vector: vectorBuffer
                },
                RETURN: ['name', 'composition', 'uses', 'side_effects', 'manufacturer', 'combined_text', 'score'],
                SORTBY: 'score',
                DIALECT: 2
            }
        );

        console.log(`Found ${results.total} results with scores`);

        // Post-processing minimo per rilevare farmaci potenzialmente inappropriati
        const formattedResults = [];
        for (const doc of results.documents) {
            // Semplice validazione: controlla che la medicina menzioni effettivamente i sintomi
            const uses = doc.value.uses.toLowerCase();
            const isMostLikelyAppropriate = symptoms.some(symptom => uses.includes(symptom));

            // Filtra fuori casi sospetti come beta-bloccanti per mal di testa
            const isCardiacDrug = uses.includes('hypertension') || uses.includes('heart') ||
                uses.includes('blood pressure') || uses.includes('cardiac');
            const isForPainOnly = symptoms.every(s => ['headache', 'pain', 'ache'].includes(s));

            // Escludi farmaci cardiaci se la query è solo per dolore
            if (isCardiacDrug && isForPainOnly) {
                console.log(`Filtered out cardiac drug: ${doc.value.name}`);
                continue;
            }

            formattedResults.push({
                id: doc.id,
                score: doc.value.score,
                data: {
                    name: doc.value.name,
                    composition: doc.value.composition,
                    uses: doc.value.uses,
                    side_effects: doc.value.side_effects,
                    manufacturer: doc.value.manufacturer,
                    combined_text: doc.value.combined_text,
                    isAppropriate: isMostLikelyAppropriate
                }
            });
        }

        return formattedResults.slice(0, limit);
    } catch (error) {
        console.error('Error in vector search:', error);
        throw error;
    }
}

/**
 * Estrae i sintomi chiave dalla query
 * @param {string} query
 * @returns {string[]} Sintomi rilevanti
 */
function extractKeySymptoms(query) {
    const commonSymptoms = [
        'fever', 'cough', 'cold', 'flu', 'headache', 'pain', 'throat',
        'congestion', 'runny nose', 'nausea', 'vomiting', 'diarrhea',
        'infection', 'inflammation', 'allergic', 'allergy', 'ache',
        'joint', 'muscle'
    ];

    const queryLower = query.toLowerCase();
    return commonSymptoms.filter(symptom => queryLower.includes(symptom));
}