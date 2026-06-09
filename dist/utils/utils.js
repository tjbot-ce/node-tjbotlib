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
import { execSync } from 'child_process';
/**
 * Put TJBot to sleep.
 * @param {number} sec Number of seconds to sleep for.
 */
export function sleepSync(sec) {
    const msec = sec * 1000;
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, msec);
}
/**
 * Put TJBot to sleep asynchronously.
 * @param {number} sec Number of seconds to sleep for.
 */
export function sleep(sec) {
    const msec = sec * 1000;
    return new Promise((resolve) => {
        setTimeout(resolve, msec);
    });
}
/**
 * Check if a command-line tool is available in PATH
 * @param {string} command - The command to check for
 * @returns {boolean} - True if command is available, false otherwise
 */
export function isCommandAvailable(command) {
    try {
        execSync(`command -v ${command}`, { stdio: 'ignore' });
        return true;
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=utils.js.map