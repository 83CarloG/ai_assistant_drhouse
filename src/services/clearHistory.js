"use strict";

"use strict";

const path = require('path');
const { getClient } = require(path.resolve(process.cwd(), 'drivers', 'redis'));


// Constants
const CHAT_HISTORY_LIST = 'chat:history:list'; // Ordered list of exchange IDs

async function clearHistory() {
    try {
        const client = await getClient();

        // Get all exchange IDs
        const exchangeIds = await client.lRange(CHAT_HISTORY_LIST, 0, -1);

        if (exchangeIds && exchangeIds.length > 0) {
            // Delete all exchanges
            await Promise.all(exchangeIds.map(id => client.del(id)));
        }

        // Delete the list
        await client.del(CHAT_HISTORY_LIST);

        console.log('Chat history cleared');
    } catch (error) {
        console.error('Error clearing chat history:', error);
        throw error;
    }
}

clearHistory();