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
import { loadAzureCredentials } from '../../utils/credentials.js';
import { TJBotError } from '../../utils/index.js';
import { getLogger } from '../../utils/logging.js';
import { STTEngine } from '../stt-engine.js';
import { isTimeoutLikeStreamEndReason, resolveTranscriptForStreamEnd } from '../stt-utils.js';
const logger = getLogger(import.meta.url);
/**
 * Azure Cognitive Services Speech-to-Text Engine
 *
 * Cloud-based speech recognition using Microsoft Azure Speech Services.
 * Requires Azure subscription key and region to be configured.
 * @public
 */
export class AzureSTTEngine extends STTEngine {
    microphoneRate = 44100;
    microphoneChannels = 2;
    subscriptionKey;
    region;
    async initialize(microphoneRate, microphoneChannels) {
        const config = this.config;
        const credentials = loadAzureCredentials(config?.credentialsPath);
        this.subscriptionKey = credentials.speechKey;
        this.region = credentials.speechRegion;
        if (!config?.language) {
            throw new TJBotError('Azure STT language not specified. Provide language in listen.backend.azure-stt config.');
        }
        if (!this.subscriptionKey || !this.region) {
            throw new TJBotError('Azure Speech subscription key and region are required.');
        }
        this.microphoneRate = microphoneRate;
        this.microphoneChannels = microphoneChannels;
        logger.info('Azure STT engine initialized');
        logger.debug(`Initialized AzureSTTEngine with config:
            language: ${config?.language},
            region: ${config?.region},
            microphoneRate: ${this.microphoneRate},
            microphoneChannels: ${this.microphoneChannels},
            subscriptionKey: ${this.subscriptionKey ? '***' : 'not set'}
        `);
    }
    async transcribe(micStream, options) {
        const config = this.config;
        if (!this.subscriptionKey || !this.region) {
            throw new TJBotError('Azure STT not initialized. Call initialize() first.');
        }
        const interimResults = config?.interimResults ?? false;
        logger.verbose(`Transcribing speech with Azure STT (language=${config?.language})`);
        // Create speech config
        const speechConfig = sdk.SpeechConfig.fromSubscription(this.subscriptionKey, this.region);
        speechConfig.speechRecognitionLanguage = config?.language;
        // Create audio config from stream
        const audioFormat = sdk.AudioStreamFormat.getWaveFormatPCM(this.microphoneRate, 16, this.microphoneChannels);
        const pushStream = sdk.AudioInputStream.createPushStream(audioFormat);
        // Pipe microphone data to push stream
        this.ensureStream(micStream).on('data', (chunk) => {
            // Azure SDK expects an ArrayBuffer, convert Buffer while preserving view
            const arrayBuffer = chunk.buffer.slice(chunk.byteOffset, chunk.byteOffset + chunk.byteLength);
            pushStream.write(arrayBuffer);
            logger.silly(`piped ${chunk.length} bytes from microphone to Azure STT push stream`);
        });
        this.ensureStream(micStream).on('end', () => {
            pushStream.close();
            logger.silly('microphone stream ended, closed Azure STT push stream');
        });
        const audioConfig = sdk.AudioConfig.fromStreamInput(pushStream);
        // Create recognizer
        const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);
        if (!interimResults) {
            return new Promise((resolve, reject) => {
                recognizer.recognizeOnceAsync((result) => {
                    recognizer.close();
                    if (result.reason === sdk.ResultReason.RecognizedSpeech) {
                        logger.debug(`Azure STT recognized: ${result.text}`);
                        resolve(result.text.trim());
                    }
                    else if (result.reason === sdk.ResultReason.NoMatch) {
                        reject(new TJBotError('Azure STT: No speech could be recognized', {
                            code: 'stt.no-speech',
                        }));
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
        return new Promise((resolve, reject) => {
            let settled = false;
            let latestPartialTranscript = '';
            let latestFinalTranscript = '';
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
            const settleResolve = (text) => {
                if (settled) {
                    return;
                }
                settled = true;
                recognizer.stopContinuousRecognitionAsync(() => {
                    cleanup();
                    resolve(text);
                }, (error) => {
                    cleanup();
                    reject(new TJBotError('Azure STT stop recognition error', { cause: new Error(error) }));
                });
            };
            const settleReject = (error) => {
                if (settled) {
                    return;
                }
                settled = true;
                recognizer.stopContinuousRecognitionAsync(() => {
                    cleanup();
                    reject(error);
                }, () => {
                    cleanup();
                    reject(error);
                });
            };
            recognizer.recognizing = (_sender, event) => {
                const text = event.result?.text?.trim();
                if (text) {
                    latestPartialTranscript = text;
                    options.onPartialResult?.(text);
                }
            };
            recognizer.recognized = (_sender, event) => {
                if (event.result.reason === sdk.ResultReason.RecognizedSpeech) {
                    const text = event.result.text?.trim();
                    if (text) {
                        latestFinalTranscript = text;
                        logger.debug(`Azure STT recognized: ${text}`);
                        options.onFinalResult?.(text);
                        settleResolve(text);
                    }
                    return;
                }
                if (event.result.reason === sdk.ResultReason.NoMatch) {
                    settleReject(new TJBotError('Azure STT: No speech could be recognized', {
                        code: 'stt.no-speech',
                    }));
                }
            };
            recognizer.canceled = (_sender, event) => {
                const cancelReason = `${event.reason} - ${event.errorDetails || ''}`;
                const timeoutLikeEnd = isTimeoutLikeStreamEndReason(cancelReason);
                const fallbackTranscript = resolveTranscriptForStreamEnd({
                    finalTranscript: latestFinalTranscript,
                    partialTranscript: latestPartialTranscript,
                    allowPartialOnTimeoutLikeEnd: true,
                    timeoutLikeEnd,
                });
                if (fallbackTranscript) {
                    logger.debug('Azure STT finalized using partial transcript after cancel event');
                    options.onFinalResult?.(fallbackTranscript);
                    settleResolve(fallbackTranscript);
                    return;
                }
                if (timeoutLikeEnd) {
                    settleReject(new TJBotError('Azure STT: No speech could be recognized', {
                        code: 'stt.no-speech',
                    }));
                    return;
                }
                settleReject(new TJBotError(`Azure STT canceled: ${event.reason} - ${event.errorDetails}`));
            };
            recognizer.sessionStopped = () => {
                const fallbackTranscript = resolveTranscriptForStreamEnd({
                    finalTranscript: latestFinalTranscript,
                    partialTranscript: latestPartialTranscript,
                    allowPartialOnTimeoutLikeEnd: true,
                    timeoutLikeEnd: true,
                });
                if (fallbackTranscript) {
                    logger.debug('Azure STT finalized using partial transcript after session stop');
                    options.onFinalResult?.(fallbackTranscript);
                    settleResolve(fallbackTranscript);
                    return;
                }
                settleReject(new TJBotError('Azure STT: No speech could be recognized', {
                    code: 'stt.no-speech',
                }));
            };
            recognizer.startContinuousRecognitionAsync(() => {
                logger.silly('Azure STT continuous recognition started');
            }, (error) => {
                settleReject(new TJBotError('Azure STT start recognition error', { cause: new Error(error) }));
            });
        });
    }
}
//# sourceMappingURL=azure-stt.js.map