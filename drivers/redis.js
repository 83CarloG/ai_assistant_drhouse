"use strict";

const path = require('path');
const { createClient } = require('redis');
const config = require(path.resolve(process.cwd(), "config"));
const REDIS_URL = "redis://localhost:6379"

// Client instance
let client = null;

/**
 * Get a Redis client instance
 * @returns {Promise<import('redis').RedisClientType>}
 */
async function getClient() {
    if (!client) {
        // Create a new client
        console.log(`Connecting to Redis at ${REDIS_URL}...`);

        try {
            client = createClient({
                url: REDIS_URL,
                socket: {
                    connectTimeout: 10000, // 10 seconds
                    reconnectStrategy: (retries) => {
                        // Reconnect after retries * 100ms (max 10 seconds)
                        return Math.min(retries * 100, 10000);
                    }
                }
            });

            // Event handlers
            client.on('error', (err) => {
                console.error('Redis Client Error:', err);
            });

            client.on('connect', () => {
                console.log('Redis client connected');
            });

            client.on('ready', () => {
                console.log('Redis client ready');
            });

            client.on('reconnecting', () => {
                console.log('Redis client reconnecting...');
            });

            client.on('end', () => {
                console.log('Redis client connection closed');
                client = null;
            });

            // Connect
            await client.connect();

            // Test if Redis Stack modules are loaded
            try {
                await client.sendCommand(['MODULE', 'LIST']);
                console.log('Redis modules loaded successfully');
            } catch (moduleErr) {
                console.error('Error checking Redis modules:', moduleErr);
            }
        } catch (err) {
            console.error('Failed to connect to Redis:', err);
            throw err;
        }
    }

    return client;
}

/**
 * Close the Redis connection
 */
async function closeConnection() {
    if (client) {
        try {
            await client.quit();
            client = null;
            console.log('Redis connection closed');
        } catch (err) {
            console.error('Error closing Redis connection:', err);
            throw err;
        }
    }
}

module.exports = {
    getClient,
    closeConnection
};