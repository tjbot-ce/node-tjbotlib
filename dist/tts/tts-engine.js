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
import { TJBotError } from '../utils/index.js';
/**
 * Abstract Text-to-Speech Engine Base Class
 *
 * Defines the interface for TTS backends (IBM Watson, sherpa-onnx, etc.)
 * All implementations must extend this class and implement the required methods.
 * @public
 */
export class TTSEngine {
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
 * @param config - Configuration for the TTS engine with backend settings
 * @returns {Promise<TTSEngine>} Initialized TTS engine instance
 * @throws {TJBotError} if backend type is unknown or dependencies are not installed
 * @public
 */
export async function createTTSEngine(config) {
    const backendConfig = config.backend;
    const backend = backendConfig?.type ?? 'local';
    try {
        if (backend === 'local') {
            const module = await import('./backends/sherpa-onnx.js');
            if (!module?.SherpaONNXTTSEngine) {
                throw new TJBotError('TTS backend "local" is unavailable (missing SherpaONNXTTSEngine export).');
            }
            return new module.SherpaONNXTTSEngine(backendConfig?.local ?? {});
        }
        if (backend === 'ibm-watson-tts') {
            const module = await import('./backends/ibm-watson-tts.js');
            if (!module?.IBMTTSEngine) {
                throw new TJBotError('TTS backend "ibm-watson-tts" is unavailable (missing IBMTTSEngine export).');
            }
            return new module.IBMTTSEngine(backendConfig?.['ibm-watson-tts'] ?? {});
        }
        if (backend === 'google-cloud-tts') {
            const module = await import('./backends/google-cloud-tts.js');
            if (!module?.GoogleCloudTTSEngine) {
                throw new TJBotError('TTS backend "google-cloud-tts" is unavailable (missing GoogleCloudTTSEngine export).');
            }
            return new module.GoogleCloudTTSEngine(backendConfig?.['google-cloud-tts'] ?? {});
        }
        if (backend === 'azure-tts') {
            const module = await import('./backends/azure-tts.js');
            if (!module?.AzureTTSEngine) {
                throw new TJBotError('TTS backend "azure-tts" is unavailable (missing AzureTTSEngine export).');
            }
            return new module.AzureTTSEngine(backendConfig?.['azure-tts'] ?? {});
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