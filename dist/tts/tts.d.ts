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
import type { SpeakConfig } from '../config/config-types.js';
import { SpeakerController } from '../speaker/index.js';
/**
 * TTS controller manages text-to-speech synthesis and engine lifecycle.
 * TTS engine is eagerly initialized during setupSpeaker() and cached for reuse.

 */
export declare class TTSController {
    private ttsEngine?;
    private speakerController;
    private speakConfig?;
    constructor(speakerController: SpeakerController);
    /**
     * Initialize the TTS backend
     * Called during setupSpeaker to eagerly load TTS engine
     * @param config Configuration object with backend, IBM settings, and Sherpa settings
     */
    initialize(config: SpeakConfig): Promise<void>;
    /**
     * Synthesize text to speech and play the audio.
     * Lazily initializes the TTS engine on first call.
     *
     * @param text The text to speak
     */
    speak(text: string): Promise<void>;
    /**
     * Clean up TTS resources.
     */
    cleanup(): Promise<void>;
}
//# sourceMappingURL=tts.d.ts.map