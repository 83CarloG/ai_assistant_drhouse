"use strict";

const path = require('path');
const { getClient } = require(path.resolve(process.cwd(), 'drivers', 'redis'));

// Constants
const CHAT_HISTORY_PREFIX = 'chat:history:'; // Prefix for individual exchanges
const CHAT_HISTORY_INDEX = 'chat_history_idx'; // Search index name

async function initializeChatHistoryIndex() {
    try {
        const client = await getClient();

        // Check if index already exists
        try {
            await client.ft.info(CHAT_HISTORY_INDEX);
            console.log(`Chat history index ${CHAT_HISTORY_INDEX} already exists`);
            return;
        } catch (err) {
            // Index doesn't exist, create it
            console.log(`Creating chat history index ${CHAT_HISTORY_INDEX}`);
        }

        // Create the index
        await client.ft.create(
            CHAT_HISTORY_INDEX,
            {
                prompt: {
                    type: 'TEXT'
                },
                response: {
                    type: 'TEXT'
                },
                timestamp: {
                    type: 'NUMERIC',
                    SORTABLE: true
                },
                combined_text: {
                    type: 'TEXT'
                },
                prompt_vector: {
                    type: 'VECTOR',
                    ALGORITHM: 'HNSW',
                    TYPE: 'FLOAT32',
                    DIM: 384,  // Must match your embedding dimension
                    DISTANCE_METRIC: 'COSINE'
                }
            },
            {
                ON: 'HASH',
                PREFIX: CHAT_HISTORY_PREFIX
            }
        );



        console.log(`Created chat history index ${CHAT_HISTORY_INDEX}`);

        await client.closeConnection()
    } catch (error) {
        console.error('Error initializing chat history index:', error);
        throw error;
    }
}

 initializeChatHistoryIndex()