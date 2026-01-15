/**
 * Copyright 2025 IBM Corp. All Rights Reserved.
 * Copyright 2026-present TJBot Contributors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { createInterface } from 'node:readline';
import { execSync } from 'node:child_process';
import winston from 'winston';

/**
 * Check if a command-line tool is available in PATH
 * @param {string} command - The command to check for
 * @returns {boolean} - True if command is available, false otherwise
 */
export function isCommandAvailable(command) {
    try {
        execSync(`command -v ${command}`, { stdio: 'ignore' });
        return true;
    } catch {
        return false;
    }
}

/**
 * Prompts the user for input in an interactive test
 * @param {string} question - The question to ask the user
 * @returns {Promise<string>} - The user's response
 */
export function promptUser(question) {
    return new Promise((resolve) => {
        const rl = createInterface({
            input: process.stdin,
            output: process.stdout,
        });
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer);
        });
    });
}

/**
 * Sleep for a specified number of milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
export function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if a module is available (can be imported)
 * @param {string} moduleName - Name of the module to check
 * @returns {Promise<boolean>} - True if module is available, false otherwise
 */
export async function isModuleAvailable(moduleName) {
    try {
        await import(moduleName);
        return true;
    } catch (_e) {
        return false;
    }
}

/**
 * Prompt user for yes/no confirmation
 * @param {string} question - The question to ask
 * @returns {Promise<boolean>} - True if user answered yes (or pressed enter), false if no
 */
export async function confirmUser(question) {
    const answer = await promptUser(question);
    return answer.trim() === '' || answer.toLowerCase().match(/^(yes|y)$/) !== null;
}

/**
 * Format text as a test title with decorative borders
 * @param {string} text - The title text
 * @returns {string} - Formatted title string
 */
export function formatTitle(text) {
    const line = '='.repeat(text.length + 4);
    return `\n${line}\n  ${text}\n${line}\n`;
}

/**
 * Format text as a section header
 * @param {string} text - The section text
 * @returns {string} - Formatted section header string
 */
export function formatSection(text) {
    return `\n--- ${text} ---`;
}

/**
 * Initialize Winston logging for tests to ensure a console transport exists.
 * Safe to call multiple times; only configures when no transports are present.
 * @param {('error'|'warn'|'info'|'verbose'|'debug')} [level='info'] - Log level
 */
export function initWinston(level = 'info') {
    if (!globalThis.__TJ_TEST_LOGGER_INITIALIZED__) {
        // Custom formatter for pretty-printing error objects with color
        const prettyErrorFormat = winston.format.printf((info) => {
            let message = `${info.level}: ${info.message}`;

            // If there are additional metadata fields (like error objects), pretty-print them
            const metadata = { ...info };
            delete metadata.level;
            delete metadata.message;
            delete metadata[Symbol.for('level')];
            delete metadata[Symbol.for('message')];
            delete metadata[Symbol.for('splat')];

            if (Object.keys(metadata).length > 0) {
                // Pretty-print the metadata as colored JSON
                const jsonString = JSON.stringify(metadata, null, 2);
                // Add cyan color to the JSON output
                message += ' \x1b[36m' + jsonString + '\x1b[0m';
            }

            return message;
        });

        winston.configure({
            level,
            format: winston.format.combine(winston.format.colorize(), prettyErrorFormat),
            transports: [new winston.transports.Console()],
        });
        globalThis.__TJ_TEST_LOGGER_INITIALIZED__ = true;
    } else if (level) {
        winston.level = level;
    }
}
