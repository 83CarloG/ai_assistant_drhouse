"use strict";

const path = require('path');
const { getClient } = require(path.resolve(process.cwd(), 'drivers', 'redis'));
const { createEmbedding } = require(path.resolve(process.cwd(), 'drivers', 'localEmbeddings'));

// Constants
const MEDICINE_INDEX = 'medicine_idx';
const MAX_RESULTS = 5;

/**
 * Search for relevant medicine information based on a query
 *
 * @param {string} query - The search query
 * @param {number} limit - Maximum number of results to return (default: 5)
 * @returns {Promise<Array>} - Array of matching documents
 */
async function searchMedicineData(query, limit = MAX_RESULTS) {
    try {
        const client = await getClient();

        // Get vector embedding for the query
        const queryEmbedding = await createEmbedding(query);

        // Convert embedding to Buffer if it's not in the right format
        // Redis expects the vector to be a Buffer or a properly formatted array
        const vectorBuffer = Buffer.from(new Float32Array(queryEmbedding).buffer);

        // Perform vector search
        const results = await client.ft.search(
            MEDICINE_INDEX,
            `*=>[KNN ${limit} @content_vector $query_vector AS score]`,
            {
                PARAMS: {
                    query_vector: vectorBuffer
                },
                RETURN: ['name', 'composition', 'uses', 'side_effects', 'manufacturer','combined_text', 'score'],
                SORTBY: 'score',
                DIALECT: 2
            }
        );

        // Format results for easier consumption
        const formattedResults = results.documents.map(doc => ({
            id: doc.id,
            score: doc.value.score,
            data: {
                name: doc.value.name,
                composition: doc.value.composition,
                uses: doc.value.uses,
                side_effects: doc.value.side_effects,
                manufacturer: doc.value.manufacturer,
                combined_text: doc.value.combined_text
            }
        }));

        return formattedResults;
    } catch (error) {
        console.error('Error in vector search:', error);
        throw error;
    }
}

/**
 * Filter medicine data based on specific field criteria
 *
 * @param {Object} filters - Object containing field filters
 * @param {number} limit - Maximum number of results to return
 * @returns {Promise<Array>} - Array of matching documents
 */
async function filterMedicineData(filters, limit = MAX_RESULTS) {
    try {
        const client = await getClient();

        // Construct filter query
        let query = [];

        if (filters.name) query.push(`@name:(${filters.name})`);
        if (filters.manufacturer) query.push(`@manufacturer:{${filters.manufacturer}}`);

        // Add numeric ranges if provided
        if (filters.min_excellent_review)
            query.push(`@excellent_review:[${filters.min_excellent_review} +inf]`);
        if (filters.max_poor_review)
            query.push(`@poor_review:[0 ${filters.max_poor_review}]`);

        // If no filters provided, return all documents
        const queryString = query.length > 0 ? query.join(' ') : '*';

        // Execute search
        const results = await client.ft.search(
            MEDICINE_INDEX,
            queryString,
            {
                LIMIT: {
                    from: 0,
                    size: limit
                },
                RETURN: ['name', 'composition', 'uses', 'side_effects', 'manufacturer', 'combined_text']
            }
        );

        // Format results
        const formattedResults = results.documents.map(doc => ({
            id: doc.id,
            data: {
                name: doc.value.name,
                composition: doc.value.composition,
                uses: doc.value.uses,
                side_effects: doc.value.side_effects,
                manufacturer: doc.value.manufacturer,
                combined_text: doc.value.combined_text
            }
        }));
        return formattedResults;
    } catch (error) {
        console.error('Error in filter search:', error);
        throw error;
    }
}

module.exports = {
    searchMedicineData,
    filterMedicineData
};