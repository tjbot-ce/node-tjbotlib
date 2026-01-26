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
import { ONNXVisionEngine } from './backends/onnx.js';
import { GoogleCloudVisionEngine } from './backends/google-cloud-vision.js';
import { AzureVisionEngine } from './backends/azure-vision.js';
export function createVisionEngine(config) {
    // Accept both 'backend' and 'type' for compatibility
    let backend;
    if (typeof config.backend === 'string') {
        backend = config.backend;
    }
    else if (typeof config.type === 'string') {
        backend = config.type;
    }
    switch (backend) {
        case 'local':
            return new ONNXVisionEngine(config);
        case 'google-cloud-vision':
            return new GoogleCloudVisionEngine(config);
        case 'azure-vision':
            return new AzureVisionEngine(config);
        default:
            throw new Error(`Unknown Vision backend: ${backend}`);
    }
}
export class VisionController {
    constructor(visionConfig) {
        this.visionConfig = visionConfig;
    }
    /**
     * Ensure the Vision engine is initialized (lazy init).
     */
    async _initializeVisionEngineIfNeeded() {
        if (!this.visionEngine) {
            this.visionEngine = createVisionEngine(this.visionConfig);
            await this.visionEngine.initialize();
        }
    }
    /**
     * Detect objects in an image using the configured Vision engine.
     * @param image Image buffer or file path
     */
    async detectObjects(image) {
        await this._initializeVisionEngineIfNeeded();
        if (!this.visionEngine)
            throw new Error('Vision engine is not initialized.');
        return this.visionEngine.detectObjects(image);
    }
    /**
     * Classify an image using the configured Vision engine.
     * @param image Image buffer or file path
     */
    async classifyImage(image) {
        await this._initializeVisionEngineIfNeeded();
        if (!this.visionEngine)
            throw new Error('Vision engine is not initialized.');
        return this.visionEngine.classifyImage(image);
    }
    /**
     * Segment an image using the configured Vision engine (if supported).
     * @param image Image buffer or file path
     */
    async segmentImage(image) {
        await this._initializeVisionEngineIfNeeded();
        if (!this.visionEngine)
            throw new Error('Vision engine is not initialized.');
        if (!this.visionEngine.segmentImage)
            throw new Error('Segmentation not supported by this Vision engine.');
        return this.visionEngine.segmentImage(image);
    }
}
//# sourceMappingURL=vision.js.map