"use strict";

const path = require('path');
const process = require('process');
const { getClient } = require(path.resolve(process.cwd(), 'drivers', 'redis'));

// Constants
const CHAT_HISTORY_LIST = 'chat:history:list'; // Ordered list of exchange IDs



/**
 * Retrieve the most recent chat exchanges
 * @param {number} limit Number of recent exchanges to retrieve
 * @returns {Promise<Array>} Array of exchange objects
 */
module.exports = async function (limit = 10) {
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
                    timestamp: parseInt(data.timestamp),

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

