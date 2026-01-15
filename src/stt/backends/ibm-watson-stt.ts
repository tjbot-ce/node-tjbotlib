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

import fs from 'fs';
import os from 'os';
import path from 'path';
import RecognizeStream from 'ibm-watson/lib/recognize-stream.js';
import SpeechToTextV1 from 'ibm-watson/speech-to-text/v1.js';
import winston from 'winston';
import { STTEngine, STTRequestOptions } from '../stt-engine.js';
import { ListenConfig } from '../../config/index.js';
import { TJBotError } from '../../utils/index.js';

interface IBMWatsonSTTConfig {
    model?: string;
    inactivityTimeout?: number;
    backgroundAudioSuppression?: number;
    interimResults?: boolean;
    credentialsPath?: string;
}

/**
 * IBM Watson Speech-to-Text Engine
 *
 * Cloud-based speech recognition using IBM Watson Speech to Text service.
 * Requires IBM Cloud credentials to be configured in ibm-credentials.env file.
 * @public
 */
export class IBMWatsonSTTEngine extends STTEngine {
    private sttService: SpeechToTextV1 | undefined;

    constructor(config?: Record<string, unknown>) {
        super(config);
    }

    async initialize(): Promise<void> {
        try {
            const config = this.config as IBMWatsonSTTConfig | undefined;
            const credentialsPath = config?.credentialsPath;
            // Load IBM credentials from file
            this.loadCredentials(credentialsPath);
            this.sttService = new SpeechToTextV1({});
            winston.debug('🗣️ IBM Watson STT engine initialized');
        } catch (err) {
            winston.error('Failed to initialize IBM Watson STT:', err);
            throw err;
        }
    }

    private loadCredentials(credentialsPath?: string): void {
        let resolvedPath: string | undefined = credentialsPath;

        // If no path provided, check default locations in order
        if (!resolvedPath) {
            // 1. Check CWD
            const cwdPath = path.join(process.cwd(), 'ibm-credentials.env');
            if (fs.existsSync(cwdPath)) {
                resolvedPath = cwdPath;
            } else {
                // 2. Check ~/.tjbot/ibm-credentials.env
                const homePath = path.join(os.homedir(), '.tjbot', 'ibm-credentials.env');
                if (fs.existsSync(homePath)) {
                    resolvedPath = homePath;
                }
            }
        }

        // If path is specified (either provided or found), load credentials
        if (resolvedPath) {
            try {
                if (!fs.existsSync(resolvedPath)) {
                    throw new TJBotError(`IBM credentials file not found at: ${resolvedPath}`);
                }
                const credentialsContent = fs.readFileSync(resolvedPath, 'utf-8');
                credentialsContent.split('\n').forEach((line) => {
                    line = line.trim();
                    if (line && !line.startsWith('#')) {
                        const [key, ...valueParts] = line.split('=');
                        if (key) {
                            process.env[key.trim()] = valueParts.join('=').trim();
                        }
                    }
                });
                winston.debug(`🗣️ Loaded IBM credentials from: ${resolvedPath}`);
            } catch (err) {
                winston.error(`Failed to load IBM credentials from ${resolvedPath}:`, err);
                throw err;
            }
        } else {
            throw new TJBotError(
                'IBM Watson STT credentials not found. Place credentials at: ./ibm-credentials.env or ~/.tjbot/ibm-credentials.env'
            );
        }
    }

    async transcribe(micStream: NodeJS.ReadableStream, options: STTRequestOptions): Promise<string> {
        if (!this.sttService) {
            throw new TJBotError('IBM Watson STT service not initialized. Call initialize() first.');
        }

        const listenConfig: ListenConfig = options.listenConfig ?? {};
        const backendConfig = (listenConfig.backend?.['ibm-watson-stt'] ?? {}) as IBMWatsonSTTConfig;

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

        winston.debug(`🎤 recognizeUsingWebSocket params: ${JSON.stringify(params)}`);

        const recognizeStream: RecognizeStream = this.sttService.recognizeUsingWebSocket(params) as RecognizeStream;
        recognizeStream.setEncoding('utf8');

        // Pipe microphone to STT
        this.ensureStream(micStream).pipe(recognizeStream);

        return new Promise<string>((resolve, reject) => {
            const handleData = (data: string) => {
                cleanup();
                resolve(data.trim());
            };

            const handleError = (err: Error) => {
                cleanup();
                reject(err);
            };

            const cleanup = () => {
                recognizeStream.removeListener('data', handleData);
                recognizeStream.removeListener('error', handleError);
                try {
                    this.ensureStream(micStream).unpipe(recognizeStream);
                } catch (err) {
                    winston.debug('🎤 mic unpipe failed (likely already closed)', err as Error);
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
