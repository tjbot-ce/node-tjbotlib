/**
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
import fs from 'fs';
import os from 'os';
import path from 'path';
import { TJBotError } from '../errors.js';
export function loadCredentials(credentialsPath) {
    let resolvedPath = credentialsPath;
    // If no path provided, check default locations in order
    if (!resolvedPath) {
        // 1. Check CWD
        const cwdPath = path.join(process.cwd(), 'ibm-credentials.env');
        if (fs.existsSync(cwdPath)) {
            resolvedPath = cwdPath;
        }
        else {
            // 2. Check ~/.tjbot/ibm-credentials.env
            const homePath = path.join(os.homedir(), '.tjbot', 'ibm-credentials.env');
            if (fs.existsSync(homePath)) {
                resolvedPath = homePath;
            }
        }
    }
    // If path is specified (either provided or found), load credentials
    if (resolvedPath) {
        if (!fs.existsSync(resolvedPath)) {
            throw new TJBotError(`IBM credentials file not found at: ${resolvedPath}`);
        }
        const credentialsContent = fs.readFileSync(resolvedPath, 'utf-8');
        credentialsContent.split('\n').forEach((line) => {
            line = line.trim();
            if (line && !line.startsWith('#')) {
                const [key, ...valueParts] = line.split('=');
                if (key) {
                    process.env[key.trim()] = valueParts.join('=').trim();
                }
            }
        });
    }
    else {
        throw new TJBotError('IBM Watson STT credentials not found. Place credentials at: ./ibm-credentials.env or ~/.tjbot/ibm-credentials.env');
    }
}
//# sourceMappingURL=ibm-watson.js.map