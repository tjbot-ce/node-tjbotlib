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
import type { TTSBackendLocalConfig } from '../../config/config-types.js';
/**
 * Sherpa-ONNX Local Text-to-Speech Engine
 *
 * Offline speech synthesis using Sherpa-ONNX library with Piper voices.
 * Models are automatically downloaded and cached in ~/.tjbot/models/sherpa-tts/
 * @public
 */
export declare class SherpaONNXTTSEngine extends TTSEngine {
    private manager;
    private modelPath;
    private ttsEngine?;
    constructor(config?: TTSBackendLocalConfig);
    /**
     * Initialize the sherpa-onnx TTS engine.
     * Pre-downloads the configured model.
     */
    initialize(): Promise<void>;
    /**
     * Ensure the TTS model is downloaded and return its local path.
     * @returns Path to the TTS model file.
     * @throws {TJBotError} if model download fails
     */
    private ensureModelIsDownloaded;
    private setupTTSEngine;
    /**
     * Synthesize text to WAV audio using sherpa-onnx.
     * Voice is configured at engine initialization time via config.
     *
     * @param text - Text to synthesize
     * @returns WAV audio buffer
     * @throws Error if not initialized or synthesis fails
     */
    synthesize(text: string): Promise<Buffer>;
    /**
     * Convert PCM samples to WAV format.
     * Creates a proper WAV file with header and audio data.
     *
     * @param samples - PCM audio samples (typically as Float32Array)
     * @param sampleRate - Sample rate in Hz (e.g., 22050)
     * @returns WAV file as Buffer
     */
    private audioToWav;
    /**
     * Convert Float32 PCM samples to 16-bit PCM.
     *
     * @param float32Samples - Float32 audio samples (range -1.0 to 1.0)
     * @returns 16-bit PCM samples as Buffer
     */
    private float32ToPcm16;
}
