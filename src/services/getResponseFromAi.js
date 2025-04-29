"use strict";

const path = require("path");
const process = require("process");
const { readFile } = require("fs/promises");

const httpDriver = require(path.resolve(process.cwd(), "drivers", "http"));
const { searchMedicineData } = require(path.resolve(process.cwd(), "src", "job", "vectorSearch"));
const chatHistory = require(path.resolve(process.cwd(), "src", "services", "chatHistory"));
const DEFAULT_MODEL = "mistral-large-latest";

/**
 * Analyzes a prompt to determine if it's medical-related
 *
 * @param {string} prompt - User prompt
 * @returns {boolean} - True if medical-related
 */
function isMedicalQuery(prompt) {
    const medicalKeywords = [
        'medicine', 'drug', 'medication', 'dosage', 'symptom', 'diagnosis', 'treatment',
        'disease', 'illness', 'condition', 'prescription', 'side effect', 'interact',
        'pill', 'tablet', 'capsule', 'injection', 'dose', 'therapy', 'medicate'
    ];

    const lowercasePrompt = prompt.toLowerCase();
    return medicalKeywords.some(keyword => lowercasePrompt.includes(keyword));
}

/**
 * Extracts relevant context for a medical query from the vector database
 *
 * @param {string} prompt - User prompt
 * @returns {string} - Relevant medical context
 */
async function retrieveMedicalContext(prompt) {
    try {
        // Search for relevant medical information
        const searchResults = await searchMedicineData(prompt, 3);

        if (searchResults.length === 0) {
            return "";
        }

        // Format results into a context string
        let context = "Here is relevant information from my medical database:\n\n";

        searchResults.forEach((result, idx) => {
            context += `[Item ${idx + 1}]\n`;
            context += `Medicine: ${result.data.name}\n`;
            context += `Composition: ${result.data.composition}\n`;
            context += `Uses: ${result.data.uses}\n`;
            context += `Side Effects: ${result.data.side_effects}\n`;
            context += `Manufacturer: ${result.data.manufacturer}\n`;
        });

        context += "Use this information if relevant to answer the query.\n";
        return context;
    } catch (error) {
        console.error("Error retrieving medical context:", error);
        return "";
    }
}

/**
 * Enhance the prompt with relevant conversation history
 * @param {string} prompt User prompt
 * @returns {Promise<string>} Enhanced prompt with history
 */
async function enhancePromptWithHistory(prompt) {
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

        // Combine with the current prompt
        historyContext += `Current query: ${prompt}`;
        return historyContext;
    } catch (error) {
        console.error('Error enhancing prompt with history:', error);
        // If anything fails, return the original prompt
        return prompt;
    }
}

module.exports = async function (prompt, userSelectedModel = DEFAULT_MODEL, customSystemInstruction = "") {
    try {
        const url = "/chat/completions";

        // Read the Dr. House system instruction
        const baseSystemInstruction = await readFile(
            path.resolve(process.cwd(), "fixtures", "dataset_files", "system_instruction.txt"),
            {encoding: "utf-8"}
        );

        let finalSystemInstruction = baseSystemInstruction;

        // Add instruction about using conversation history
        finalSystemInstruction += "\n\n## Using Conversation History\nI may include relevant parts of our previous conversation. Use this context to provide more personalized and consistent responses. Refer to past exchanges when appropriate, but focus on addressing the current query directly.";

        // Check if the query is medical-related and enhance with context if it is
        if (isMedicalQuery(prompt)) {
            const medicalContext = await retrieveMedicalContext(prompt);

            if (medicalContext) {
                // Add medical context to the instruction
                finalSystemInstruction += "\n\n## Relevant Medical Database Information\n" + medicalContext;
            }
        }

        // If custom system instruction was provided, override with it
        if (customSystemInstruction) {
            finalSystemInstruction = customSystemInstruction;
        }

        // Enhance prompt with relevant conversation history
        const enhancedPrompt = await enhancePromptWithHistory(prompt);

        console.log("system prompt:", finalSystemInstruction);
        console.log("user prompt:", enhancedPrompt);

        const response = await httpDriver.post(url, {
            model: userSelectedModel,
            messages: [
                {"role": "system", "content": finalSystemInstruction},
                {"role": "user", "content": enhancedPrompt},
            ],
            temperature: 0.2 // Slightly more deterministic for medical information
        });

        // Store the exchange in history
        await chatHistory.storeExchange(prompt, response.data.choices[0].message.content);

        return {
            data: response.data.choices[0].message.content,
            status: response.status
        };
    } catch (error) {
        console.error("Error in AI response:", error.message);
        return error.response || {
            data: "I'm sorry, I'm having trouble accessing my medical database right now.",
            status: 500
        };
    }
};