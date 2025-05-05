"use strict";

const path = require("path");
const process = require("process");
const { readFile, writeFile } = require("fs/promises");

const httpDriver = require(path.resolve(process.cwd(), "drivers", "http"));
const chatHistory = require(path.resolve(process.cwd(), "src", "operations", "chatHistory"));
const enhancePromptWithHistoryJob = require(path.resolve(process.cwd(), "src", "jobs", "enhancePromptWithHistory"));
const retrieveMedicalContextOperation = require(path.resolve(process.cwd(),"src", "operations", "retrieveMedicalContext"));
const DEFAULT_MODEL = "mistral-large-latest";

/**
 * Analyzes a prompt to determine if it's medical-related
 *
 * @param {string} prompt - User prompt
 * @returns {boolean} - True if medical-related
 */
function isMedicalQuery(prompt) {
    const medicalKeywords = [
        // English keywords
        'medicine', 'drug', 'medication', 'dosage', 'symptom', 'diagnosis', 'treatment',
        'disease', 'illness', 'condition', 'prescription', 'side effect', 'interact',
        'pill', 'tablet', 'capsule', 'injection', 'dose', 'therapy', 'medicate',

        // Italian medical keywords
        'medicina', 'farmaco', 'medicinale', 'dosaggio', 'sintomo', 'diagnosi', 'trattamento',
        'malattia', 'condizione', 'prescrizione', 'ricetta', 'effetto collaterale', 'interazione',
        'pillola', 'compressa', 'capsula', 'iniezione', 'dose', 'terapia', 'medicare',
        'cura', 'guarire', 'rimedio', 'integratore', 'vitamina', 'minerale', 'inalatore',
        'gocce', 'pomata', 'crema', 'sciroppo', 'cerotto', 'efficacia', 'funziona per',
        'cosa dovrei prendere', 'cosa posso usare', 'cosa aiuta con', 'posologia',
        'controindicazioni', 'indicazioni', 'foglietto illustrativo', 'bugiardino',
        'antidolorifico', 'antibiotico', 'antiinfiammatorio', 'antipiretico',
        'farmacia', 'farmacista', 'dottore', 'febbre', 'dolore', 'infezione'
    ];

    const lowercasePrompt = prompt.toLowerCase();
    return medicalKeywords.some(keyword => lowercasePrompt.includes(keyword));
}

/**
 * Enhance the prompt with relevant conversation history
 * @param {string} prompt User prompt
 * @returns {Promise<string>} Enhanced prompt with history
 */

module.exports = async function (prompt, enableDrHouse = false, ragEnabledHistoryChat = false, ragEnabledMedicalContext = false, userSelectedModel = DEFAULT_MODEL,) {
    console.log(prompt, userSelectedModel, enableDrHouse, ragEnabledHistoryChat, ragEnabledMedicalContext);
    try {
        const url = "/chat/completions";
        let finalSystemInstruction = "";

        // Read the Dr. House system instruction
        if (enableDrHouse) {

            const baseSystemInstruction = await readFile(
                path.resolve(process.cwd(), "fixtures", "dataset_files", "system_instruction.txt"),
                {encoding: "utf-8"}
            );

            finalSystemInstruction = baseSystemInstruction;

        }

        if (isMedicalQuery(prompt) && ragEnabledMedicalContext) {
            const medicalContext = await retrieveMedicalContextOperation(prompt);

            if (medicalContext) {
                // Add medical context to the instruction
                finalSystemInstruction += "\n\n## Relevant Medical Database Information\n" + medicalContext;
            }
        }

        if(ragEnabledMedicalContext) {
            // Enhance prompt with relevant conversation history
            prompt = await enhancePromptWithHistoryJob(prompt);
        }


        // console.log("system prompt:", finalSystemInstruction);
        // console.log("user prompt:", enhancedPrompt);

        const fullQuestion =  `## System Prompt:\n${finalSystemInstruction} \n
                                ## User Prompt:\n ${prompt}`;

        await writeFile(path.resolve(process.cwd(), "currentPrompt.txt"), fullQuestion)
        //await writeFile(path.resolve(process.cwd(), "currentPrompt.txt"), finalSystemInstruction)

        const response = await httpDriver.post(url, {
            model: userSelectedModel,
            messages: [
                {"role": "system", "content": finalSystemInstruction},
                {"role": "user", "content": prompt},
            ],
            temperature: 0.2 // Slightly more deterministic for medical information
        });

        // Store the exchange in history
        await chatHistory.storeExchangeHistory(prompt, response.data.choices[0].message.content);

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