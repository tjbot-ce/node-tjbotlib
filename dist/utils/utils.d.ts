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
/**
 * Put TJBot to sleep.
 * @param {number} sec Number of seconds to sleep for.
 */
export declare function sleepSync(sec: number): void;
/**
 * Put TJBot to sleep asynchronously.
 * @param {number} sec Number of seconds to sleep for.
 */
export declare function sleep(sec: number): Promise<void>;
/**
 * Check if a command-line tool is available in PATH
 * @param {string} command - The command to check for
 * @returns {boolean} - True if command is available, false otherwise
 */
export declare function isCommandAvailable(command: string): boolean;
//# sourceMappingURL=utils.d.ts.map