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
    sttService;
    async initialize() {
        const config = this.config;
        loadIBMWatsonCloudCredentials(config?.credentialsPath);
        this.sttService = new SpeechToTextV1({});
        winston.info(`${EMO} IBM Watson STT engine initialized`);
        winston.debug(`${EMO} Initialized IBMWatsonSTTEngine with config:
            credentialsPath: ${config?.credentialsPath}`);
    }
    async transcribe(micStream, options) {
        if (!this.sttService) {
            throw new TJBotError('IBM Watson STT service not initialized. Call initialize() first.');
        }
        const listenConfig = options.listenConfig ?? {};
        const backendConfig = (listenConfig.backend?.['ibm-watson-stt'] ?? {});
        const rate = listenConfig.microphoneRate ?? 44100;
        const channels = listenConfig.microphoneChannels ?? 2;
        const inactivityTimeout = backendConfig.inactivityTimeout ?? listenConfig.inactivityTimeout ?? -1;
        const backgroundAudioSuppression = backendConfig.backgroundAudioSuppression ?? listenConfig.backgroundAudioSuppression ?? 0.4;
        const model = backendConfig.model ?? listenConfig.model;
        if (!model) {
            throw new TJBotError('IBM Watson STT model not specified. Provide model in listen config.');
        }
        const interimResults = backendConfig.interimResults ?? false;
        const params = {
            objectMode: false,
            contentType: `audio/l16; rate=${rate}; channels=${channels}`,
            model,
            inactivityTimeout,
            interimResults,
            backgroundAudioSuppression,
        };
        winston.silly(`${EMO} IBM Watson STT params:`, JSON.stringify(params, null, 2));
        const recognizeStream = this.sttService.recognizeUsingWebSocket(params);
        recognizeStream.setEncoding('utf8');
        // Pipe microphone to STT
        this.ensureStream(micStream).pipe(recognizeStream);
        return new Promise((resolve, reject) => {
            const handleData = (data) => {
                winston.debug(`${EMO} IBM Watson STT recognized: ${data.trim()}`);
                cleanup();
                resolve(data.trim());
            };
            const handleError = (err) => {
                winston.error(`${EMO} IBM Watson STT stream error:`, err);
                cleanup();
                reject(err);
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
            recognizeStream.once('data', handleData);
            recognizeStream.once('error', handleError);
        });
    }
}
//# sourceMappingURL=ibm-watson-stt.js.map