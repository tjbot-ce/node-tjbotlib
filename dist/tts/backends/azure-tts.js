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
    subscriptionKey;
    region;
    async initialize() {
        const config = this.config;
        const credentials = loadAzureCredentials(config?.credentialsPath);
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
    async synthesize(text) {
        if (!this.subscriptionKey || !this.region) {
            throw new TJBotError('Azure TTS not initialized. Call initialize() first.');
        }
        this.validateText(text);
        try {
            const voiceName = this.config?.voice;
            if (!voiceName) {
                throw new TJBotError('Azure TTS voice not specified. Provide voice in speak config.');
            }
            winston.verbose(`${EMO} Synthesizing speech with Azure TTS (voice=${voiceName})`);
            // Create speech config
            const speechConfig = sdk.SpeechConfig.fromSubscription(this.subscriptionKey, this.region);
            speechConfig.speechSynthesisVoiceName = voiceName;
            speechConfig.speechSynthesisOutputFormat = sdk.SpeechSynthesisOutputFormat.Riff24Khz16BitMonoPcm;
            // Create synthesizer with null audio config to get result in memory
            const synthesizer = new sdk.SpeechSynthesizer(speechConfig, undefined);
            return new Promise((resolve, reject) => {
                synthesizer.speakTextAsync(text, (result) => {
                    synthesizer.close();
                    if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
                        const audioData = Buffer.from(result.audioData);
                        winston.debug(`${EMO} Azure TTS synthesis complete: ${audioData.length} bytes`);
                        resolve(audioData);
                    }
                    else if (result.reason === sdk.ResultReason.Canceled) {
                        const cancellation = sdk.SpeechSynthesisCancellationDetails.fromResult(result);
                        reject(new TJBotError(`Azure TTS canceled: ${cancellation.reason} - ${cancellation.errorDetails}`));
                    }
                    else {
                        reject(new TJBotError(`Azure TTS synthesis failed with reason: ${result.reason}`));
                    }
                }, (error) => {
                    synthesizer.close();
                    reject(new TJBotError(`Azure TTS synthesis error: ${error}`));
                });
            });
        }
        catch (error) {
            throw new TJBotError('Azure TTS synthesis failed', { cause: error });
        }
    }
}
//# sourceMappingURL=azure-tts.js.map