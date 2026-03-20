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
import { TJBotError } from './errors.js';
import winston from 'winston';
import { LogEmoji } from './logging.js';
const EMO = LogEmoji.CONFIG;
/**
 * Resolves a credentials file path by checking provided path, then CWD, then ~/.tjbot.
 * @param filename - The filename to look for (e.g., 'azure-credentials.env')
 * @param providedPath - Optional explicit path to check first
 * @throws {TJBotError} if no credentials file is found
 */
export function resolveCredentialsPath(filename, providedPath) {
    if (providedPath) {
        winston.verbose(`${EMO} Using specified path for credentials: ${providedPath}`);
        if (!fs.existsSync(providedPath)) {
            throw new TJBotError(`Credentials file not found at: ${providedPath}`);
        }
        return providedPath;
    }
    const defaultPaths = [path.join(process.cwd(), filename), path.join(os.homedir(), '.tjbot', filename)];
    for (const defaultPath of defaultPaths) {
        if (fs.existsSync(defaultPath)) {
            winston.verbose(`${EMO} Found credentials file at: ${defaultPath}`);
            return defaultPath;
        }
    }
    throw new TJBotError(`Credentials file ${filename} not found. Place credentials at: ./${filename} or ~/.tjbot/${filename}`);
}
/**
 * Parses a .env format credentials file into key-value pairs.
 */
function parseEnvCredentialsFile(credentialsPath) {
    const raw = {};
    fs.readFileSync(credentialsPath, 'utf-8')
        .split('\n')
        .forEach((line) => {
        line = line.trim();
        if (line && !line.startsWith('#')) {
            const [key, ...valueParts] = line.split('=');
            if (key) {
                raw[key.trim()] = valueParts.join('=').trim();
            }
        }
    });
    winston.debug(`${EMO} Parsed ${Object.keys(raw).length} credentials from file: ${credentialsPath}`);
    return raw;
}
/**
 * Loads credentials into environment variables.
 * @param credentials - A record of key-value pairs representing credentials
 */
function loadCredentialsIntoEnvironment(credentials) {
    Object.entries(credentials).forEach(([key, value]) => {
        process.env[key] = value;
        winston.debug(`${EMO} loaded credential into environment: ${key}=***`);
    });
}
/**
 * Resolves, loads, and exports Azure credentials.
 */
export function loadAzureCredentials(providedPath) {
    const credentialsPath = resolveCredentialsPath('azure-credentials.env', providedPath);
    winston.verbose(`${EMO} Loading Azure credentials from file: ${credentialsPath}`);
    try {
        const raw = parseEnvCredentialsFile(credentialsPath);
        loadCredentialsIntoEnvironment(raw);
        winston.debug(`${EMO} Loaded Azure credentials from: ${credentialsPath}`);
        return {
            speechKey: raw.AZURE_SPEECH_KEY,
            speechRegion: raw.AZURE_SPEECH_REGION,
            imageAnalysisKey: raw.AZURE_VISION_KEY,
            imageAnalysisUrl: raw.AZURE_VISION_URL,
        };
    }
    catch (err) {
        throw new TJBotError(`Failed to load Azure credentials from ${credentialsPath}`, { cause: err });
    }
}
/**
 * Resolves Google Cloud credentials and exports credentials path for ADC.
 */
export function loadGoogleCloudCredentials(providedPath) {
    const credentialsPath = resolveCredentialsPath('google-credentials.json', providedPath);
    winston.verbose(`${EMO} Loading Google Cloud credentials from file: ${credentialsPath}`);
    if (!fs.existsSync(credentialsPath)) {
        throw new TJBotError(`Google Cloud credentials file not found at: ${credentialsPath}`);
    }
    loadCredentialsIntoEnvironment({ GOOGLE_APPLICATION_CREDENTIALS: credentialsPath });
    return { credentialsPath };
}
/**
 * Resolves, loads, and exports IBM Watson credentials.
 */
export function loadIBMWatsonCloudCredentials(providedPath) {
    const credentialsPath = resolveCredentialsPath('ibm-credentials.env', providedPath);
    winston.verbose(`${EMO} Loading IBM Watson credentials from file: ${credentialsPath}`);
    try {
        const raw = parseEnvCredentialsFile(credentialsPath);
        loadCredentialsIntoEnvironment(raw);
    }
    catch (err) {
        throw new TJBotError(`Failed to load IBM Watson credentials from ${credentialsPath}`, { cause: err });
    }
}
//# sourceMappingURL=credentials.js.map