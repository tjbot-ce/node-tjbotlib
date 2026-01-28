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

import { createVisionEngine, type VisionEngine } from './vision-engine.js';
import type { SeeBackendConfig } from '../config/config-types.js';

export class VisionController {
    public visionEngine?: VisionEngine;
    public visionConfig: SeeBackendConfig;

    constructor(visionConfig: SeeBackendConfig) {
        this.visionConfig = visionConfig;
    }

    /**
     * Ensure the Vision engine is initialized (lazy init).
     */
    private async _initializeVisionEngineIfNeeded() {
        if (!this.visionEngine) {
            this.visionEngine = await createVisionEngine(this.visionConfig);
            await this.visionEngine.initialize();
        }
    }

    /**
     * Detect objects in an image using the configured Vision engine.
     * @param image Image buffer or file path
     */
    async detectObjects(image: Buffer | string) {
        await this._initializeVisionEngineIfNeeded();
        if (!this.visionEngine) throw new Error('Vision engine is not initialized.');
        return this.visionEngine.detectObjects(image);
    }

    /**
     * Classify an image using the configured Vision engine.
     * @param image Image buffer or file path
     * @param confidenceThreshold Optional confidence threshold (default 0.5). Only return labels above this threshold.
     */
    async classifyImage(image: Buffer | string, confidenceThreshold?: number) {
        await this._initializeVisionEngineIfNeeded();
        if (!this.visionEngine) throw new Error('Vision engine is not initialized.');
        return this.visionEngine.classifyImage(image, confidenceThreshold);
    }

    /**
     * Detect faces in an image using the configured Vision engine.
     * @param image Image buffer or file path
     */
    async detectFaces(image: Buffer | string) {
        await this._initializeVisionEngineIfNeeded();
        if (!this.visionEngine) throw new Error('Vision engine is not initialized.');
        return this.visionEngine.detectFaces(image);
    }

    /**
     * Describe an image using the configured Vision engine (if supported).
     * Note: This method is only supported by Azure Vision backend.
     * @param image Image buffer or file path
     */
    async describeImage(image: Buffer | string) {
        await this._initializeVisionEngineIfNeeded();
        if (!this.visionEngine) throw new Error('Vision engine is not initialized.');
        return this.visionEngine.describeImage(image);
    }

    /**
     * Eagerly initialize the Vision engine.
     */
    async ensureEngineInitialized(): Promise<void> {
        await this._initializeVisionEngineIfNeeded();
    }

    /**
     * Clean up Vision resources.
     */
    async cleanup(): Promise<void> {
        if (this.visionEngine) {
            await this.visionEngine.cleanup?.();
            this.visionEngine = undefined;
        }
    }
}
