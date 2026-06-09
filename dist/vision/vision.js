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
import { getLogger } from '../utils/logging.js';
import { createVisionEngine } from './vision-engine.js';
const logger = getLogger(import.meta.url);
export class VisionController {
    visionEngine;
    visionConfig;
    async initialize(config) {
        this.visionConfig = config;
        this.visionEngine = await createVisionEngine(config);
        await this.visionEngine.initialize();
    }
    /**
     * Detect objects in an image using the configured Vision engine.
     * @param image Image buffer or file path
     */
    async detectObjects(image) {
        if (this.visionEngine === undefined) {
            throw new Error('Vision engine not initialized. Call initialize() before detecting objects.');
        }
        logger.verbose('Detecting objects in image');
        return this.visionEngine.detectObjects(image);
    }
    /**
     * Classify an image using the configured Vision engine.
     * @param image Image buffer or file path
     */
    async classifyImage(image) {
        if (this.visionEngine === undefined) {
            throw new Error('Vision engine not initialized. Call initialize() before classifying images.');
        }
        logger.verbose('Classifying image');
        return this.visionEngine.classifyImage(image);
    }
    /**
     * Detect faces in an image using the configured Vision engine.
     * @param image Image buffer or file path
     */
    async detectFaces(image) {
        if (this.visionEngine === undefined) {
            throw new Error('Vision engine not initialized. Call initialize() before detecting faces.');
        }
        logger.verbose('Detecting faces in image');
        return this.visionEngine.detectFaces(image);
    }
    /**
     * Describe an image using the configured Vision engine (if supported).
     * Note: This method is only supported by Azure Vision backend.
     * @param image Image buffer or file path
     */
    async describeImage(image) {
        if (this.visionEngine === undefined) {
            throw new Error('Vision engine not initialized. Call initialize() before describing images.');
        }
        logger.verbose('Describing image');
        return this.visionEngine.describeImage(image);
    }
    /**
     * Clean up Vision resources.
     */
    async cleanup() {
        if (this.visionEngine) {
            logger.debug('VisionController cleanup');
            await this.visionEngine.cleanup?.();
            this.visionEngine = undefined;
        }
    }
}
//# sourceMappingURL=vision.js.map