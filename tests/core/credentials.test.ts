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
import { afterEach, describe, expect, test } from 'vitest';
import {
    loadAzureCredentials,
    loadGoogleCloudCredentials,
    loadIBMWatsonCloudCredentials,
} from '../../src/utils/credentials.js';

const TRACKED_ENV_KEYS = [
    'AZURE_SPEECH_KEY',
    'AZURE_SPEECH_REGION',
    'AZURE_VISION_KEY',
    'AZURE_VISION_ENDPOINT',
    'GOOGLE_APPLICATION_CREDENTIALS',
    'SPEECH_TO_TEXT_APIKEY',
    'SPEECH_TO_TEXT_IAM_APIKEY',
    'SPEECH_TO_TEXT_URL',
    'SPEECH_TO_TEXT_AUTH_TYPE',
] as const;

function createTempFile(filename: string, content: string): string {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tjbot-credentials-test-'));
    const filePath = path.join(tempDir, filename);
    fs.writeFileSync(filePath, content, 'utf-8');
    return filePath;
}

function captureEnvSnapshot(): Record<string, string | undefined> {
    const snapshot: Record<string, string | undefined> = {};
    TRACKED_ENV_KEYS.forEach((key) => {
        snapshot[key] = process.env[key];
    });
    return snapshot;
}

function restoreEnvSnapshot(snapshot: Record<string, string | undefined>): void {
    TRACKED_ENV_KEYS.forEach((key) => {
        const previous = snapshot[key];
        if (previous === undefined) {
            delete process.env[key];
        } else {
            process.env[key] = previous;
        }
    });
}

function cleanupTempFile(filePath: string): void {
    const dirPath = path.dirname(filePath);
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }
    if (fs.existsSync(dirPath)) {
        fs.rmdirSync(dirPath);
    }
}

afterEach(() => {
    TRACKED_ENV_KEYS.forEach((key) => {
        delete process.env[key];
    });
});

describe('Credentials Loading', () => {
    test('[test_resolve_credentials_path_prefers_provided_path] resolve credentials path prefers provided path', () => {
        const filePath = createTempFile('azure-credentials.env', 'AZURE_VISION_KEY=test_key\n');
        try {
            const credentials = loadAzureCredentials(filePath);
            expect(credentials.visionKey).toBe('test_key');
        } finally {
            cleanupTempFile(filePath);
        }
    });

    test('[test_resolve_credentials_path_not_found_raises] resolve credentials path not found raises', () => {
        expect(() => loadAzureCredentials('/tmp/does-not-exist-credentials.env')).toThrow();
    });

    test('[test_load_google_cloud_credentials_sets_env] load google cloud credentials sets env', () => {
        const envSnapshot = captureEnvSnapshot();
        const filePath = createTempFile('google-credentials.json', '{"type":"service_account"}');
        try {
            const out = loadGoogleCloudCredentials(filePath);
            expect(out.credentialsPath).toBe(filePath);
            expect(process.env.GOOGLE_APPLICATION_CREDENTIALS).toBe(filePath);
        } finally {
            restoreEnvSnapshot(envSnapshot);
            cleanupTempFile(filePath);
        }
    });

    test('[test_load_azure_credentials_parses_env] load azure credentials parses env', () => {
        const envSnapshot = captureEnvSnapshot();
        const filePath = createTempFile(
            'azure-credentials.env',
            'AZURE_VISION_KEY=test_key\nAZURE_VISION_ENDPOINT=https://example.cognitiveservices.azure.com/\n'
        );
        try {
            const creds = loadAzureCredentials(filePath);
            expect(creds.visionKey).toBe('test_key');
            expect(creds.visionEndpoint).toBe('https://example.cognitiveservices.azure.com/');
        } finally {
            restoreEnvSnapshot(envSnapshot);
            cleanupTempFile(filePath);
        }
    });

    test('[test_loads_azure_credentials_from_tmp_and_exports_vars_to_environment] loads Azure credentials from /tmp and exports vars to environment', () => {
        const envSnapshot = captureEnvSnapshot();
        const filePath = createTempFile(
            'azure-credentials.env',
            [
                'AZURE_SPEECH_KEY=test-speech-key',
                'AZURE_SPEECH_REGION=eastus',
                'AZURE_VISION_KEY=test-vision-key',
                'AZURE_VISION_ENDPOINT=https://example.cognitiveservices.azure.com/',
            ].join('\n')
        );

        try {
            const credentials = loadAzureCredentials(filePath);

            expect(credentials.speechKey).toBe('test-speech-key');
            expect(credentials.speechRegion).toBe('eastus');
            expect(credentials.visionKey).toBe('test-vision-key');
            expect(credentials.visionEndpoint).toBe('https://example.cognitiveservices.azure.com/');

            expect(process.env.AZURE_SPEECH_KEY).toBe('test-speech-key');
            expect(process.env.AZURE_SPEECH_REGION).toBe('eastus');
            expect(process.env.AZURE_VISION_KEY).toBe('test-vision-key');
            expect(process.env.AZURE_VISION_ENDPOINT).toBe('https://example.cognitiveservices.azure.com/');
        } finally {
            restoreEnvSnapshot(envSnapshot);
            cleanupTempFile(filePath);
        }
    });

    test('[test_loads_google_cloud_credentials_path_from_tmp_and_sets_google_application_credentials] loads Google Cloud credentials path from /tmp and sets GOOGLE_APPLICATION_CREDENTIALS', () => {
        const envSnapshot = captureEnvSnapshot();
        const filePath = createTempFile(
            'google-credentials.json',
            JSON.stringify({
                type: 'service_account',
                project_id: 'test-project',
            })
        );

        try {
            const credentials = loadGoogleCloudCredentials(filePath);

            expect(credentials.credentialsPath).toBe(filePath);
            expect(process.env.GOOGLE_APPLICATION_CREDENTIALS).toBe(filePath);
        } finally {
            restoreEnvSnapshot(envSnapshot);
            cleanupTempFile(filePath);
        }
    });

    test('[test_loads_ibm_watson_credentials_from_tmp_and_exports_vars_to_environment] loads IBM Watson credentials from /tmp and exports vars to environment', () => {
        const envSnapshot = captureEnvSnapshot();
        const filePath = createTempFile(
            'ibm-credentials.env',
            [
                'SPEECH_TO_TEXT_APIKEY=test-stt-apikey',
                'SPEECH_TO_TEXT_IAM_APIKEY=test-stt-iam-apikey',
                'SPEECH_TO_TEXT_URL=https://api.us-south.speech-to-text.watson.cloud.ibm.com',
                'SPEECH_TO_TEXT_AUTH_TYPE=iam',
            ].join('\n')
        );

        try {
            loadIBMWatsonCloudCredentials(filePath);

            expect(process.env.SPEECH_TO_TEXT_APIKEY).toBe('test-stt-apikey');
            expect(process.env.SPEECH_TO_TEXT_IAM_APIKEY).toBe('test-stt-iam-apikey');
            expect(process.env.SPEECH_TO_TEXT_URL).toBe('https://api.us-south.speech-to-text.watson.cloud.ibm.com');
            expect(process.env.SPEECH_TO_TEXT_AUTH_TYPE).toBe('iam');
        } finally {
            restoreEnvSnapshot(envSnapshot);
            cleanupTempFile(filePath);
        }
    });
});
