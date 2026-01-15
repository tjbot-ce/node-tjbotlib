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
import { TTSEngine } from '../tts-engine.js';
import { TTSEngineConfig } from '../../config/index.js';
/**
 * IBM Watson Text-to-Speech Engine
 *
 * Cloud-based speech synthesis using IBM Watson Text to Speech service.
 * Requires IBM Cloud credentials to be configured in ibm-credentials.env file.
 * @public
 */
export declare class IBMTTSEngine extends TTSEngine {
    private ttsService;
    constructor(config?: TTSEngineConfig);
    /**
     * Initialize the IBM Watson TTS service.
     * Creates a new TextToSpeechV1 instance.
     */
    initialize(): Promise<void>;
    private loadCredentials;
    /**
     * Synthesize text to WAV audio using IBM Watson TTS.
     * Voice is configured at engine initialization time via config.
     *
     * @param text - Text to synthesize
     * @returns WAV audio buffer
     * @throws Error if service is not initialized or synthesis fails
     */
    synthesize(text: string): Promise<Buffer>;
}
