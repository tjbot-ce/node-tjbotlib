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
import * as sdk from 'microsoft-cognitiveservices-speech-sdk';
import winston from 'winston';
import { STTEngine } from '../stt-engine.js';
import { TJBotError } from '../../utils/index.js';
/**
 * Azure Cognitive Services Speech-to-Text Engine
 *
 * Cloud-based speech recognition using Microsoft Azure Speech Services.
 * Requires Azure subscription key and region to be configured.
 * @public
 */
export class AzureSTTEngine extends STTEngine {
    constructor(config) {
        super(config);
    }
    async initialize() {
        try {
            const config = this.config;
            this.loadCredentials(config);
            if (!this.subscriptionKey || !this.region) {
                throw new TJBotError('Azure Speech subscription key and region are required');
            }
            winston.debug(`🗣️ Azure STT engine initialized with region: ${this.region}`);
        }
        catch (err) {
            winston.error('Failed to initialize Azure STT:', err);
            throw new TJBotError('Failed to initialize Azure STT engine', { cause: err });
        }
    }
    loadCredentials(config) {
        // First try environment variables
        if (process.env.AZURE_SPEECH_KEY && process.env.AZURE_SPEECH_REGION) {
            this.subscriptionKey = process.env.AZURE_SPEECH_KEY;
            this.region = process.env.AZURE_SPEECH_REGION;
            return;
        }
        // Then try credentials file
        const credentialsPath = this.resolveCredentialsPath(config?.credentialsPath);
        if (credentialsPath) {
            this.loadCredentialsFromFile(credentialsPath);
            return;
        }
        throw new TJBotError('Azure Speech credentials not found. Set AZURE_SPEECH_KEY and AZURE_SPEECH_REGION environment variables, or place credentials at: ./azure-credentials.env or ~/.tjbot/azure-credentials.env');
    }
    resolveCredentialsPath(providedPath) {
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
    loadCredentialsFromFile(credentialsPath) {
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
            this.subscriptionKey = credentials.AZURE_SPEECH_KEY;
            this.region = credentials.AZURE_SPEECH_REGION;
            winston.debug(`🗣️ Loaded Azure credentials from: ${credentialsPath}`);
        }
        catch (err) {
            throw new TJBotError(`Failed to load Azure credentials from ${credentialsPath}`, { cause: err });
        }
    }
    async transcribe(micStream, options) {
        if (!this.subscriptionKey || !this.region) {
            throw new TJBotError('Azure STT not initialized. Call initialize() first.');
        }
        const listenConfig = options.listenConfig ?? {};
        const backendConfig = (listenConfig.backend?.['azure-stt'] ?? {});
        const language = backendConfig.language;
        if (!language) {
            throw new TJBotError('Azure STT language not specified. Provide language in listen config.');
        }
        const sampleRate = listenConfig.microphoneRate ?? 44100;
        // Create speech config
        const speechConfig = sdk.SpeechConfig.fromSubscription(this.subscriptionKey, this.region);
        speechConfig.speechRecognitionLanguage = language;
        winston.debug(`🎤 Azure STT params: language=${language}, sampleRate=${sampleRate}`);
        // Create audio config from stream
        const audioFormat = sdk.AudioStreamFormat.getWaveFormatPCM(sampleRate, 16, 1);
        const pushStream = sdk.AudioInputStream.createPushStream(audioFormat);
        // Pipe microphone data to push stream
        this.ensureStream(micStream).on('data', (chunk) => {
            // Azure SDK expects an ArrayBuffer, convert Buffer while preserving view
            const arrayBuffer = chunk.buffer.slice(chunk.byteOffset, chunk.byteOffset + chunk.byteLength);
            pushStream.write(arrayBuffer);
        });
        this.ensureStream(micStream).on('end', () => {
            pushStream.close();
        });
        const audioConfig = sdk.AudioConfig.fromStreamInput(pushStream);
        // Create recognizer
        const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);
        return new Promise((resolve, reject) => {
            recognizer.recognizeOnceAsync((result) => {
                recognizer.close();
                if (result.reason === sdk.ResultReason.RecognizedSpeech) {
                    winston.debug(`🎤 Azure STT recognized: ${result.text}`);
                    resolve(result.text.trim());
                }
                else if (result.reason === sdk.ResultReason.NoMatch) {
                    reject(new TJBotError('Azure STT: No speech could be recognized'));
                }
                else if (result.reason === sdk.ResultReason.Canceled) {
                    const cancellation = sdk.CancellationDetails.fromResult(result);
                    reject(new TJBotError(`Azure STT canceled: ${cancellation.reason} - ${cancellation.errorDetails}`));
                }
                else {
                    reject(new TJBotError(`Azure STT recognition failed with reason: ${result.reason}`));
                }
            }, (error) => {
                recognizer.close();
                reject(new TJBotError('Azure STT recognition error', { cause: new Error(error) }));
            });
        });
    }
}
//# sourceMappingURL=azure-stt.js.map