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
import TextToSpeechV1 from 'ibm-watson/text-to-speech/v1.js';
import winston from 'winston';
import { loadIBMWatsonCloudCredentials } from '../../utils/credentials.js';
import { TJBotError } from '../../utils/index.js';
import { LogEmoji } from '../../utils/logging.js';
import { TTSEngine } from '../tts-engine.js';
const EMO = LogEmoji.TTS;
/**
 * IBM Watson Text-to-Speech Engine
 *
 * Cloud-based speech synthesis using IBM Watson Text to Speech service.
 * Requires IBM Cloud credentials to be configured in ibm-credentials.env file.
 * @public
 */
export class IBMTTSEngine extends TTSEngine {
    ttsService;
    /**
     * Initialize the IBM Watson TTS service.
     * Creates a new TextToSpeechV1 instance.
     */
    async initialize(config) {
        loadIBMWatsonCloudCredentials(config?.credentialsPath);
        this.ttsService = new TextToSpeechV1({});
        winston.info(`${EMO} IBM Watson TTS engine initialized`);
        winston.debug(`${EMO} Initialized IBMWatsonTTSEngine with config:
            credentialsPath: ${config?.credentialsPath ?? ''}`);
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
        if (!this.ttsService) {
            throw new TJBotError('IBM Watson TTS service not initialized. Call initialize() first.');
        }
        this.validateText(text);
        try {
            // Use voice from configuration
            const voiceName = this.config?.voice;
            if (!voiceName) {
                throw new TJBotError('IBM Watson TTS voice not specified. Provide voice in speak config.');
            }
            const params = {
                text,
                voice: voiceName,
                accept: 'audio/wav',
            };
            winston.verbose(`${EMO} Synthesizing speech with IBM Watson TTS (voice=${voiceName})`);
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
                    winston.debug(`${EMO} IBM Watson TTS synthesis complete: ${buffer.length} bytes`);
                    resolve(buffer);
                });
                response.result.on('error', (err) => {
                    winston.error(`${EMO} Error during IBM Watson TTS synthesis:`, err);
                    reject(err);
                });
            });
        }
        catch (error) {
            throw new TJBotError('IBM Watson TTS synthesis failed', { cause: error });
        }
    }
}
//# sourceMappingURL=ibm-watson-tts.js.map