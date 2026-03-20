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
import winston from 'winston';
import { TJBotError } from '../utils/errors.js';
import { LogEmoji } from '../utils/logging.js';
import { createSTTEngine } from './stt-engine.js';
const EMO = LogEmoji.STT;
/**
 * STT controller manages speech-to-text synthesis and engine lifecycle.
 * STT engine is eagerly initialized during setupMicrophone() and cached for reuse.
 */
export class STTController {
    sttEngine;
    microphoneController;
    listenConfig;
    constructor(microphoneController) {
        this.sttEngine = undefined;
        this.microphoneController = microphoneController;
    }
    /**
     * Initialize the STT backend
     * Called during setupMicrophone to eagerly load STT engine
     * @param config Configuration object with backend, IBM settings, and Sherpa settings
     */
    async initialize(config) {
        this.listenConfig = config;
        this.sttEngine = await createSTTEngine(this.listenConfig);
        const microphoneRate = this.listenConfig.microphoneRate;
        const microphoneChannels = this.listenConfig.microphoneChannels;
        winston.debug(`${EMO} Initializing STT engine with microphone settings: rate=${microphoneRate}, channels=${microphoneChannels}`);
        await this.sttEngine.initialize(microphoneRate, microphoneChannels);
    }
    /**
     * Transcribe audio from a microphone stream.
     * Lazily initializes the STT engine on first call.
     * Manages the microphone lifecycle (start/stop) internally.
     *
     * @returns The transcribed text
     */
    async transcribe(options) {
        if (this.listenConfig === undefined) {
            throw new TJBotError('STT engine not initialized. Call initialize() before transcribing.');
        }
        if (this.sttEngine === undefined) {
            throw new TJBotError('STT engine not initialized. Call initialize() before transcribing.');
        }
        while (true) {
            // Start microphone
            this.microphoneController.start();
            try {
                const micStream = this.microphoneController.getInputStream();
                const transcript = await this.sttEngine.transcribe(micStream, {
                    onPartialResult: options?.onPartialResult,
                    onFinalResult: options?.onFinalResult,
                    abortSignal: options?.abortSignal,
                });
                winston.debug(`${EMO} Transcript: ${transcript}`);
                return transcript;
            }
            catch (error) {
                if (this.isNoSpeechError(error)) {
                    winston.verbose(`${EMO} No speech detected; continuing to listen`);
                    continue;
                }
                throw error;
            }
            finally {
                // Pause between utterances so repeated listen() calls can reuse the live stream.
                this.microphoneController.pause();
            }
        }
    }
    isNoSpeechError(error) {
        return error instanceof TJBotError && error.code === 'stt.no-speech';
    }
    /**
     * Clean up STT resources.
     */
    async cleanup() {
        if (this.sttEngine) {
            winston.debug(`${EMO} STTController cleanup`);
            await this.sttEngine.cleanup?.();
            this.sttEngine = undefined;
        }
    }
}
//# sourceMappingURL=stt.js.map