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

import * as sdk from 'microsoft-cognitiveservices-speech-sdk';
import winston from 'winston';
import type { STTBackendAzureConfig } from '../../config/config-types.js';
import { loadAzureCredentials } from '../../utils/credentials.js';
import { TJBotError } from '../../utils/index.js';
import { LogEmoji } from '../../utils/logging.js';
import { STTEngine, STTRequestOptions } from '../stt-engine.js';

const EMO = LogEmoji.STT;

/**
 * Azure Cognitive Services Speech-to-Text Engine
 *
 * Cloud-based speech recognition using Microsoft Azure Speech Services.
 * Requires Azure subscription key and region to be configured.
 * @public
 */
export class AzureSTTEngine extends STTEngine {
    private microphoneRate: number = 44100;
    private microphoneChannels: number = 2;
    private subscriptionKey?: string;
    private region?: string;

    async initialize(microphoneRate: number, microphoneChannels: number): Promise<void> {
        const config = this.config as STTBackendAzureConfig;
        const credentials = loadAzureCredentials(config?.credentialsPath as string | undefined);
        this.subscriptionKey = credentials.speechKey;
        this.region = credentials.speechRegion;

        if (!config?.language) {
            throw new TJBotError(
                'Azure STT language not specified. Provide language in listen.backend.azure-stt config.'
            );
        }
        if (!this.subscriptionKey || !this.region) {
            throw new TJBotError('Azure Speech subscription key and region are required.');
        }

        this.microphoneRate = microphoneRate;
        this.microphoneChannels = microphoneChannels;

        winston.info(`${EMO} Azure STT engine initialized`);
        winston.debug(`${EMO} Initialized AzureSTTEngine with config:
            language: ${config?.language},
            region: ${config?.region},
            microphoneRate: ${this.microphoneRate},
            microphoneChannels: ${this.microphoneChannels},
            subscriptionKey: ${this.subscriptionKey ? '***' : 'not set'}
        `);
    }

    async transcribe(micStream: NodeJS.ReadableStream, options: STTRequestOptions): Promise<string> {
        const config = this.config as STTBackendAzureConfig;

        if (!this.subscriptionKey || !this.region) {
            throw new TJBotError('Azure STT not initialized. Call initialize() first.');
        }

        const interimResults = config?.interimResults ?? false;

        // Create speech config
        const speechConfig = sdk.SpeechConfig.fromSubscription(this.subscriptionKey, this.region);
        speechConfig.speechRecognitionLanguage = config?.language as string;

        // Create audio config from stream
        const audioFormat = sdk.AudioStreamFormat.getWaveFormatPCM(this.microphoneRate, 16, this.microphoneChannels);
        const pushStream = sdk.AudioInputStream.createPushStream(audioFormat);

        // Pipe microphone data to push stream
        this.ensureStream(micStream).on('data', (chunk: Buffer) => {
            // Azure SDK expects an ArrayBuffer, convert Buffer while preserving view
            const arrayBuffer = chunk.buffer.slice(chunk.byteOffset, chunk.byteOffset + chunk.byteLength);
            pushStream.write(arrayBuffer as ArrayBuffer);
            winston.silly(`${EMO} piped ${chunk.length} bytes from microphone to Azure STT push stream`);
        });

        this.ensureStream(micStream).on('end', () => {
            pushStream.close();
            winston.silly(`${EMO} microphone stream ended, closed Azure STT push stream`);
        });

        const audioConfig = sdk.AudioConfig.fromStreamInput(pushStream);

        // Create recognizer
        const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);

        if (!interimResults) {
            return new Promise<string>((resolve, reject) => {
                recognizer.recognizeOnceAsync(
                    (result: sdk.SpeechRecognitionResult) => {
                        recognizer.close();

                        if (result.reason === sdk.ResultReason.RecognizedSpeech) {
                            winston.debug(`${EMO} Azure STT recognized: ${result.text}`);
                            resolve(result.text.trim());
                        } else if (result.reason === sdk.ResultReason.NoMatch) {
                            reject(new TJBotError('Azure STT: No speech could be recognized'));
                        } else if (result.reason === sdk.ResultReason.Canceled) {
                            const cancellation = sdk.CancellationDetails.fromResult(result);
                            reject(
                                new TJBotError(
                                    `Azure STT canceled: ${cancellation.reason} - ${cancellation.errorDetails}`
                                )
                            );
                        } else {
                            reject(new TJBotError(`Azure STT recognition failed with reason: ${result.reason}`));
                        }
                    },
                    (error: string) => {
                        recognizer.close();
                        reject(new TJBotError('Azure STT recognition error', { cause: new Error(error) }));
                    }
                );
            });
        }

        return new Promise<string>((resolve, reject) => {
            let settled = false;

            const cleanup = () => {
                recognizer.recognizing = () => {
                    // no-op after cleanup
                };
                recognizer.recognized = () => {
                    // no-op after cleanup
                };
                recognizer.canceled = () => {
                    // no-op after cleanup
                };
                recognizer.sessionStopped = () => {
                    // no-op after cleanup
                };
                recognizer.close();
            };

            const settleResolve = (text: string) => {
                if (settled) {
                    return;
                }
                settled = true;
                recognizer.stopContinuousRecognitionAsync(
                    () => {
                        cleanup();
                        resolve(text);
                    },
                    (error: string) => {
                        cleanup();
                        reject(new TJBotError('Azure STT stop recognition error', { cause: new Error(error) }));
                    }
                );
            };

            const settleReject = (error: TJBotError) => {
                if (settled) {
                    return;
                }
                settled = true;
                recognizer.stopContinuousRecognitionAsync(
                    () => {
                        cleanup();
                        reject(error);
                    },
                    () => {
                        cleanup();
                        reject(error);
                    }
                );
            };

            recognizer.recognizing = (_sender: sdk.Recognizer, event: sdk.SpeechRecognitionEventArgs) => {
                const text = event.result?.text?.trim();
                if (text) {
                    options.onPartialResult?.(text);
                }
            };

            recognizer.recognized = (_sender: sdk.Recognizer, event: sdk.SpeechRecognitionEventArgs) => {
                if (event.result.reason === sdk.ResultReason.RecognizedSpeech) {
                    const text = event.result.text?.trim();
                    if (text) {
                        winston.debug(`${EMO} Azure STT recognized: ${text}`);
                        options.onFinalResult?.(text);
                        settleResolve(text);
                    }
                    return;
                }

                if (event.result.reason === sdk.ResultReason.NoMatch) {
                    settleReject(new TJBotError('Azure STT: No speech could be recognized'));
                }
            };

            recognizer.canceled = (_sender: sdk.Recognizer, event: sdk.SpeechRecognitionCanceledEventArgs) => {
                settleReject(new TJBotError(`Azure STT canceled: ${event.reason} - ${event.errorDetails}`));
            };

            recognizer.sessionStopped = () => {
                settleReject(new TJBotError('Azure STT session stopped before a final transcript was recognized'));
            };

            recognizer.startContinuousRecognitionAsync(
                () => {
                    winston.silly(`${EMO} Azure STT continuous recognition started`);
                },
                (error: string) => {
                    settleReject(new TJBotError('Azure STT start recognition error', { cause: new Error(error) }));
                }
            );
        });
    }
}
