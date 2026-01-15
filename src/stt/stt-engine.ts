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

import { ListenConfig, STTBackendType, STTEngineConfig } from '../config/index.js';
import { TJBotError } from '../utils/index.js';

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
export abstract class STTEngine {
    protected config: STTEngineConfig;

    constructor(config?: STTEngineConfig) {
        this.config = config ?? {};
    }

    /**
     * Initialize the STT engine. Must be called before transcribe().
     * @throws {TJBotError} if initialization fails
     * @public
     */
    abstract initialize(): Promise<void>;

    /**
     * Transcribe audio from a microphone stream.
     * @param micStream - The readable stream from the microphone
     * @param options - Configuration options for transcription
     * @returns {Promise<string>} The transcribed text
     * @throws {TJBotError} if transcription fails or stream is unavailable
     * @public
     */
    abstract transcribe(micStream: NodeJS.ReadableStream, options: STTRequestOptions): Promise<string>;

    protected ensureStream(stream: NodeJS.ReadableStream | undefined): NodeJS.ReadableStream {
        if (!stream) {
            throw new TJBotError('Microphone stream is not available');
        }
        return stream;
    }
}

/**
 * Create an STT engine instance based on the configuration.
 * Uses dynamic imports to lazily load backend implementations only when needed.
 * @param listenConfig - Configuration for the STT engine
 * @returns {Promise<STTEngine>} Initialized STT engine instance
 * @throws {TJBotError} if backend type is unknown or dependencies are not installed
 * @public
 */
export async function createSTTEngine(listenConfig: ListenConfig): Promise<STTEngine> {
    const backend = (listenConfig.backend?.type as STTBackendType) ?? 'local';

    try {
        if (backend === 'local') {
            const module = await import('./backends/sherpa-onnx.js');
            if (!module?.SherpaONNXSTTEngine) {
                throw new TJBotError('STT backend "local" is unavailable (missing SherpaONNXSTTEngine export).');
            }
            return new module.SherpaONNXSTTEngine(listenConfig.backend?.local);
        }

        if (backend === 'ibm-watson-stt') {
            const module = await import('./backends/ibm-watson-stt.js');
            if (!module?.IBMWatsonSTTEngine) {
                throw new TJBotError(
                    'STT backend "ibm-watson-stt" is unavailable (missing IBMWatsonSTTEngine export).'
                );
            }
            return new module.IBMWatsonSTTEngine(listenConfig.backend?.['ibm-watson-stt']);
        }

        if (backend === 'google-cloud-stt') {
            const module = await import('./backends/google-cloud-stt.js');
            if (!module?.GoogleCloudSTTEngine) {
                throw new TJBotError(
                    'STT backend "google-cloud-stt" is unavailable (missing GoogleCloudSTTEngine export).'
                );
            }
            return new module.GoogleCloudSTTEngine(listenConfig.backend?.['google-cloud-stt']);
        }

        if (backend === 'azure-stt') {
            const module = await import('./backends/azure-stt.js');
            if (!module?.AzureSTTEngine) {
                throw new TJBotError('STT backend "azure-stt" is unavailable (missing AzureSTTEngine export).');
            }
            return new module.AzureSTTEngine(listenConfig.backend?.['azure-stt']);
        }

        throw new TJBotError(`Unknown STT backend type: ${backend}`);
    } catch (error) {
        if (error instanceof TJBotError) {
            throw error;
        }
        throw new TJBotError(`Failed to load STT backend "${backend}". Ensure dependencies are installed.`, {
            cause: error as Error,
        });
    }
}
