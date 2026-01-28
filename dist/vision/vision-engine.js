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
 * Abstract Vision Engine Base Class
 *
 * Defines the interface for Vision backends (ONNX, Google Cloud Vision, Azure Vision, etc.)
 * All implementations must extend this class and implement the required methods.
 * @public
 */
export class VisionEngine {
    constructor(config) {
        this.config = config ?? {};
    }
}
export async function createVisionEngine(config) {
    const backend = config.type ?? 'local';
    try {
        if (backend === 'local') {
            const module = await import('./backends/onnx.js');
            if (!module?.ONNXVisionEngine) {
                throw new TJBotError('Vision backend "local" is unavailable (missing ONNXVisionEngine export).');
            }
            return new module.ONNXVisionEngine(config.local ?? {});
        }
        if (backend === 'google-cloud-vision') {
            const module = await import('./backends/google-cloud-vision.js');
            if (!module?.GoogleCloudVisionEngine) {
                throw new TJBotError('Vision backend "google-cloud-vision" is unavailable (missing GoogleCloudVisionEngine export).');
            }
            return new module.GoogleCloudVisionEngine(config['google-cloud-vision'] ?? {});
        }
        if (backend === 'azure-vision') {
            const module = await import('./backends/azure-vision.js');
            if (!module?.AzureVisionEngine) {
                throw new TJBotError('Vision backend "azure-vision" is unavailable (missing AzureVisionEngine export).');
            }
            return new module.AzureVisionEngine(config['azure-vision'] ?? {});
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