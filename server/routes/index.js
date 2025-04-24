"use strict";

const path = require("path");
const process = require("process");


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

                return reply.send('hi');
            });

        done();
    });

}