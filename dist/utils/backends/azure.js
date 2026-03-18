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
import winston from 'winston';
import { LogEmoji } from '../logging.js';
export function resolveCredentialsPath(providedPath) {
    if (providedPath) {
        if (!fs.existsSync(providedPath)) {
            throw new TJBotError(`Azure credentials file not found at: ${providedPath}`);
        }
        return providedPath;
    }
    // Check default locations
    const defaultPaths = [
        path.join(process.cwd(), 'azure-credentials.env'),
        path.join(os.homedir(), '.tjbot', 'azure-credentials.env'),
    ];
    for (const defaultPath of defaultPaths) {
        if (fs.existsSync(defaultPath)) {
            return defaultPath;
        }
    }
    return undefined;
}
export function loadCredentialsFromFile(credentialsPath) {
    winston.debug(`${LogEmoji.CONFIG} Loading Azure credentials from file: ${credentialsPath}`);
    try {
        const credentialsContent = fs.readFileSync(credentialsPath, 'utf-8');
        const credentials = {};
        credentialsContent.split('\n').forEach((line) => {
            line = line.trim();
            if (line && !line.startsWith('#')) {
                const [key, ...valueParts] = line.split('=');
                if (key) {
                    credentials[key.trim()] = valueParts.join('=').trim();
                }
            }
        });
        const subscriptionKey = credentials.AZURE_SPEECH_KEY;
        const region = credentials.AZURE_SPEECH_REGION;
        if (!subscriptionKey || !region) {
            throw new TJBotError('Azure credentials file is missing subscriptionKey or region keys');
        }
        winston.debug(`${LogEmoji.CONFIG} loaded Azure credentials from: ${credentialsPath}`);
        return { subscriptionKey, region };
    }
    catch (err) {
        throw new TJBotError(`Failed to load Azure credentials from ${credentialsPath}`, { cause: err });
    }
}
//# sourceMappingURL=azure.js.map