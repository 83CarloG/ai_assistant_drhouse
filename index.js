"use strict";

const microserviceTemplate = require("microservice_node_template");
const path = require("path");
const config = require(path.resolve(process.cwd(), "config"));

microserviceTemplate.run({
    config,
    files_auto_loaded_by_the_template: [
        path.resolve(process.cwd(), "server", "routes", "index.js")
    ]
});