"use strict";

const path = require('path');
const { getClient } = require(path.resolve(process.cwd(), 'drivers', 'redis'));
const { createEmbedding } = require(path.resolve(process.cwd(), 'drivers', 'localEmbeddings'));

// Constants
const CHAT_HISTORY_PREFIX = 'chat:history:'; // Prefix for individual exchanges
const CHAT_HISTORY_LIST = 'chat:history:list'; // Ordered list of exchange IDs
const CHAT_HISTORY_INDEX = 'chat_history_idx'; // Search index name

/**
 * Store a conversation exchange with vector embeddings
 * @param {string} prompt User's prompt
 * @param {string} response AI's response
 * @returns {Promise<string>} ID of the stored exchange
 */
async function storeExchange(prompt, response) {
    try {
        const client = await getClient();

        // Generate unique ID for this exchange
        const timestamp = Date.now();
        const exchangeId = `${CHAT_HISTORY_PREFIX}${timestamp}`;

        // Create embedding for similarity search later
        const promptEmbedding = await createEmbedding(prompt);
        const vectorBuffer = Buffer.from(new Float32Array(promptEmbedding).buffer);

        // Create a combined text for potential text search
        const combinedText = `User: ${prompt}\nAI: ${response}`;

        // Store the exchange in Redis
        await client.hSet(exchangeId, {
            prompt: prompt,
            response: response,
            timestamp: timestamp.toString(),
            combined_text: combinedText,
            prompt_vector: vectorBuffer  // For vector similarity search
        });

        // Add to the ordered list for chronological access
        await client.lPush(CHAT_HISTORY_LIST, exchangeId);

        console.log(`Stored chat exchange: ${exchangeId}`);
        return exchangeId;
    } catch (error) {
        console.error('Error storing chat exchange:', error);
        throw error;
    }
}

/**
 * Retrieve the most recent chat exchanges
 * @param {number} limit Number of recent exchanges to retrieve
 * @returns {Promise<Array>} Array of exchange objects
 */
async function getRecentHistory(limit = 10) {
    try {
        const client = await getClient();

        // Get the IDs of recent exchanges
        const exchangeIds = await client.lRange(CHAT_HISTORY_LIST, 0, limit - 1);

        if (!exchangeIds || exchangeIds.length === 0) {
            return [];
        }

        // Fetch all exchanges in parallel
        const exchanges = await Promise.all(
            exchangeIds.map(async (id) => {
                const data = await client.hGetAll(id);
                return {
                    id: id,
                    prompt: data.prompt,
                    response: data.response,
                    timestamp: parseInt(data.timestamp)
                };
            })
        );

        // Sort by timestamp (most recent first)
        exchanges.sort((a, b) => b.timestamp - a.timestamp);

        return exchanges;
    } catch (error) {
        console.error('Error retrieving recent history:', error);
        throw error;
    }
}

/**
 * Find past exchanges relevant to the current query using vector similarity
 * @param {string} currentQuery Current user query
 * @param {number} limit Maximum number of relevant exchanges to return
 * @returns {Promise<Array>} Array of relevant exchange objects
 */
async function getRelevantHistory(currentQuery, limit = 5) {
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
            timestamp: parseInt(doc.value.timestamp),
            relevanceScore: doc.value.score
        }));

        return relevantExchanges;
    } catch (error) {
        console.error('Error finding relevant history:', error);
        // If search fails (e.g., index not created yet), fall back to recent history
        console.log('Falling back to recent history');
        return getRecentHistory(limit);
    }
}


module.exports = {
    storeExchange,
    getRecentHistory,
    getRelevantHistory
};