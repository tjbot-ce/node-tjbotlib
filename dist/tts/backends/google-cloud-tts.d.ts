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
import { TTSEngine } from '../tts-engine.js';
import type { TTSBackendGoogleCloudConfig } from '../../config/config-types.js';
/**
 * Google Cloud Text-to-Speech Engine
 *
 * Cloud-based speech synthesis using Google Cloud Text-to-Speech API.
 * Requires Google Cloud credentials JSON file to be configured.
 * @public
 */
export declare class GoogleCloudTTSEngine extends TTSEngine {
    private client;
    constructor(config?: TTSBackendGoogleCloudConfig);
    initialize(): Promise<void>;
    private resolveCredentialsPath;
    synthesize(text: string): Promise<Buffer>;
    /**
     * Add WAV header to raw PCM audio data
     * @param pcmData - Raw PCM audio data
     * @param sampleRate - Sample rate in Hz
     * @param numChannels - Number of audio channels
     * @param bitsPerSample - Bits per sample (usually 16)
     * @returns Buffer with WAV header prepended
     */
    private addWavHeader;
}
