const path = require("path");
const fs = require('fs'); // Regular fs
const process = require("process");
const getResponseFromAiService = require(path.resolve(process.cwd(), "src", "services", "getResponseFromAi"));
const elevenLabsDriver = require(path.resolve(process.cwd(), "drivers", "elevenlabsNative"));

// Define audio directory
const audioDir = path.resolve(process.cwd(), "temp_audio");

// Create the directory if it doesn't exist
if (!fs.existsSync(audioDir)) {
    fs.mkdirSync(audioDir, { recursive: true });
}


module.exports = async function (fastify, openapi) {

    //Register static file serving
    fastify.register(require('@fastify/static'), {
        root: path.join(process.cwd(), 'server', 'public'),
        prefix: '/'
    });

    const getQuerySchema = await openapi.fastifySchemaFactory("/prompt-simple", "post", "application/json");

    fastify.register(function (instance, opts, done) {
        // Add error handling middleware
        instance.setErrorHandler(function (error, request, reply) {
            console.error('Route error:', error);
            reply.status(500).send({
                status: 'error',
                message: 'An internal server error occurred',
                data: null
            });
        });

        instance.register(require('@fastify/static'), {
            root: audioDir,
            prefix: '/temp_audio/',
            decorateReply: false // Important since we already have static files registered
        });

        instance.post("/prompt-simple", {
                schema: {
                    headers: getQuerySchema.headers,
                    body: getQuerySchema.body
                }
            },
            async (request, reply) => {
                console.log('Received prompt request:', {
                    prompt: request.body.prompt.substring(0, 30) + '...',
                    enableDrHouse: request.body.enableDrHouse,
                    ragEnabledHistoryChat: request.body.ragEnabledHistoryChat,
                    ragEnabledMedicalContext: request.body.ragEnabledMedicalContext
                });

                const { prompt, enableDrHouse = false, ragEnabledHistoryChat = false, ragEnabledMedicalContext = false, userSelectedModel } = request.body;

                try {
                    const aiResponse = await getResponseFromAiService(
                        prompt,
                        enableDrHouse,
                        ragEnabledHistoryChat,
                        ragEnabledMedicalContext,
                        userSelectedModel
                    );

                    console.log('AI response successful');
                    return reply.send(aiResponse);
                } catch (error) {
                    console.error('Error getting AI response:', error);
                    return reply.status(500).send({
                        status: 'error',
                        message: 'Failed to get response from AI service',
                        data: null
                    });
                }
            });

        instance.post("/speech/generate", async (request, reply) => {
            try {
                const { text } = request.body;

                if (!text) {
                    return reply.status(400).send({ error: "Text is required" });
                }

                const audioResult = await elevenLabsDriver.textToSpeech(text);

                // Set appropriate headers for audio data
                reply.header("Content-Type", "audio/mpeg");

                // Send the buffer directly
                return reply.send(audioResult.buffer);
            } catch (error) {
                console.error("Speech generation error:", error);
                return reply.status(500).send({ error: "Failed to generate speech" });
            }
        });

        instance.post("/speech/chat", async (request, reply) => {
            try {
                const { prompt } = request.body;

                if (!prompt) {
                    return reply.status(400).send({ error: "Prompt is required" });
                }

                // Use your existing AI service with Dr. House enabled
                const aiResponse = await getResponseFromAiService(
                    prompt,
                    true, // enableDrHouse
                    true, // ragEnabledHistoryChat
                    true  // ragEnabledMedicalContext
                );

                // Generate speech from the response
                const audioResult = await elevenLabsDriver.textToSpeech(aiResponse.data);

                // Get just the filename from the path
                const audioFilename = path.basename(audioResult.path);

                // Return both text and a valid URL to the audio file
                return reply.send({
                    text: aiResponse.data,
                    audio_url: `/temp_audio/${audioFilename}`
                });
            } catch (error) {
                console.error("Speech chat error:", error);
                return reply.status(500).send({ error: "Failed to process speech chat" });
            }
        });

        // Endpoint to list available voices (helpful for setup)
        instance.get("/speech/voices", async (request, reply) => {
            try {
                const voices = await elevenLabsDriver.getVoices();
                return reply.send({ voices });
            } catch (error) {
                console.error("Get voices error:", error);
                return reply.status(500).send({ error: "Failed to get voices" });
            }
        });

        done();
    });
}