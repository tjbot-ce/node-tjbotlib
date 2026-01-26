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
import { SpeechClient, protos as speechProtos } from '@google-cloud/speech';
import winston from 'winston';
import { STTEngine, STTRequestOptions } from '../stt-engine.js';
import { ListenConfig } from '../../config/index.js';
import { TJBotError } from '../../utils/index.js';
import type { STTBackendGoogleCloudConfig } from '../../config/config-types.js';

/**
 * Google Cloud Speech-to-Text Engine
 *
 * Cloud-based speech recognition using Google Cloud Speech-to-Text API.
 * Requires Google Cloud credentials JSON file to be configured.
 * @public
 */
export class GoogleCloudSTTEngine extends STTEngine {
    private client: SpeechClient | undefined;

    constructor(config?: STTBackendGoogleCloudConfig) {
        super(config);
    }

    async initialize(): Promise<void> {
        try {
            const config = this.config as STTBackendGoogleCloudConfig | undefined;
            const credentialsPath = this.resolveCredentialsPath(config?.credentialsPath);

            // Set credentials path in environment variable
            if (credentialsPath) {
                process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialsPath;
                winston.debug(`🗣️ Using Google Cloud credentials from: ${credentialsPath}`);
            }

            this.client = new SpeechClient();
            winston.debug('🗣️ Google Cloud STT engine initialized');
        } catch (err) {
            winston.error('Failed to initialize Google Cloud STT:', err);
            throw new TJBotError('Failed to initialize Google Cloud STT engine', { cause: err as Error });
        }
    }

    private resolveCredentialsPath(providedPath?: string): string {
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

        throw new TJBotError(
            'Google Cloud credentials not found. Set GOOGLE_APPLICATION_CREDENTIALS environment variable or place credentials at: ./google-credentials.json or ~/.tjbot/google-credentials.json'
        );
    }

    async transcribe(micStream: NodeJS.ReadableStream, options: STTRequestOptions): Promise<string> {
        if (!this.client) {
            throw new TJBotError('Google Cloud STT client not initialized. Call initialize() first.');
        }

        const listenConfig: ListenConfig = options.listenConfig ?? {};
        const backendConfig = (listenConfig.backend?.['google-cloud-stt'] ?? {}) as STTBackendGoogleCloudConfig;

        const sampleRateHertz: number =
            backendConfig.sampleRateHertz ?? (listenConfig.microphoneRate as number) ?? 44100;
        const audioChannelCount: number =
            backendConfig.audioChannelCount ?? (listenConfig.microphoneChannels as number) ?? 2;
        const languageCode = backendConfig.languageCode;
        if (!languageCode) {
            throw new TJBotError('Google Cloud STT languageCode not specified. Provide languageCode in listen config.');
        }
        const model = backendConfig.model;
        if (!model) {
            throw new TJBotError('Google Cloud STT model not specified. Provide model in listen config.');
        }
        const enableAutomaticPunctuation: boolean = backendConfig.enableAutomaticPunctuation ?? true;
        const interimResults: boolean = backendConfig.interimResults ?? true;

        const request: speechProtos.google.cloud.speech.v1.IStreamingRecognitionConfig = {
            config: {
                encoding: speechProtos.google.cloud.speech.v1.RecognitionConfig.AudioEncoding.LINEAR16,
                sampleRateHertz,
                audioChannelCount,
                languageCode,
                model,
                enableAutomaticPunctuation,
            },
            interimResults,
        };

        winston.debug(`🎤 Google Cloud STT params: ${JSON.stringify(request)}`);

        // Create a recognize stream
        const recognizeStream = this.client
            .streamingRecognize(request)
            .on('error', (err: Error) => {
                winston.error('Google Cloud STT stream error:', err);
            })
            .on('data', (data: speechProtos.google.cloud.speech.v1.IStreamingRecognizeResponse) => {
                if (data.results && data.results.length > 0) {
                    const result = data.results[0];
                    if (result.alternatives && result.alternatives.length > 0) {
                        const transcript = result.alternatives[0].transcript;
                        if (result.isFinal && transcript) {
                            winston.debug(`🎤 Final transcript: ${transcript}`);
                        }
                    }
                }
            });

        // Pipe microphone to recognition stream
        this.ensureStream(micStream).pipe(recognizeStream);

        return new Promise<string>((resolve, reject) => {
            let finalTranscript = '';

            recognizeStream.on('data', (data: speechProtos.google.cloud.speech.v1.IStreamingRecognizeResponse) => {
                if (data.results && data.results.length > 0) {
                    const result = data.results[0];
                    if (result.isFinal && result.alternatives && result.alternatives.length > 0) {
                        const transcript = result.alternatives[0].transcript;
                        if (transcript) {
                            finalTranscript = transcript;
                            cleanup();
                            resolve(finalTranscript.trim());
                        }
                    }
                }
            });

            recognizeStream.on('error', (err: Error) => {
                cleanup();
                reject(new TJBotError('Google Cloud STT recognition failed', { cause: err }));
            });

            const cleanup = () => {
                try {
                    this.ensureStream(micStream).unpipe(recognizeStream);
                } catch (err) {
                    winston.debug('🎤 mic unpipe failed (likely already closed)', err as Error);
                }
                recognizeStream.destroy();
            };
        });
    }
}
