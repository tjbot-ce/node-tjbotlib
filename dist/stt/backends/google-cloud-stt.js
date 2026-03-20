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
import { SpeechClient, protos as speechProtos } from '@google-cloud/speech';
import winston from 'winston';
import { loadGoogleCloudCredentials } from '../../utils/credentials.js';
import { TJBotError } from '../../utils/index.js';
import { LogEmoji } from '../../utils/logging.js';
import { STTEngine } from '../stt-engine.js';
const EMO = LogEmoji.STT;
/**
 * Google Cloud Speech-to-Text Engine
 *
 * Cloud-based speech recognition using Google Cloud Speech-to-Text API.
 * Requires Google Cloud credentials JSON file to be configured.
 * @public
 */
export class GoogleCloudSTTEngine extends STTEngine {
    microphoneRate = 44100;
    microphoneChannels = 2;
    client;
    async initialize(microphoneRate, microphoneChannels) {
        const config = this.config;
        const credentials = loadGoogleCloudCredentials(config?.credentialsPath);
        if (!config?.model) {
            throw new TJBotError('Google Cloud STT model not specified. Provide model in listen.backend.google-cloud-stt config.');
        }
        if (!config?.languageCode) {
            throw new TJBotError('Google Cloud STT languageCode not specified. Provide languageCode in listen.backend.google-cloud-stt config.');
        }
        this.microphoneRate = microphoneRate;
        this.microphoneChannels = microphoneChannels;
        this.client = new SpeechClient();
        winston.info(`${EMO} Google Cloud STT engine initialized`);
        winston.debug(`${EMO} Initialized GoogleCloudSTTEngine with config:
            model: ${config?.model},
            languageCode: ${config?.languageCode},
            enableAutomaticPunctuation: ${config?.enableAutomaticPunctuation},
            profanityFilter: ${config?.profanityFilter},
            interimResults: ${config?.interimResults},
            microphoneRate: ${this.microphoneRate},
            microphoneChannels: ${this.microphoneChannels},
            credentialsPath: ${credentials.credentialsPath}`);
    }
    async transcribe(micStream, options) {
        const config = this.config;
        if (!this.client) {
            throw new TJBotError('Google Cloud STT client not initialized. Call initialize() first.');
        }
        const model = config?.model;
        const languageCode = config?.languageCode;
        const enableAutomaticPunctuation = config?.enableAutomaticPunctuation ?? true;
        const profanityFilter = config?.profanityFilter ?? true;
        const interimResults = config?.interimResults ?? true;
        winston.verbose(`${EMO} Transcribing speech with Google Cloud STT (model=${model}, languageCode=${languageCode})`);
        const request = {
            config: {
                encoding: speechProtos.google.cloud.speech.v1.RecognitionConfig.AudioEncoding.LINEAR16,
                sampleRateHertz: this.microphoneRate,
                audioChannelCount: this.microphoneChannels,
                model,
                languageCode,
                profanityFilter,
                enableAutomaticPunctuation,
            },
            interimResults,
        };
        winston.silly(`${EMO} Google Cloud STT params:`, JSON.stringify(request, null, 2));
        // Create a recognize stream
        const recognizeStream = this.client.streamingRecognize(request);
        // Pipe microphone to recognition stream
        this.ensureStream(micStream).pipe(recognizeStream);
        return new Promise((resolve, reject) => {
            let settled = false;
            const settleResolve = (transcript) => {
                if (settled) {
                    return;
                }
                settled = true;
                cleanup();
                resolve(transcript);
            };
            const settleReject = (error) => {
                if (settled) {
                    return;
                }
                settled = true;
                cleanup();
                reject(error);
            };
            const handleData = (data) => {
                if (data.results && data.results.length > 0) {
                    const result = data.results[0];
                    if (!result.alternatives || result.alternatives.length === 0) {
                        return;
                    }
                    const transcript = result.alternatives[0].transcript?.trim();
                    if (!transcript) {
                        return;
                    }
                    if (interimResults && !result.isFinal) {
                        options.onPartialResult?.(transcript);
                        return;
                    }
                    if (result.isFinal) {
                        winston.debug(`${EMO} Google Cloud STT recognized: ${transcript}`);
                        if (interimResults) {
                            options.onFinalResult?.(transcript);
                        }
                        settleResolve(transcript);
                    }
                }
            };
            const handleError = (err) => {
                winston.error(`${EMO} Google Cloud STT stream error:`, err);
                settleReject(new TJBotError('Google Cloud STT recognition failed', { cause: err }));
            };
            const handleEndWithoutTranscript = () => {
                settleReject(new TJBotError('Google Cloud STT: No speech could be recognized', {
                    code: 'stt.no-speech',
                }));
            };
            const handleStatus = (status) => {
                if (status.code === 0 || status.code === undefined) {
                    return;
                }
                settleReject(new TJBotError(`Google Cloud STT recognition failed: ${status.details || 'unknown error'}`, {
                    cause: new Error(`gRPC status ${String(status.code)}: ${status.details || 'unknown error'}`),
                }));
            };
            const cleanup = () => {
                recognizeStream.removeListener('data', handleData);
                recognizeStream.removeListener('error', handleError);
                recognizeStream.removeListener('close', handleEndWithoutTranscript);
                recognizeStream.removeListener('end', handleEndWithoutTranscript);
                recognizeStream.removeListener('status', handleStatus);
                try {
                    this.ensureStream(micStream).unpipe(recognizeStream);
                }
                catch (err) {
                    winston.debug(`${EMO} mic unpipe failed (likely already closed)`, err);
                }
                recognizeStream.destroy();
            };
            recognizeStream.on('data', handleData);
            recognizeStream.once('error', handleError);
            recognizeStream.once('close', handleEndWithoutTranscript);
            recognizeStream.once('end', handleEndWithoutTranscript);
            recognizeStream.on('status', handleStatus);
        });
    }
}
//# sourceMappingURL=google-cloud-stt.js.map