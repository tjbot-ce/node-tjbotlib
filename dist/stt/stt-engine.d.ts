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
import { ListenConfig, STTEngineConfig } from '../config/index.js';
export interface STTRequestOptions {
    listenConfig: ListenConfig;
    /** Optional callback for streaming partial results */
    onPartialResult?: (text: string) => void;
    /** Optional callback for final result */
    onFinalResult?: (text: string) => void;
    /** Optional abort signal to end transcription (e.g., on Ctrl+C) */
    abortSignal?: AbortSignal;
}
/**
 * Abstract base class for speech-to-text engines.
 * Implementations must extend this class and implement initialize() and transcribe().
 * @public
 */
export declare abstract class STTEngine {
    protected config: STTEngineConfig;
    constructor(config?: STTEngineConfig);
    /**
     * Initialize the STT engine. Must be called before transcribe().
     * @throws {TJBotError} if initialization fails
     * @public
     */
    abstract initialize(): Promise<void>;
    /**
     * Clean up resources used by the STT engine.
     * Optional method for backends that need to release resources.
     * @public
     */
    cleanup?(): Promise<void>;
    /**
     * Transcribe audio from a microphone stream.
     * @param micStream - The readable stream from the microphone
     * @param options - Configuration options for transcription
     * @returns {Promise<string>} The transcribed text
     * @throws {TJBotError} if transcription fails or stream is unavailable
     * @public
     */
    abstract transcribe(micStream: NodeJS.ReadableStream, options: STTRequestOptions): Promise<string>;
    protected ensureStream(stream: NodeJS.ReadableStream | undefined): NodeJS.ReadableStream;
}
/**
 * Create an STT engine instance based on the configuration.
 * Uses dynamic imports to lazily load backend implementations only when needed.
 * @param listenConfig - Configuration for the STT engine
 * @returns {Promise<STTEngine>} Initialized STT engine instance
 * @throws {TJBotError} if backend type is unknown or dependencies are not installed
 * @public
 */
export declare function createSTTEngine(listenConfig: ListenConfig): Promise<STTEngine>;
