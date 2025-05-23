"use strict";

const path = require('path');
const process = require('process');
const { getClient } = require(path.resolve(process.cwd(), 'drivers', 'redis'));
const { createEmbedding } = require(path.resolve(process.cwd(), 'drivers', 'localEmbeddings'));

// Constants
const CHAT_HISTORY_PREFIX = 'chat:history:'; // Prefix for individual exchanges
const CHAT_HISTORY_LIST = 'chat:history:list'; // Ordered list of exchange IDs

/**
 * Store a conversation exchange with vector embeddings
 * @param {string} prompt User's prompt
 * @param {string} response AI's response
 * @returns {Promise<string>} ID of the stored exchange
 */
module.exports = async function (prompt, response) {
    try {
        const client = await getClient();

        // Generate unique ID for this exchange
        const timestamp = Date.now();
        const exchangeId = `${CHAT_HISTORY_PREFIX}${timestamp}`;

        // Remove any previous conversation history from the prompt
        // This regex identifies the history section added by enhancePromptWithHistory
        const cleanPrompt = prompt.replace(/\n\nHere is our previous conversation that might be relevant:\n\n[\s\S]*?Current query: (.*)/i, "$1");

        // Create embedding for similarity search later
        const promptEmbedding = await createEmbedding(cleanPrompt);
        const vectorBuffer = Buffer.from(new Float32Array(promptEmbedding).buffer);

        // Create a combined text for potential text search
        const combinedText = `User: ${cleanPrompt}\nAI: ${response}`;

        // Store the exchange in Redis
        await client.hSet(exchangeId, {
            prompt: cleanPrompt, // Store only the clean prompt
            response: response,
            timestamp: timestamp.toString(),
            combined_text: combinedText,
            prompt_vector: vectorBuffer
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