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
import type { TTSBackendAzureConfig } from '../../config/config-types.js';
import { loadAzureCredentials } from '../../utils/credentials.js';
import { TJBotError } from '../../utils/index.js';
import { LogEmoji } from '../../utils/logging.js';
import { TTSEngine } from '../tts-engine.js';

const EMO = LogEmoji.TTS;

/**
 * Azure Cognitive Services Text-to-Speech Engine
 *
 * Cloud-based speech synthesis using Microsoft Azure Speech Services.
 * Requires Azure subscription key and region to be configured.
 * @public
 */
export class AzureTTSEngine extends TTSEngine {
    private subscriptionKey?: string;
    private region?: string;

    async initialize(): Promise<void> {
        const config = this.config as TTSBackendAzureConfig;
        const credentials = loadAzureCredentials(config?.credentialsPath as string | undefined);
        this.subscriptionKey = credentials.speechKey;
        this.region = credentials.speechRegion;

        if (!config?.voice) {
            throw new TJBotError('Azure TTS voice not specified. Provide voice in speak.backend.azure-tts config.');
        }
        if (!this.subscriptionKey || !this.region) {
            throw new TJBotError('Azure Speech subscription key and region are required.');
        }

        winston.info(`${EMO} Azure TTS engine initialized`);
        winston.debug(`${EMO} Initialized AzureTTSEngine with config:
            voice: ${config?.voice},
            region: ${this.region},
            subscriptionKey: ${this.subscriptionKey ? '***' : 'not set'}`);
    }

    async synthesize(text: string): Promise<Buffer> {
        if (!this.subscriptionKey || !this.region) {
            throw new TJBotError('Azure TTS not initialized. Call initialize() first.');
        }

        this.validateText(text);

        try {
            const voiceName = this.config?.voice as string;
            if (!voiceName) {
                throw new TJBotError('Azure TTS voice not specified. Provide voice in speak config.');
            }

            winston.verbose(`${EMO} Synthesizing speech with Azure TTS (voice=${voiceName})`);

            // Create speech config
            const subscriptionKey = this.config?.subscriptionKey as string;
            const region = this.config?.region as string;
            const speechConfig = sdk.SpeechConfig.fromSubscription(subscriptionKey, region);
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
                            winston.debug(`${EMO} Azure TTS synthesis complete: ${audioData.length} bytes`);
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
            throw new TJBotError('Azure TTS synthesis failed', { cause: error as Error });
        }
    }
}
