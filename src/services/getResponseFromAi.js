"use strict";

const path = require("path");
const process = require("process");
const { readFile } = require("fs/promises");

const httpDriver = require(path.resolve(process.cwd(), "drivers", "http"));
const { searchMedicineData } = require(path.resolve(process.cwd(), "src", "job", "vectorSearch"));
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

module.exports = async function (prompt, userSelectedModel = DEFAULT_MODEL, customSystemInstruction = "") {
    try {
        const url = "/chat/completions";

        // Read the Dr. House system instruction
        const baseSystemInstruction = await readFile(
            path.resolve(process.cwd(), "fixtures", "dataset_files", "system_instruction.txt"),
            {encoding: "utf-8"}
        );

        let finalSystemInstruction = baseSystemInstruction;

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

        console.log("Final System Instruction:", finalSystemInstruction);

        const response = await httpDriver.post(url, {
            model: userSelectedModel,
            messages: [
                {"role": "system", "content": finalSystemInstruction},
                {"role": "user", "content": prompt},
            ],
            temperature: 0.2 // Slightly more deterministic for medical information
        });

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