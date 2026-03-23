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
import { protos as speechProtos, v2 as speechV2 } from '@google-cloud/speech';
import winston from 'winston';
import { loadGoogleCloudCredentials } from '../../utils/credentials.js';
import { TJBotError } from '../../utils/index.js';
import { LogEmoji } from '../../utils/logging.js';
import { STTEngine } from '../stt-engine.js';
const EMO = LogEmoji.STT;
const SUPPORTED_GOOGLE_STT_MODEL_REGIONS = {
    chirp_3: ['us', 'eu'],
    chirp_2: ['us-central1', 'europe-west4', 'asia-southeast1'],
};
function assertSupportedGoogleSTTModelAndRegion(model, region) {
    if (!(model in SUPPORTED_GOOGLE_STT_MODEL_REGIONS)) {
        throw new TJBotError(`Google Cloud STT model "${model}" is not supported. Supported models: ${Object.keys(SUPPORTED_GOOGLE_STT_MODEL_REGIONS).join(', ')}`);
    }
    const supportedRegions = [...SUPPORTED_GOOGLE_STT_MODEL_REGIONS[model]];
    if (!supportedRegions.includes(region)) {
        throw new TJBotError(`Google Cloud STT region "${region}" is not supported for model "${model}". Supported regions: ${supportedRegions.join(', ')}`);
    }
}
function toGoogleCloudRecognitionError(error, recognizerPath) {
    const googleError = error;
    const permission = googleError.errorInfoMetadata?.permission;
    const isPermissionDenied = googleError.code === 7 ||
        googleError.reason === 'IAM_PERMISSION_DENIED' ||
        permission === 'speech.recognizers.recognize';
    if (isPermissionDenied) {
        return new TJBotError(`Google Cloud STT permission denied for recognizer ${recognizerPath}. Ensure the credentials have the permission speech.recognizers.recognize on that recognizer resource and that the selected region matches the recognizer location.`, {
            code: 'stt.google-cloud.permission-denied',
            cause: error,
            context: {
                recognizer: recognizerPath,
                permission: permission ?? 'speech.recognizers.recognize',
                details: googleError.details,
            },
        });
    }
    return new TJBotError('Google Cloud STT recognition failed', {
        cause: error,
        context: {
            recognizer: recognizerPath,
            details: googleError.details,
        },
    });
}
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
        const model = config?.model?.trim();
        const languageCode = config?.languageCode?.trim();
        const region = config?.region?.trim();
        const endpoint = `${region}-speech.googleapis.com`;
        const enableAutomaticPunctuation = config?.enableAutomaticPunctuation ?? true;
        const profanityFilter = config?.profanityFilter ?? true;
        const interimResults = config?.interimResults ?? true;
        if (!model) {
            throw new TJBotError('Google Cloud STT model not specified. Provide model in listen.backend.google-cloud-stt config.');
        }
        if (!languageCode) {
            throw new TJBotError('Google Cloud STT languageCode not specified. Provide languageCode in listen.backend.google-cloud-stt config.');
        }
        if (!region) {
            throw new TJBotError('Google Cloud STT region not specified. Provide region in listen.backend.google-cloud-stt config.');
        }
        assertSupportedGoogleSTTModelAndRegion(model, region);
        this.microphoneRate = microphoneRate;
        this.microphoneChannels = microphoneChannels;
        this.client = new speechV2.SpeechClient({ apiEndpoint: endpoint });
        winston.info(`${EMO} Google Cloud STT engine initialized`);
        winston.debug(`${EMO} Initialized GoogleCloudSTTEngine with config:
            model: ${model},
            languageCode: ${languageCode},
            region: ${region},
            endpoint: ${endpoint},
            enableAutomaticPunctuation: ${enableAutomaticPunctuation},
            profanityFilter: ${profanityFilter},
            interimResults: ${interimResults},
            microphoneRate: ${this.microphoneRate},
            microphoneChannels: ${this.microphoneChannels},
            credentialsPath: ${credentials.credentialsPath}`);
    }
    async transcribe(micStream, options) {
        const config = this.config;
        const model = config?.model?.trim();
        const languageCode = config?.languageCode?.trim();
        const region = config?.region?.trim();
        const enableAutomaticPunctuation = config?.enableAutomaticPunctuation ?? true;
        const profanityFilter = config?.profanityFilter ?? true;
        const interimResults = config?.interimResults ?? true;
        if (!this.client) {
            throw new TJBotError('Google Cloud STT client not initialized. Call initialize() first.');
        }
        const client = this.client;
        if (!model) {
            throw new TJBotError('Google Cloud STT model not specified. Provide model in listen.backend.google-cloud-stt config.');
        }
        if (!languageCode) {
            throw new TJBotError('Google Cloud STT languageCode not specified. Provide languageCode in listen.backend.google-cloud-stt config.');
        }
        if (!region) {
            throw new TJBotError('Google Cloud STT region not specified. Provide region in listen.backend.google-cloud-stt config.');
        }
        assertSupportedGoogleSTTModelAndRegion(model, region);
        const projectId = await client.getProjectId();
        const recognizerPath = `projects/${projectId}/locations/${region}/recognizers/_`;
        winston.verbose(`${EMO} Transcribing speech with Google Cloud STT v2 (model=${model}, languageCode=${languageCode}, recognizer=${recognizerPath})`);
        const request = {
            config: {
                explicitDecodingConfig: {
                    encoding: speechProtos.google.cloud.speech.v2.ExplicitDecodingConfig.AudioEncoding.LINEAR16,
                    sampleRateHertz: this.microphoneRate,
                    audioChannelCount: this.microphoneChannels,
                },
                model,
                languageCodes: [languageCode],
                features: {
                    profanityFilter,
                    enableAutomaticPunctuation,
                },
            },
            streamingFeatures: {
                interimResults,
            },
        };
        winston.silly(`${EMO} Google Cloud STT params:`, JSON.stringify(request, null, 2));
        const sourceStream = this.ensureStream(micStream);
        return new Promise((resolve, reject) => {
            const recognizeStream = client._streamingRecognize();
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
            const handleMicData = (chunk) => {
                if (settled) {
                    return;
                }
                let audioChunk;
                if (typeof chunk === 'string') {
                    audioChunk = Buffer.from(chunk);
                }
                else if (Buffer.isBuffer(chunk)) {
                    audioChunk = chunk;
                }
                else {
                    audioChunk = Buffer.from(chunk);
                }
                try {
                    recognizeStream.write({
                        audio: audioChunk,
                    });
                }
                catch (err) {
                    const error = err instanceof Error ? err : new Error(String(err));
                    settleReject(toGoogleCloudRecognitionError(error, recognizerPath));
                }
            };
            const handleMicEnd = () => {
                if (!settled) {
                    recognizeStream.end();
                }
            };
            const handleMicError = (err) => {
                winston.error(`${EMO} Google Cloud STT microphone stream error:`, err);
                settleReject(new TJBotError('Google Cloud STT microphone stream failed', { cause: err }));
            };
            const handleError = (err) => {
                winston.error(`${EMO} Google Cloud STT stream error:`, err);
                settleReject(toGoogleCloudRecognitionError(err, recognizerPath));
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
                sourceStream.removeListener('data', handleMicData);
                sourceStream.removeListener('end', handleMicEnd);
                sourceStream.removeListener('error', handleMicError);
                recognizeStream.removeListener('data', handleData);
                recognizeStream.removeListener('error', handleError);
                recognizeStream.removeListener('close', handleEndWithoutTranscript);
                recognizeStream.removeListener('end', handleEndWithoutTranscript);
                recognizeStream.removeListener('status', handleStatus);
                try {
                    if (!recognizeStream.destroyed) {
                        recognizeStream.end();
                    }
                }
                catch (err) {
                    winston.debug(`${EMO} recognize stream end failed (likely already closed)`, err);
                }
                recognizeStream.destroy();
            };
            recognizeStream.on('data', handleData);
            recognizeStream.once('error', handleError);
            recognizeStream.once('close', handleEndWithoutTranscript);
            recognizeStream.once('end', handleEndWithoutTranscript);
            recognizeStream.on('status', handleStatus);
            try {
                recognizeStream.write({
                    recognizer: recognizerPath,
                    streamingConfig: request,
                });
            }
            catch (err) {
                const error = err instanceof Error ? err : new Error(String(err));
                settleReject(toGoogleCloudRecognitionError(error, recognizerPath));
                return;
            }
            sourceStream.on('data', handleMicData);
            sourceStream.once('end', handleMicEnd);
            sourceStream.once('error', handleMicError);
        });
    }
}
//# sourceMappingURL=google-cloud-stt.js.map