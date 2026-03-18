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
import { getSeeBackendConfig, } from '../config/config-types.js';
import { TJBotError } from '../utils/index.js';
/**
 * Abstract Vision Engine Base Class
 *
 * Defines the interface for Vision backends (ONNX, Google Cloud Vision, Azure Vision, etc.)
 * All implementations must extend this class and implement the required methods.
 * @public
 */
export class VisionEngine {
    config;
    constructor(config) {
        this.config = config ?? {};
    }
}
/**
 * Create a Vision engine instance based on the configuration.
 * Uses dynamic imports to lazily load backend implementations only when needed.
 * @param seeConfig - Configuration for the Vision engine with backend settings
 * @returns {Promise<VisionEngine>} Initialized Vision engine instance
 * @throws {TJBotError} if backend type is unknown or dependencies are not installed
 * @public
 */
export async function createVisionEngine(seeConfig) {
    const backend = (seeConfig.backend?.type ?? 'local');
    try {
        if (backend === 'none') {
            class NoneVisionEngine extends VisionEngine {
                async initialize() {
                    // No-op for 'none' backend
                }
                async detectObjects() {
                    throw new TJBotError('Vision is disabled. Configure a vision backend (local, google-cloud-vision, or azure-vision) to use image analysis.');
                }
                async classifyImage() {
                    throw new TJBotError('Vision is disabled. Configure a vision backend (local, google-cloud-vision, or azure-vision) to use image analysis.');
                }
                async detectFaces() {
                    throw new TJBotError('Vision is disabled. Configure a vision backend (local, google-cloud-vision, or azure-vision) to use image analysis.');
                }
                async describeImage() {
                    throw new TJBotError('Vision is disabled. Configure a vision backend (local, google-cloud-vision, or azure-vision) to use image analysis.');
                }
            }
            return new NoneVisionEngine();
        }
        if (backend === 'local') {
            const module = await import('./backends/onnx.js');
            if (!module?.ONNXVisionEngine) {
                throw new TJBotError('Vision backend "local" is unavailable (missing ONNXVisionEngine export).');
            }
            const engineConfig = getSeeBackendConfig(seeConfig.backend, backend);
            return new module.ONNXVisionEngine(engineConfig);
        }
        if (backend === 'google-cloud-vision') {
            const module = await import('./backends/google-cloud-vision.js');
            if (!module?.GoogleCloudVisionEngine) {
                throw new TJBotError('Vision backend "google-cloud-vision" is unavailable (missing GoogleCloudVisionEngine export).');
            }
            const engineConfig = getSeeBackendConfig(seeConfig.backend, backend);
            return new module.GoogleCloudVisionEngine(engineConfig);
        }
        if (backend === 'azure-vision') {
            const module = await import('./backends/azure-vision.js');
            if (!module?.AzureVisionEngine) {
                throw new TJBotError('Vision backend "azure-vision" is unavailable (missing AzureVisionEngine export).');
            }
            const engineConfig = getSeeBackendConfig(seeConfig.backend, backend);
            return new module.AzureVisionEngine(engineConfig);
        }
        throw new TJBotError(`Unknown Vision backend type: ${backend}`);
    }
    catch (error) {
        if (error instanceof TJBotError) {
            throw error;
        }
        throw new TJBotError(`Failed to load Vision backend "${backend}". Ensure dependencies are installed.`, {
            cause: error,
        });
    }
}
//# sourceMappingURL=vision-engine.js.map