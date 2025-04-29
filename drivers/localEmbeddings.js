"use strict";

const path = require('path');
const config = require(path.resolve(process.cwd(), "config"));

// Embedding model name
const MODEL_NAME = 'Xenova/all-MiniLM-L6-v2';

// Initialize the embedding pipeline (lazy-loaded)
let _embeddingPipeline = null;
async function getEmbeddingPipeline() {
    if (!_embeddingPipeline) {
        console.log('Loading embedding model...');
        // Use dynamic import for ESM compatibility
        const { pipeline } = await import('@xenova/transformers');
        _embeddingPipeline = await pipeline('feature-extraction', MODEL_NAME);
        console.log('Embedding model loaded successfully');
    }
    return _embeddingPipeline;
}

/**
 * Creates embeddings using local model
 *
 * @param {string|string[]} text - Single text or array of texts to embed
 * @returns {Promise<number[]|number[][]>} - Embedding vector(s)
 */
async function createEmbedding(text) {
    try {
        const pipe = await getEmbeddingPipeline();

        if (Array.isArray(text)) {
            // Process batch
            const results = [];
            for (const t of text) {
                const output = await pipe(t, { pooling: 'mean', normalize: true });
                results.push(Array.from(output.data));
            }
            return results;
        } else {
            // Process single text
            const output = await pipe(text, { pooling: 'mean', normalize: true });
            return Array.from(output.data);
        }
    } catch (error) {
        console.error('Error creating local embedding:', error);
        throw error;
    }
}

module.exports = {
    createEmbedding
};