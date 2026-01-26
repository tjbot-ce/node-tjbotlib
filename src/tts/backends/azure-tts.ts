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
import { TTSEngine } from '../tts-engine.js';
import { TJBotError } from '../../utils/index.js';
import type { TTSBackendAzureConfig } from '../../config/config-types.js';

/**
 * Azure Cognitive Services Text-to-Speech Engine
 *
 * Cloud-based speech synthesis using Microsoft Azure Speech Services.
 * Requires Azure subscription key and region to be configured.
 * @public
 */
export class AzureTTSEngine extends TTSEngine {
    private subscriptionKey: string | undefined;
    private region: string | undefined;

    constructor(config?: TTSBackendAzureConfig) {
        super(config);
    }

    async initialize(): Promise<void> {
        try {
            this.loadCredentials();

            if (!this.subscriptionKey || !this.region) {
                throw new TJBotError('Azure Speech subscription key and region are required');
            }

            winston.info(`🔈 Azure TTS engine initialized with region: ${this.region}`);
        } catch (error) {
            winston.error('Failed to initialize Azure TTS:', error);
            throw new TJBotError('Failed to initialize Azure TTS engine', { cause: error as Error });
        }
    }

    private loadCredentials(): void {
        const config = this.config as TTSBackendAzureConfig;

        // First try environment variables
        if (process.env.AZURE_SPEECH_KEY && process.env.AZURE_SPEECH_REGION) {
            this.subscriptionKey = process.env.AZURE_SPEECH_KEY;
            this.region = process.env.AZURE_SPEECH_REGION;
            return;
        }

        // Then try credentials file
        const credentialsPath = this.resolveCredentialsPath(config?.credentialsPath as string | undefined);
        if (credentialsPath) {
            this.loadCredentialsFromFile(credentialsPath);
            return;
        }

        throw new TJBotError(
            'Azure Speech credentials not found. Set AZURE_SPEECH_KEY and AZURE_SPEECH_REGION environment variables, or place credentials at: ./azure-credentials.env or ~/.tjbot/azure-credentials.env'
        );
    }

    private resolveCredentialsPath(providedPath?: string): string | undefined {
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

    private loadCredentialsFromFile(credentialsPath: string): void {
        try {
            const credentialsContent = fs.readFileSync(credentialsPath, 'utf-8');
            const credentials: Record<string, string> = {};

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

            winston.debug(`🔈 Loaded Azure credentials from: ${credentialsPath}`);
        } catch (err) {
            throw new TJBotError(`Failed to load Azure credentials from ${credentialsPath}`, { cause: err as Error });
        }
    }

    async synthesize(text: string): Promise<Buffer> {
        this.validateText(text);

        if (!this.subscriptionKey || !this.region) {
            throw new TJBotError('Azure TTS not initialized. Call initialize() first.');
        }

        try {
            const voiceName = this.config?.voice as string;
            if (!voiceName) {
                throw new TJBotError('Azure TTS voice not specified. Provide voice in speak config.');
            }

            winston.debug(`🔈 Synthesizing with Azure TTS: voice=${voiceName}`);

            // Create speech config
            const speechConfig = sdk.SpeechConfig.fromSubscription(this.subscriptionKey, this.region);
            speechConfig.speechSynthesisVoiceName = voiceName;
            speechConfig.speechSynthesisOutputFormat = sdk.SpeechSynthesisOutputFormat.Riff24Khz16BitMonoPcm;

            // Create synthesizer with null audio config to get result in memory
            const synthesizer = new sdk.SpeechSynthesizer(speechConfig, undefined);

            return new Promise<Buffer>((resolve, reject) => {
                synthesizer.speakTextAsync(
                    text,
                    (result: sdk.SpeechSynthesisResult) => {
                        synthesizer.close();

                        if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
                            const audioData = Buffer.from(result.audioData);
                            winston.debug(`🔈 Azure TTS synthesis complete: ${audioData.length} bytes`);
                            resolve(audioData);
                        } else if (result.reason === sdk.ResultReason.Canceled) {
                            const cancellation = (
                                sdk as unknown as {
                                    SpeechSynthesisCancellationDetails: {
                                        fromResult: (r: sdk.SpeechSynthesisResult) => {
                                            reason: string;
                                            errorDetails: string;
                                        };
                                    };
                                }
                            ).SpeechSynthesisCancellationDetails.fromResult(result);
                            reject(
                                new TJBotError(
                                    `Azure TTS canceled: ${cancellation.reason} - ${cancellation.errorDetails}`
                                )
                            );
                        } else {
                            reject(new TJBotError(`Azure TTS synthesis failed with reason: ${result.reason}`));
                        }
                    },
                    (error: string) => {
                        synthesizer.close();
                        reject(new TJBotError('Azure TTS synthesis error', { cause: new Error(error) }));
                    }
                );
            });
        } catch (error) {
            winston.error('Azure TTS synthesis failed:', error);
            throw new TJBotError('Azure TTS synthesis failed', { cause: error as Error });
        }
    }
}
