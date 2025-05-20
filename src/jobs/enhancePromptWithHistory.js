"use strict";

const path = require("path");
const process = require("process");
const chatHistory = require(path.resolve(process.cwd(), "src", "operations", "chatHistory"));



module.exports = async function (prompt)  {
    try {
        // Get relevant history based on the current prompt
        const relevantHistory = await chatHistory.getRelevantHistory(prompt, 3);

        if (!relevantHistory || relevantHistory.length === 0) {
            return prompt;
        }

        // Format the history into context
        let historyContext = "\n\nHere is our previous conversation that might be relevant:\n\n";

        relevantHistory.forEach((exchange, index) => {
            // Format timestamp to readable date
            const date = new Date(exchange.timestamp);
            const formattedDate = date.toLocaleString();

            historyContext += `[${formattedDate}]\n`;
            historyContext += `User: ${exchange.prompt}\n`;
            historyContext += `You (Dr. House): ${exchange.response}\n\n`;
        });

        // Add a clear marker before the current prompt
        historyContext += `Current query: ${prompt}`;
        return historyContext;
    } catch (error) {
        console.error('Error enhancing prompt with history:', error);
        // If anything fails, return the original prompt
        return prompt;
    }
}