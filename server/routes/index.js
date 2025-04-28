"use strict";

const path = require("path");
const process = require("process");
const getResponseFromAiService = require(path.resolve(process.cwd(), "src", "services", "getResponseFromAi"));

module.exports = async function (fastify, openapi) {

    const getQuerySchema = await openapi.fastifySchemaFactory("/prompt-simple", "post", "application/json");

    fastify.register(function (instance, opts, done) {

        instance.post("/prompt-simple", {
                schema: {
                    headers: getQuerySchema.headers,
                    body: getQuerySchema.body
                }
            },
            async (request, reply) => {
                const {prompt} = request.body;
                const aiResponse = await getResponseFromAiService(prompt);
                return reply.send(aiResponse);

            });

        done();
    });

}