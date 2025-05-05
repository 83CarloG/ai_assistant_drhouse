"use strict";

const path = require("path");
const process = require("process");

const storeExchangeHistoryJob = require(path.resolve(process.cwd(), "src", "jobs", "storeExchangeHistory"));
const getRecentHistoryJob = require(path.resolve(process.cwd(), "src", "jobs", "getRecentHistory"));
const getRelevantHistoryJob = require(path.resolve(process.cwd(), "src", "jobs", "getRelevantHistory"));

const chatHistory = {
    storeExchangeHistory: storeExchangeHistoryJob,
    getRecentHistory: getRecentHistoryJob,
    getRelevantHistory: getRelevantHistoryJob
}

module.exports = chatHistory;