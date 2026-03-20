/**
 * Copyright 2025 IBM Corp. All Rights Reserved.
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
import SpeechToTextV1 from 'ibm-watson/speech-to-text/v1.js';
import winston from 'winston';
import { loadIBMWatsonCloudCredentials } from '../../utils/credentials.js';
import { TJBotError } from '../../utils/index.js';
import { LogEmoji } from '../../utils/logging.js';
import { STTEngine } from '../stt-engine.js';
const EMO = LogEmoji.STT;
/**
 * IBM Watson Speech-to-Text Engine
 *
 * Cloud-based speech recognition using IBM Watson Speech to Text service.
 * Requires IBM Cloud credentials to be configured in ibm-credentials.env file.
 * @public
 */
export class IBMWatsonSTTEngine extends STTEngine {
    microphoneRate = 44100;
    microphoneChannels = 2;
    sttService;
    async initialize(microphoneRate, microphoneChannels) {
        const config = this.config;
        loadIBMWatsonCloudCredentials(config?.credentialsPath);
        if (!config?.model) {
            throw new TJBotError('IBM Watson STT model not specified. Provide model in listen.backend.ibm-watson-stt config.');
        }
        this.microphoneRate = microphoneRate;
        this.microphoneChannels = microphoneChannels;
        this.sttService = new SpeechToTextV1({});
        winston.info(`${EMO} IBM Watson STT engine initialized`);
        winston.debug(`${EMO} Initialized IBMWatsonSTTEngine with config:
            model: ${config?.model},
            inactivityTimeout: ${config?.inactivityTimeout},
            backgroundAudioSuppression: ${config?.backgroundAudioSuppression},
            interimResults: ${config?.interimResults},
            microphoneRate: ${this.microphoneRate},
            microphoneChannels: ${this.microphoneChannels},
            credentialsPath: ${config?.credentialsPath}`);
    }
    async transcribe(micStream, options) {
        const config = this.config;
        if (!this.sttService) {
            throw new TJBotError('IBM Watson STT service not initialized. Call initialize() first.');
        }
        const model = config?.model;
        const inactivityTimeout = config?.inactivityTimeout ?? -1;
        const backgroundAudioSuppression = config?.backgroundAudioSuppression ?? 0.4;
        const interimResults = config?.interimResults ?? false;
        const params = {
            objectMode: true,
            contentType: `audio/l16; rate=${this.microphoneRate}; channels=${this.microphoneChannels}`,
            model,
            inactivityTimeout,
            interimResults,
            backgroundAudioSuppression,
        };
        winston.silly(`${EMO} IBM Watson STT params:`, JSON.stringify(params, null, 2));
        const recognizeStream = this.sttService.recognizeUsingWebSocket(params);
        // Pipe microphone to STT
        this.ensureStream(micStream).pipe(recognizeStream);
        return new Promise((resolve, reject) => {
            const handleData = (data) => {
                const payload = data;
                if (!payload.results || payload.results.length === 0) {
                    return;
                }
                const result = payload.results[0];
                if (!result.alternatives || result.alternatives.length === 0) {
                    return;
                }
                const transcript = result.alternatives[0].transcript?.trim();
                if (!transcript) {
                    return;
                }
                if (interimResults && !result.final) {
                    options.onPartialResult?.(transcript);
                    return;
                }
                if (result.final) {
                    winston.debug(`${EMO} IBM Watson STT recognized: ${transcript}`);
                    if (interimResults) {
                        options.onFinalResult?.(transcript);
                    }
                    cleanup();
                    resolve(transcript);
                }
            };
            const handleError = (err) => {
                winston.error(`${EMO} IBM Watson STT stream error:`, err);
                cleanup();
                reject(new TJBotError('IBM Watson STT recognition failed', { cause: err }));
            };
            const cleanup = () => {
                recognizeStream.removeListener('data', handleData);
                recognizeStream.removeListener('error', handleError);
                try {
                    this.ensureStream(micStream).unpipe(recognizeStream);
                }
                catch (err) {
                    winston.debug(`${EMO} mic unpipe failed (likely already closed)`, err);
                }
                if (typeof recognizeStream.destroy === 'function') {
                    recognizeStream.destroy();
                }
            };
            recognizeStream.on('data', handleData);
            recognizeStream.once('error', handleError);
        });
    }
}
//# sourceMappingURL=ibm-watson-stt.js.map