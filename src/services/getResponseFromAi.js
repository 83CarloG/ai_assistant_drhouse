"use strict";

const path = require("path");
const process = require("process");
const { readFile } = require("fs/promises");

const httpDriver = require(path.resolve(process.cwd(), "drivers", "http"));
const config = require(path.resolve(process.cwd(), "config"));
const DEFAULT_MODEL = "mistral-large-latest";

module.exports = async function (prompt, userSelectedModel = DEFAULT_MODEL, systemInstruction = "") {

    try {
        const url = "/chat/completions"
        const systemInstruction = await readFile(path.resolve(process.cwd(), "fixtures", "dataset_files", "system_instruction.txt"), {encoding: "utf-8"});

        const response = await httpDriver.post(url, {
            model: userSelectedModel,
            messages: [
                {"role": "system", "content": systemInstruction || "You are a helpful assistant."},
                {"role": "user", "content": prompt},
                // prefixes enable a high level of instruction following and adherence or define the model's response more effectively
                // see https://docs.mistral.ai/guides/prefix/
                // {"role": "assistant", "content": "Remember, answer with ONLY the MySQL query", "prefix": true},

            ],
            temperature: 0
            //temperature: 0.2
            // temperature: 0.5 // default: 0.7 (0.2 more deterministic, 0.9 more random and creative)
        });
        return {
            data: response.data.choices[0].message.content,
            status: response.status
        };
    } catch (error) {
        return error.response;
    }

}