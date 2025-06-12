"use strict";

const path = require("path");
const process = require("process");
const https = require('https');
const http = require('http');
const { URL } = require('url');

const config = require(path.resolve(process.cwd(), "config"));

/**
 * Make a request to Ollama API using native Node.js http/https
 * @param {string} endpoint - API endpoint (e.g., '/api/generate')
 * @param {Object} data - Request payload
 * @param {number} timeout - Request timeout in milliseconds
 * @returns {Promise<string>} - Complete response text
 */
function makeOllamaRequest(endpoint, data, timeout = 10000) {
    return new Promise((resolve, reject) => {
        const ollamaUrl = new URL(endpoint, config.OLLAMA_URL);
        const postData = JSON.stringify(data);

        const options = {
            hostname: ollamaUrl.hostname,
            port: ollamaUrl.port,
            path: ollamaUrl.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            },
            timeout: timeout
        };

        // Choose http or https based on protocol
        const httpModule = ollamaUrl.protocol === 'https:' ? https : http;

        const req = httpModule.request(options, (res) => {
            let responseText = '';

            res.on('data', (chunk) => {
                // Ollama streams JSON responses, each line is a separate JSON object
                const lines = chunk.toString().split('\n').filter(line => line.trim());

                for (const line of lines) {
                    try {
                        const parsed = JSON.parse(line);
                        if (parsed.response) {
                            responseText += parsed.response;
                        }

                        // If done is true, we've received the complete response
                        if (parsed.done) {
                            resolve(responseText.trim());
                            return;
                        }
                    } catch (e) {
                        // Skip malformed JSON lines
                        continue;
                    }
                }
            });

            res.on('end', () => {
                // In case we reach end without getting done:true
                if (responseText) {
                    resolve(responseText.trim());
                } else {
                    reject(new Error('No response received from Ollama'));
                }
            });
        });

        req.on('error', (error) => {
            reject(new Error(`Ollama request error: ${error.message}`));
        });

        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Ollama request timeout'));
        });

        req.write(postData);
        req.end();
    });
}

/**
 * Translate text using Ollama
 * @param {string} text - Text to translate from Italian to English
 * @returns {Promise<string>} - Translated text
 */
async function translateText(text) {
    try {
        const prompt = `Translate this Italian text to English. Only return the translation, nothing else: ${text}`;

        const requestData = {
            model: config.OLLAMA_MODEL || 'gemma3:1b',
            prompt: prompt,
            stream: false // We handle streaming manually
        };

        const response = await makeOllamaRequest('/api/generate', requestData, config.OLLAMA_TIMEOUT || 10000);
        return response;
    } catch (error) {
        throw new Error(`Ollama translation failed: ${error.message}`);
    }
}

/**
 * Check if Ollama is available
 * @returns {Promise<boolean>} - True if Ollama is responding
 */
async function isAvailable() {
    try {
        const response = await makeOllamaRequest('/api/generate', {
            model: config.OLLAMA_MODEL || 'gemma3:1b',
            prompt: 'test',
            stream: false
        }, 3000); // Shorter timeout for availability check

        return true;
    } catch (error) {
        return false;
    }
}

module.exports = {
    translateText,
    isAvailable
};