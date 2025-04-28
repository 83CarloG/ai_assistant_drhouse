"use strict";

const path = require("path");
const config = require(path.resolve(process.cwd(), "config"));
const axios = require("axios");

axios.defaults.baseURL = config.MISTRAL_APPLICATION_URL;
axios.defaults.headers.common["Authorization"] = "Bearer " + config.MISTRAL_API_KEY;

module.exports = axios;