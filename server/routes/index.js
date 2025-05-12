"use strict";

const path = require("path");
const process = require("process");
const getResponseFromAiService = require(path.resolve(process.cwd(), "src", "services", "getResponseFromAi"));

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

        done();
    });
}