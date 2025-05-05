"use strict";

const path = require('path');
const process = require('process');
const { getClient } = require(path.resolve(process.cwd(), 'drivers', 'redis'));
const { createEmbedding } = require(path.resolve(process.cwd(), 'drivers', 'localEmbeddings'));

// Constants
const CHAT_HISTORY_INDEX = 'chat_history_idx'; // Search index name

/**
 * Find past exchanges relevant to the current query using vector similarity
 * @param {string} currentQuery Current user query
 * @param {number} limit Maximum number of relevant exchanges to return
 * @returns {Promise<Array>} Array of relevant exchange objects
 */
module.exports = async function (currentQuery, limit = 5) {
    try {
        const client = await getClient();

        // Generate embedding for the current query
        const queryEmbedding = await createEmbedding(currentQuery);
        const vectorBuffer = Buffer.from(new Float32Array(queryEmbedding).buffer);

        // Perform vector search using the index
        const results = await client.ft.search(
            CHAT_HISTORY_INDEX,
            '*=>[KNN $K @prompt_vector $QUERY_VECTOR AS score]',
            {
                PARAMS: {
                    QUERY_VECTOR: vectorBuffer,
                    K: limit
                },
                RETURN: ['prompt', 'response', 'timestamp', 'score'],
                SORTBY: 'score',
                DIALECT: 2
            }
        );

        // Format results
        const relevantExchanges = results.documents.map(doc => ({
            id: doc.id,
            prompt: doc.value.prompt,
            response: doc.value.response,
            timestamp: parseInt(doc.value.timestamp)
        }));

        return relevantExchanges;
    } catch (error) {
        console.error('Error finding relevant history:', error);
        // If search fails (e.g., index not created yet), fall back to recent history
        console.log('Falling back to recent history');
        // TODO: Implement a fallback to recent history
        //return getRecentHistory(limit);
    }
}