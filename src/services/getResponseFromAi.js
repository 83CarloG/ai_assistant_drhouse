"use strict";

const path = require("path");
const process = require("process");
const { readFile, writeFile } = require("fs/promises");

const config = require(path.resolve(process.cwd(), "config"));
const httpDriver = require(path.resolve(process.cwd(), "drivers", "http"));
const chatHistory = require(path.resolve(process.cwd(), "src", "operations", "chatHistory"));
const enhancePromptWithHistoryJob = require(path.resolve(process.cwd(), "src", "jobs", "enhancePromptWithHistory"));
const retrieveMedicalContextOperation = require(path.resolve(process.cwd(),"src", "operations", "retrieveMedicalContext"));
const medicalQueryDetection = require(path.resolve(process.cwd(), "src", "features", "medicalQueryDetection"));


/**
 * Enhance the prompt with relevant conversation history
 * @param {string} prompt User prompt
 * @returns {Promise<string>} Enhanced prompt with history
 */

module.exports = async function (prompt, enableDrHouse = false, ragEnabledHistoryChat = false, ragEnabledMedicalContext = false, userSelectedModel = config.MISTRAL_DEFAULT_MODEL,) {
    //console.log(prompt, userSelectedModel, enableDrHouse, ragEnabledHistoryChat, ragEnabledMedicalContext);
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
        if (medicalQueryDetection(prompt) && ragEnabledMedicalContext) {
            const baseSystemInstruction = await readFile(
                path.resolve(process.cwd(), "fixtures", "dataset_files", "system_instruction_rag.txt"),
                {encoding: "utf-8"}
            );

            finalSystemInstruction = baseSystemInstruction;
            const medicalContext = await retrieveMedicalContextOperation(prompt);

            if (medicalContext) {
                // Add medical context to the instruction
                finalSystemInstruction += "\n\n## Relevant Medical Database Information\n" + medicalContext;
            }
        }

        if(ragEnabledHistoryChat) {
            // Enhance prompt with relevant conversation history
            prompt = await enhancePromptWithHistoryJob(prompt);
        }

        // console.log("system prompt:", finalSystemInstruction);
        // console.log("user prompt:", enhancedPrompt);

        const fullQuestion =  `## System Prompt:\n${finalSystemInstruction} \n
                                ## User Prompt:\n ${prompt}`;

        await writeFile(path.resolve(process.cwd(), "currentPrompt.txt"), fullQuestion)

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