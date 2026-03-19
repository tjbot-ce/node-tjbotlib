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
import { STTEngine } from '../stt-engine.js';
const EMO = LogEmoji.STT;
/**
 * Azure Cognitive Services Speech-to-Text Engine
 *
 * Cloud-based speech recognition using Microsoft Azure Speech Services.
 * Requires Azure subscription key and region to be configured.
 * @public
 */
export class AzureSTTEngine extends STTEngine {
    subscriptionKey;
    region;
    async initialize() {
        const config = this.config;
        this.loadCredentials(config);
        if (!this.subscriptionKey || !this.region) {
            throw new TJBotError('Azure Speech subscription key and region are required');
        }
        winston.info(`${EMO} Azure STT engine initialized`);
        winston.debug(`${EMO} Initialized AzureSTTEngine with config:
            region: ${this.region},
            subscriptionKey: ${this.subscriptionKey ? '***' : 'not set'}
        `);
    }
    loadCredentials(config) {
        const credentials = loadAzureCredentials(config?.credentialsPath);
        this.subscriptionKey = credentials.speechKey;
        this.region = credentials.speechRegion;
        return;
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
        // Create audio config from stream
        const audioFormat = sdk.AudioStreamFormat.getWaveFormatPCM(sampleRate, 16, 1);
        const pushStream = sdk.AudioInputStream.createPushStream(audioFormat);
        // Pipe microphone data to push stream
        this.ensureStream(micStream).on('data', (chunk) => {
            // Azure SDK expects an ArrayBuffer, convert Buffer while preserving view
            const arrayBuffer = chunk.buffer.slice(chunk.byteOffset, chunk.byteOffset + chunk.byteLength);
            pushStream.write(arrayBuffer);
            winston.silly(`${EMO} piped ${chunk.length} bytes from microphone to Azure STT push stream`);
        });
        this.ensureStream(micStream).on('end', () => {
            pushStream.close();
            winston.silly(`${EMO} microphone stream ended, closed Azure STT push stream`);
        });
        const audioConfig = sdk.AudioConfig.fromStreamInput(pushStream);
        // Create recognizer
        const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);
        return new Promise((resolve, reject) => {
            recognizer.recognizeOnceAsync((result) => {
                recognizer.close();
                if (result.reason === sdk.ResultReason.RecognizedSpeech) {
                    winston.debug(`${EMO} Azure STT recognized: ${result.text}`);
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