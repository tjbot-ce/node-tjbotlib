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

import { execSync } from 'node:child_process';
import winston from 'winston';

/**
 * Check if a command-line tool is available in PATH
 * @param command - The command to check for
 * @returns True if command is available, false otherwise
 */
export function isCommandAvailable(command: string): boolean {
    try {
        execSync(`command -v ${command}`, { stdio: 'ignore' });
        return true;
    } catch {
        return false;
    }
}

/**
 * Sleep for a specified number of milliseconds
 * @param ms - Milliseconds to sleep
 * @returns Promise that resolves after the specified time
 */
export function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if a module is available (can be imported)
 * @param moduleName - Name of the module to check
 * @returns True if module is available, false otherwise
 */
export async function isModuleAvailable(moduleName: string): Promise<boolean> {
    try {
        await import(moduleName);
        return true;
    } catch (_e) {
        return false;
    }
}

/**
 * Format text as a test title with decorative borders
 * @param text - The title text
 * @returns Formatted title string
 */
export function formatTitle(text: string): string {
    const line = '='.repeat(text.length + 4);
    return `\n${line}\n  ${text}\n${line}\n`;
}

/**
 * Format text as a section header
 * @param text - The section text
 * @returns Formatted section header string
 */
export function formatSection(text: string): string {
    return `\n--- ${text} ---`;
}

/**
 * Initialize Winston logging for tests to ensure a console transport exists.
 * Safe to call multiple times; only configures when no transports are present.
 * @param level - Log level
 */
export function initWinston(level: 'error' | 'warn' | 'info' | 'verbose' | 'debug' = 'info'): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!(globalThis as any).__TJ_TEST_LOGGER_INITIALIZED__) {
        // Custom formatter for pretty-printing error objects with color
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const prettyErrorFormat = winston.format.printf((info: any) => {
            let message = `${info.level}: ${info.message}`;

            // If there are additional metadata fields (like error objects), pretty-print them
            const metadata = { ...info };
            delete metadata.level;
            delete metadata.message;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            delete (metadata as any)[Symbol.for('level')];
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            delete (metadata as any)[Symbol.for('message')];
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            delete (metadata as any)[Symbol.for('splat')];

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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (globalThis as any).__TJ_TEST_LOGGER_INITIALIZED__ = true;
    } else if (level) {
        winston.level = level;
    }
}
