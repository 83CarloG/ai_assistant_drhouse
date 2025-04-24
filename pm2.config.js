"use strict";

const path = require("path");
const process = require("process");
const config = require(path.resolve(process.cwd(), "config"));

module.exports = {
    "apps": [
        {
            "name": `${config.APP_NAME}_server`,
            "script": "./index.js",
            "error_file": path.resolve(__dirname, "logs", "pm2", `${config.APP_NAME}_server.error.log`),
            "namespace": config.APP_NAME,
            "env": {
                "NODE_ENV": "production"
            }
        }

    ]
};