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
import temp from 'temp';
import winston from 'winston';
import { LogEmoji } from '../utils/logging.js';
import { createTTSEngine } from './tts-engine.js';
import { TJBotError } from '../utils/errors.js';
const EMO = LogEmoji.TTS;
/**
 * TTS controller manages text-to-speech synthesis and engine lifecycle.
 * TTS engine is eagerly initialized during setupSpeaker() and cached for reuse.

 */
export class TTSController {
    ttsEngine;
    speakerController;
    speakConfig;
    constructor(speakerController) {
        this.ttsEngine = undefined;
        this.speakerController = speakerController;
    }
    /**
     * Initialize the TTS backend
     * Called during setupSpeaker to eagerly load TTS engine
     * @param config Configuration object with backend, IBM settings, and Sherpa settings
     */
    async initialize(config) {
        this.speakConfig = config;
        this.ttsEngine = await createTTSEngine(config);
        await this.ttsEngine.initialize();
    }
    /**
     * Synthesize text to speech and play the audio.
     * Lazily initializes the TTS engine on first call.
     *
     * @param text The text to speak
     */
    async speak(text) {
        if (this.ttsEngine === undefined) {
            throw new TJBotError('TTS engine not initialized. Call initialize() before speaking.');
        }
        if (!text || text.trim().length === 0) {
            throw new TJBotError('Text to speak cannot be empty');
        }
        try {
            // Synthesize audio - voice is configured at engine initialization time
            winston.verbose(`${EMO} Synthesizing speech...`);
            const audioBuffer = await this.ttsEngine.synthesize(text);
            // Write to temporary file
            const info = temp.openSync('tjbot');
            winston.debug(`${EMO} writing audio buffer to temp file: ${info.path}`);
            const fd = fs.createWriteStream(info.path);
            fd.write(audioBuffer);
            // Wait for file to be written
            const writePromise = new Promise((resolve, reject) => {
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
            }
            catch (err) {
                winston.error(`${EMO} Could not delete temp audio file:`, err);
            }
        }
        catch (error) {
            winston.error(`${EMO} Error during speech synthesis:`, error);
            throw error;
        }
    }
    /**
     * Clean up TTS resources.
     */
    async cleanup() {
        if (this.ttsEngine) {
            winston.debug(`${EMO} TTSController cleanup`);
            await this.ttsEngine.cleanup?.();
            this.ttsEngine = undefined;
        }
    }
}
//# sourceMappingURL=tts.js.map