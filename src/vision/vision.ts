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

import winston from 'winston';
import type { SeeConfig } from '../config/config-types.js';
import { LogEmoji } from '../utils/logging.js';
import { createVisionEngine, type VisionEngine } from './vision-engine.js';

const EMO = LogEmoji.VISION;

export class VisionController {
    public visionEngine?: VisionEngine;
    public visionConfig?: SeeConfig;

    async initialize(config: SeeConfig): Promise<void> {
        this.visionConfig = config;
        this.visionEngine = await createVisionEngine(config);
        await this.visionEngine.initialize();
    }

    /**
     * Detect objects in an image using the configured Vision engine.
     * @param image Image buffer or file path
     */
    async detectObjects(image: Buffer | string) {
        if (this.visionEngine === undefined) {
            throw new Error('Vision engine not initialized. Call initialize() before detecting objects.');
        }
        winston.verbose(`${EMO} Detecting objects in image`);
        return this.visionEngine.detectObjects(image);
    }

    /**
     * Classify an image using the configured Vision engine.
     * @param image Image buffer or file path
     * @param confidenceThreshold Optional confidence threshold (default 0.5). Only return labels above this threshold.
     */
    async classifyImage(image: Buffer | string, confidenceThreshold?: number) {
        if (this.visionEngine === undefined) {
            throw new Error('Vision engine not initialized. Call initialize() before classifying images.');
        }
        winston.verbose(`${EMO} Classifying image`);
        return this.visionEngine.classifyImage(image, confidenceThreshold);
    }

    /**
     * Detect faces in an image using the configured Vision engine.
     * @param image Image buffer or file path
     */
    async detectFaces(image: Buffer | string) {
        if (this.visionEngine === undefined) {
            throw new Error('Vision engine not initialized. Call initialize() before detecting faces.');
        }
        winston.verbose(`${EMO} Detecting faces inimage`);
        return this.visionEngine.detectFaces(image);
    }

    /**
     * Describe an image using the configured Vision engine (if supported).
     * Note: This method is only supported by Azure Vision backend.
     * @param image Image buffer or file path
     */
    async describeImage(image: Buffer | string) {
        if (this.visionEngine === undefined) {
            throw new Error('Vision engine not initialized. Call initialize() before describing images.');
        }
        winston.verbose(`${EMO} Describing image`);
        return this.visionEngine.describeImage(image);
    }

    /**
     * Clean up Vision resources.
     */
    async cleanup(): Promise<void> {
        if (this.visionEngine) {
            winston.debug(`${EMO} VisionController cleanup`);
            await this.visionEngine.cleanup?.();
            this.visionEngine = undefined;
        }
    }
}
