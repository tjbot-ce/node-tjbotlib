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
import temp from 'temp';
import fs from 'fs';
import { TTSEngine, createTTSEngine } from './tts-engine.js';
import { SpeakerController } from '../speaker/index.js';

/**
 * TTS Controller for TJBot
 * Manages text-to-speech synthesis and engine lifecycle.
 * TTS engine is eagerly initialized during setupSpeaker() and cached for reuse.
 * Delegates audio playback to SpeakerController.
 */
export class TTSController {
    private ttsEngine: TTSEngine | undefined;
    private ttsBackend: 'local' | 'ibm-watson-tts' | 'google-cloud-tts' | 'azure-tts';
    private speakConfig: Record<string, unknown>;
    private speakerController: SpeakerController;

    constructor(speakerController: SpeakerController) {
        this.ttsEngine = undefined;
        this.ttsBackend = 'local';
        this.speakConfig = {};
        this.speakerController = speakerController;
    }

    /**
     * Initialize the TTS backend
     * Called during setupSpeaker to eagerly load TTS engine
     * @param config Configuration object with backend, IBM settings, and Sherpa settings
     */
    async initialize(config: Record<string, unknown>): Promise<void> {
        try {
            // Cache the config for later use
            this.speakConfig = config;

            const backendConfig = config.backend as
                | {
                      type?: string;
                      'ibm-watson-tts'?: { voice?: string };
                      'google-cloud-tts'?: { voice?: string };
                      'azure-tts'?: { voice?: string };
                  }
                | undefined;
            const backend = backendConfig?.type ?? 'local';
            this.ttsBackend = backend as 'local' | 'ibm-watson-tts' | 'google-cloud-tts' | 'azure-tts';

            // Use factory to create engine
            this.ttsEngine = await createTTSEngine(config);
            await this.ttsEngine.initialize();
        } catch (error) {
            winston.error('Failed to initialize TTS backend:', error);
            throw error;
        }
    }

    /**
     * Synthesize text to speech and play the audio.
     * Lazily initializes the TTS engine on first call.
     *
     * @param text The text to speak
     * @param config The speak configuration with TTS backend settings
     */
    async speak(text: string, config: Record<string, unknown>): Promise<void> {
        // Initialize TTS engine lazily on first call
        if (this.ttsEngine === undefined) {
            winston.verbose('💬 Initializing TTS engine...');
            await this.initialize(config);
        }

        if (!text || text.trim().length === 0) {
            winston.error('🔈 TJBot tried to speak an empty message.');
            return;
        }

        try {
            // Synthesize audio - voice is configured at engine initialization time
            if (!this.ttsEngine) {
                throw new Error('TTS engine is not initialized');
            }

            winston.verbose('💬 Synthesizing speech...');
            const audioBuffer = await this.ttsEngine.synthesize(text);

            // Write to temporary file
            const info = temp.openSync('tjbot');
            winston.debug(`🔈 writing audio buffer to temp file: ${info.path}`);

            const fd = fs.createWriteStream(info.path);
            fd.write(audioBuffer);

            // Wait for file to be written
            const writePromise: Promise<void> = new Promise((resolve, reject) => {
                fd.on('close', () => resolve());
                fd.on('error', () => reject());
            });

            fd.end();
            await writePromise;

            // Play the audio file
            await this.speakerController.playAudio(info.path);

            // Clean up temp file
            try {
                fs.unlinkSync(info.path);
            } catch (err) {
                winston.debug('🔈 Could not delete temp audio file:', err);
            }
        } catch (error) {
            winston.error('🔈 Error during speech synthesis:', error);
            throw error;
        }
    }

    /**
     * Eagerly initialize the TTS engine.
     */
    async ensureEngineInitialized(config: Record<string, unknown>): Promise<void> {
        if (this.ttsEngine === undefined) {
            await this.initialize(config);
        }
    }

    /**
     * Clean up TTS resources.
     */
    async cleanup(): Promise<void> {
        if (this.ttsEngine) {
            await this.ttsEngine.cleanup?.();
            this.ttsEngine = undefined;
        }
    }
}
