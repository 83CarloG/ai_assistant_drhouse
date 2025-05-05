"use stritct";

const path = require("path");
const process = require("process");
const  searchMedicineDataJob = require(path.resolve(process.cwd(), "src", "jobs", "vectorSearch"));

/**
 * Extracts relevant context for a medical query from the vector database
 *
 * @param {string} prompt - User prompt
 * @returns {string} - Relevant medical context
 */

module.exports = async function (prompt) {
    try {
        // Search for relevant medical information
        const searchResults = await searchMedicineDataJob(prompt, 3);

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
