"use strict";

const path = require("path");
const process = require("process");
const config = require(path.resolve(process.cwd(), "config"));

module.exports = {
    "apps": [
        {
            "name": `dev:${config.APP_NAME}_server`,
            "script": "./index.js",
            "error_file": path.resolve(__dirname, "logs", "pm2", `dev_${config.APP_NAME}_server.error.log`),
            "namespace": config.APP_NAME,
            "watch": [
                "index.js",
                "server",
                "src",
                "../microservice_node_template/server"
            ],
            "ignore_watch": [
                "logs",
                "node_modules"
            ]
        },

    ]
};