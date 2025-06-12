"use strict"; // Correzione del typo "stritct"

const path = require("path");
const process = require("process");
const searchMedicineDataJob = require(path.resolve(process.cwd(), "src", "jobs", "vectorSearch"));

/**
 * Extracts relevant context for a medical query from the vector database
 *
 * @param {string} prompt - User prompt
 * @returns {string} - Relevant medical context
 */

module.exports = async function (prompt) {
    try {
        // Estrai i sintomi dalla query per il logging e il contesto
        const symptoms = extractKeySymptoms(prompt);
        if (symptoms.length > 0) {
            console.log(`Identified symptoms in query: ${symptoms.join(', ')}`);
        } else {
            console.log('No specific symptoms identified in query');
        }

        // Search for relevant medical information
        const searchResults = await searchMedicineDataJob(prompt, 3);

        if (searchResults.length === 0) {
            return "";
        }

        // Format results into a context string
        let context = "Here is relevant information from my medical database:\n\n";

        // Contatore per farmaci potenzialmente inappropriati
        let potentiallyInappropriateCount = 0;

        searchResults.forEach((result, idx) => {
            context += `[Item ${idx + 1}]\n`;
            context += `Score: ${result.score}\n`;

            context += `Medicine: ${result.data.name}\n`;
            context += `Composition: ${result.data.composition}\n`;
            context += `Uses: ${result.data.uses}\n`;
            context += `Side Effects: ${result.data.side_effects}\n`;
            context += `Manufacturer: ${result.data.manufacturer}\n`;

            // Aggiungi informazioni se il farmaco è appropriato per i sintomi identificati
            if (result.data.hasOwnProperty('isAppropriate')) {
                if (!result.data.isAppropriate) {
                    potentiallyInappropriateCount++;
                }
            }

            context += "\n";
        });

        // Aggiungi avviso se necessario
        if (potentiallyInappropriateCount > 0) {
            context += "NOTE: Some of these medicines may require a prescription or might not be specifically " +
                "indicated for the described symptoms. Always consult a healthcare professional.\n\n";
        }

        context += "Use this information if relevant to answer the query.\n";

        // Log per debug
        console.log(`Retrieved ${searchResults.length} medicines for context. Potentially inappropriate: ${potentiallyInappropriateCount}`);

        return context;
    } catch (error) {
        console.error("Error retrieving medical context:", error);
        return "";
    }
}

/**
 * Estrae i sintomi chiave dalla query - stessa funzione di vectorSearch.js per coerenza
 * @param {string} query
 * @returns {string[]} Sintomi rilevanti
 */
function extractKeySymptoms(query) {
    const commonSymptoms = [
        'fever', 'cough', 'cold', 'flu', 'headache', 'pain', 'throat',
        'congestion', 'runny nose', 'nausea', 'vomiting', 'diarrhea',
        'infection', 'inflammation', 'allergic', 'allergy', 'ache',
        'joint', 'muscle'
    ];

    const queryLower = query.toLowerCase();
    return commonSymptoms.filter(symptom => queryLower.includes(symptom));
}