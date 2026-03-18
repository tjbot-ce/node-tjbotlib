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

import RecognizeStream from 'ibm-watson/lib/recognize-stream.js';
import SpeechToTextV1 from 'ibm-watson/speech-to-text/v1.js';
import winston from 'winston';
import type { STTBackendIBMWatsonConfig } from '../../config/config-types.js';
import { ListenConfig } from '../../config/index.js';
import { loadCredentials } from '../../utils/backends/ibm-watson.js';
import { TJBotError } from '../../utils/index.js';
import { LogEmoji } from '../../utils/logging.js';
import { STTEngine, STTRequestOptions } from '../stt-engine.js';

const EMO = LogEmoji.STT;

/**
 * IBM Watson Speech-to-Text Engine
 *
 * Cloud-based speech recognition using IBM Watson Speech to Text service.
 * Requires IBM Cloud credentials to be configured in ibm-credentials.env file.
 * @public
 */
export class IBMWatsonSTTEngine extends STTEngine {
    private sttService: SpeechToTextV1 | undefined;

    async initialize(): Promise<void> {
        const config = this.config as STTBackendIBMWatsonConfig;
        const credentialsPath = config?.credentialsPath;
        loadCredentials(credentialsPath);

        this.sttService = new SpeechToTextV1({});
        winston.info(`${EMO} IBM Watson STT engine initialized`);
        winston.debug(`${EMO} Initialized IBMWatsonSTTEngine with config:
            credentialsPath: ${credentialsPath}`);
    }

    async transcribe(micStream: NodeJS.ReadableStream, options: STTRequestOptions): Promise<string> {
        if (!this.sttService) {
            throw new TJBotError('IBM Watson STT service not initialized. Call initialize() first.');
        }

        const listenConfig: ListenConfig = options.listenConfig ?? {};
        const backendConfig = (listenConfig.backend?.['ibm-watson-stt'] ?? {}) as STTBackendIBMWatsonConfig;

        const rate: number = (listenConfig.microphoneRate as number) ?? 44100;
        const channels: number = (listenConfig.microphoneChannels as number) ?? 2;
        const inactivityTimeout: number =
            backendConfig.inactivityTimeout ?? (listenConfig.inactivityTimeout as number) ?? -1;
        const backgroundAudioSuppression: number =
            backendConfig.backgroundAudioSuppression ?? (listenConfig.backgroundAudioSuppression as number) ?? 0.4;
        const model: string = backendConfig.model ?? (listenConfig.model as string);
        if (!model) {
            throw new TJBotError('IBM Watson STT model not specified. Provide model in listen config.');
        }
        const interimResults: boolean = backendConfig.interimResults ?? false;

        const params = {
            objectMode: false,
            contentType: `audio/l16; rate=${rate}; channels=${channels}`,
            model,
            inactivityTimeout,
            interimResults,
            backgroundAudioSuppression,
        };

        winston.silly(`${EMO} IBM Watson STT params:`, JSON.stringify(params, null, 2));

        const recognizeStream: RecognizeStream = this.sttService.recognizeUsingWebSocket(params) as RecognizeStream;
        recognizeStream.setEncoding('utf8');

        // Pipe microphone to STT
        this.ensureStream(micStream).pipe(recognizeStream);

        return new Promise<string>((resolve, reject) => {
            const handleData = (data: string) => {
                winston.debug(`${EMO} IBM Watson STT recognized: ${data.trim()}`);
                cleanup();
                resolve(data.trim());
            };

            const handleError = (err: Error) => {
                winston.error(`${EMO} IBM Watson STT stream error:`, err);
                cleanup();
                reject(err);
            };

            const cleanup = () => {
                recognizeStream.removeListener('data', handleData);
                recognizeStream.removeListener('error', handleError);
                try {
                    this.ensureStream(micStream).unpipe(recognizeStream);
                } catch (err) {
                    winston.debug(`${EMO} mic unpipe failed (likely already closed)`, err as Error);
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
