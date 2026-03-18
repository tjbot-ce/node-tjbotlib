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
export function resolveCredentialsPath(providedPath) {
    // If path is explicitly provided, use it
    if (providedPath) {
        if (!fs.existsSync(providedPath)) {
            throw new TJBotError(`Google Cloud credentials file not found at: ${providedPath}`);
        }
        return providedPath;
    }
    // If GOOGLE_APPLICATION_CREDENTIALS is already set, use it
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        const envPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
        if (fs.existsSync(envPath)) {
            return envPath;
        }
    }
    // Check default locations
    const defaultPaths = [
        path.join(process.cwd(), 'google-credentials.json'),
        path.join(os.homedir(), '.tjbot', 'google-credentials.json'),
    ];
    for (const defaultPath of defaultPaths) {
        if (fs.existsSync(defaultPath)) {
            return defaultPath;
        }
    }
    throw new TJBotError('Google Cloud credentials not found. Set GOOGLE_APPLICATION_CREDENTIALS environment variable or place credentials at: ./google-credentials.json or ~/.tjbot/google-credentials.json');
}
//# sourceMappingURL=google-cloud.js.map