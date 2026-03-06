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
import { getTTSBackendConfig, } from '../config/index.js';
import { TJBotError } from '../utils/index.js';
/**
 * Abstract Text-to-Speech Engine Base Class
 *
 * Defines the interface for TTS backends (IBM Watson, sherpa-onnx, etc.)
 * All implementations must extend this class and implement the required methods.
 * @public
 */
export class TTSEngine {
    config;
    constructor(config) {
        // Uses global winston instance
        this.config = config ?? {};
    }
    /**
     * Validates text input for synthesis.
     * Checks for null/empty/whitespace-only input.
     *
     * @param text - Text to validate
     * @throws Error if text is invalid
     */
    validateText(text) {
        if (!text || typeof text !== 'string' || text.trim().length === 0) {
            throw new TJBotError('Text input cannot be empty or whitespace-only');
        }
    }
}
/**
 * Create a TTS engine instance based on the configuration.
 * Uses dynamic imports to lazily load backend implementations only when needed.
 * @param speakConfig - Configuration for the TTS engine with backend settings
 * @returns {Promise<TTSEngine>} Initialized TTS engine instance
 * @throws {TJBotError} if backend type is unknown or dependencies are not installed
 * @public
 */
export async function createTTSEngine(speakConfig) {
    const backend = (speakConfig.backend?.type ?? 'local');
    try {
        if (backend === 'none') {
            // Return a stub engine that throws on all synthesize calls
            class NoneTTSEngine extends TTSEngine {
                async initialize() {
                    // No-op for 'none' backend
                }
                async synthesize() {
                    throw new TJBotError('TTS is disabled. Configure a text-to-speech backend (local, ibm-watson-tts, google-cloud-tts, or azure-tts) to use speech synthesis.');
                }
            }
            return new NoneTTSEngine();
        }
        if (backend === 'local') {
            const module = await import('./backends/sherpa-onnx.js');
            if (!module?.SherpaONNXTTSEngine) {
                throw new TJBotError('TTS backend "local" is unavailable (missing SherpaONNXTTSEngine export).');
            }
            const config = getTTSBackendConfig(speakConfig.backend, backend);
            return new module.SherpaONNXTTSEngine(config);
        }
        if (backend === 'ibm-watson-tts') {
            const module = await import('./backends/ibm-watson-tts.js');
            if (!module?.IBMTTSEngine) {
                throw new TJBotError('TTS backend "ibm-watson-tts" is unavailable (missing IBMTTSEngine export).');
            }
            const config = getTTSBackendConfig(speakConfig.backend, backend);
            return new module.IBMTTSEngine(config);
        }
        if (backend === 'google-cloud-tts') {
            const module = await import('./backends/google-cloud-tts.js');
            if (!module?.GoogleCloudTTSEngine) {
                throw new TJBotError('TTS backend "google-cloud-tts" is unavailable (missing GoogleCloudTTSEngine export).');
            }
            const config = getTTSBackendConfig(speakConfig.backend, backend);
            return new module.GoogleCloudTTSEngine(config);
        }
        if (backend === 'azure-tts') {
            const module = await import('./backends/azure-tts.js');
            if (!module?.AzureTTSEngine) {
                throw new TJBotError('TTS backend "azure-tts" is unavailable (missing AzureTTSEngine export).');
            }
            const config = getTTSBackendConfig(speakConfig.backend, backend);
            return new module.AzureTTSEngine(config);
        }
        throw new TJBotError(`Unknown TTS backend type: ${backend}`);
    }
    catch (error) {
        if (error instanceof TJBotError) {
            throw error;
        }
        throw new TJBotError(`Failed to load TTS backend "${backend}". Ensure dependencies are installed.`, {
            cause: error,
        });
    }
}
//# sourceMappingURL=tts-engine.js.map