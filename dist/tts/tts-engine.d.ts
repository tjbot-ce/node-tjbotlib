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
import { TTSEngineConfig } from '../config/index.js';
/**
 * Abstract Text-to-Speech Engine Base Class
 *
 * Defines the interface for TTS backends (IBM Watson, sherpa-onnx, etc.)
 * All implementations must extend this class and implement the required methods.
 * @public
 */
export declare abstract class TTSEngine {
    protected config: TTSEngineConfig;
    constructor(config?: TTSEngineConfig);
    /**
     * Initialize the TTS engine.
     * This method may perform setup tasks such as loading models or authenticating with services.
     * Should be called before the first call to synthesize().
     *
     * @throws {TJBotError} if initialization fails
     * @public
     */
    abstract initialize(): Promise<void>;
    /**
     * Clean up resources used by the TTS engine.
     * Optional method for backends that need to release resources.
     * @public
     */
    cleanup?(): Promise<void>;
    /**
     * Synthesize text to WAV audio.
     * Both backends should validate input text and return audio as a Buffer in WAV format.
     * Voice is configured at engine initialization time and cannot be changed per synthesis call.
     *
     * @param text - Text to synthesize
     * @returns WAV audio buffer
     * @throws {TJBotError} if synthesis fails
     * @public
     */
    abstract synthesize(text: string): Promise<Buffer>;
    /**
     * Validates text input for synthesis.
     * Checks for null/empty/whitespace-only input.
     *
     * @param text - Text to validate
     * @throws Error if text is invalid
     */
    protected validateText(text: string): void;
}
/**
 * Create a TTS engine instance based on the configuration.
 * Uses dynamic imports to lazily load backend implementations only when needed.
 * @param config - Configuration for the TTS engine with backend settings
 * @returns {Promise<TTSEngine>} Initialized TTS engine instance
 * @throws {TJBotError} if backend type is unknown or dependencies are not installed
 * @public
 */
export declare function createTTSEngine(config: Record<string, unknown>): Promise<TTSEngine>;
