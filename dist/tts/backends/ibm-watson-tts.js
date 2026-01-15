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
import TextToSpeechV1 from 'ibm-watson/text-to-speech/v1.js';
import winston from 'winston';
import { TTSEngine } from '../tts-engine.js';
import { TJBotError } from '../../utils/index.js';
/**
 * IBM Watson Text-to-Speech Engine
 *
 * Cloud-based speech synthesis using IBM Watson Text to Speech service.
 * Requires IBM Cloud credentials to be configured in ibm-credentials.env file.
 * @public
 */
export class IBMTTSEngine extends TTSEngine {
    constructor(config) {
        super(config);
    }
    /**
     * Initialize the IBM Watson TTS service.
     * Creates a new TextToSpeechV1 instance.
     */
    async initialize() {
        try {
            const credentialsPath = this.config?.credentialsPath;
            this.loadCredentials(credentialsPath);
            this.ttsService = new TextToSpeechV1({});
            winston.info('🔈 IBM Watson TTS engine initialized');
        }
        catch (error) {
            winston.error('Failed to initialize IBM Watson TTS:', error);
            throw error;
        }
    }
    loadCredentials(credentialsPath) {
        let resolvedPath = credentialsPath;
        // If no path provided, check default locations in order
        if (!resolvedPath) {
            // 1. Check CWD
            const cwdPath = path.join(process.cwd(), 'ibm-credentials.env');
            if (fs.existsSync(cwdPath)) {
                resolvedPath = cwdPath;
            }
            else {
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
                winston.debug(`🔈 Loaded IBM credentials from: ${resolvedPath}`);
            }
            catch (err) {
                winston.error(`Failed to load IBM credentials from ${resolvedPath}:`, err);
                throw err;
            }
        }
        else {
            throw new TJBotError('IBM Watson TTS credentials not found. Place credentials at: ./ibm-credentials.env or ~/.tjbot/ibm-credentials.env');
        }
    }
    /**
     * Synthesize text to WAV audio using IBM Watson TTS.
     * Voice is configured at engine initialization time via config.
     *
     * @param text - Text to synthesize
     * @returns WAV audio buffer
     * @throws Error if service is not initialized or synthesis fails
     */
    async synthesize(text) {
        this.validateText(text);
        if (!this.ttsService) {
            throw new TJBotError('IBM Watson TTS service not initialized. Call initialize() first.');
        }
        try {
            // Use voice from configuration
            const voiceToUse = this.config?.voice ?? 'en-US_MichaelV3Voice';
            winston.debug(`🔈 Synthesizing with IBM Watson TTS: voice=${voiceToUse}`);
            const params = {
                text,
                voice: voiceToUse,
                accept: 'audio/wav',
            };
            const response = await this.ttsService.synthesize(params);
            if (!response.result) {
                throw new TJBotError('No audio data returned from IBM Watson TTS');
            }
            // Convert the readable stream to a buffer
            const chunks = [];
            return new Promise((resolve, reject) => {
                response.result.on('data', (chunk) => {
                    chunks.push(Buffer.from(chunk));
                });
                response.result.on('end', () => {
                    const buffer = Buffer.concat(chunks);
                    winston.debug(`🔈 IBM Watson TTS synthesis complete: ${buffer.length} bytes`);
                    resolve(buffer);
                });
                response.result.on('error', (err) => {
                    winston.error('Error during IBM Watson TTS synthesis:', err);
                    reject(err);
                });
            });
        }
        catch (error) {
            winston.error('IBM Watson TTS synthesis failed:', error);
            throw error;
        }
    }
}
//# sourceMappingURL=ibm-watson-tts.js.map