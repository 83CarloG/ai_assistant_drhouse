// drivers/elevenlabsNative.js
"use strict";

const https = require('https');
const path = require('path');
const fs = require('fs'); // Regular fs module
const fsPromises = fs.promises; // Promises API
const url = require('url');
const config = require(path.resolve(process.cwd(), "config"));

// Create temp directory
const audioDir = path.resolve(process.cwd(), "temp_audio");
fsPromises.mkdir(audioDir, { recursive: true }).catch(err => {
    console.error("Failed to create temp audio directory:", err);
});

/**
 * Make a request to ElevenLabs API using native Node.js https
 * No shared headers, no axios, completely isolated
 */
function makeElevenLabsRequest(options, postData = null) {
    return new Promise((resolve, reject) => {
        console.log(`Making request to: ${options.hostname}${options.path}`);

        const req = https.request(options, (res) => {
            const chunks = [];

            res.on('data', (chunk) => chunks.push(chunk));

            res.on('end', () => {
                const body = Buffer.concat(chunks);

                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        body
                    });
                } else {
                    // Try to parse error response
                    try {
                        const errorText = body.toString('utf8');
                        console.error(`ElevenLabs API Error (${res.statusCode}):`, errorText);
                        reject(new Error(`API Error: ${errorText}`));
                    } catch (e) {
                        reject(new Error(`API Error: Status ${res.statusCode}`));
                    }
                }
            });
        });

        req.on('error', (error) => {
            console.error(`ElevenLabs Request Error:`, error);
            reject(error);
        });

        if (postData) {
            req.write(postData);
        }

        req.end();
    });
}

/**
 * Convert text to speech using ElevenLabs
 */
async function textToSpeech(text) {
    console.log(config)

    try {
        console.log("Starting TTS with text:", text.substring(0, 50) + "...");

        if (!fs.existsSync(audioDir)) {
            await fsPromises.mkdir(audioDir, { recursive: true });
        }
        const voiceId = config.ELEVENLABS_VOICE_ID;
        const apiKey = config.ELEVENLABS_API_KEY;

        console.log(`Using voice ID: ${voiceId}`);

        const postData = JSON.stringify({
            text: text,
            model_id: "eleven_multilingual_v2",
            voice_settings: {
                stability: 0.5,
                similarity_boost: 0.75
            }
        });

        const options = {
            hostname: 'api.elevenlabs.io',
            port: 443,
            path: `/v1/text-to-speech/${voiceId}`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'xi-api-key': apiKey,
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const response = await makeElevenLabsRequest(options, postData);

        console.log("TTS request successful, received bytes:", response.body.length);

        // Store audio file temporarily
        const timestamp = Date.now();
        const audioPath = path.join(audioDir, `speech_${timestamp}.mp3`);

        await fsPromises.writeFile(audioPath, response.body);
        console.log(`Audio saved to ${audioPath}`);

        return {
            buffer: response.body,
            path: audioPath,
            fileName: path.basename(audioPath)
        };
    } catch (error) {
        console.error("ElevenLabs TTS Error:", error);
        throw error;
    }
}

/**
 * Get available voices from ElevenLabs
 */
async function getVoices() {
    try {
        console.log("Fetching available voices from ElevenLabs");

        const apiKey = config.ELEVENLABS_API_KEY;

        const options = {
            hostname: 'api.elevenlabs.io',
            port: 443,
            path: '/v1/voices',
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'xi-api-key': apiKey
            }
        };

        const response = await makeElevenLabsRequest(options);

        // Parse the JSON response
        const jsonResponse = JSON.parse(response.body.toString());

        console.log(`Found ${jsonResponse.voices.length} voices`);
        return jsonResponse.voices;
    } catch (error) {
        console.error("ElevenLabs Get Voices Error:", error.message);
        throw error;
    }
}

module.exports = {
    textToSpeech,
    getVoices
};