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
import { type VisionEngine } from './vision-engine.js';
import type { SeeBackendConfig } from '../config/config-types.js';
export declare class VisionController {
    visionEngine?: VisionEngine;
    visionConfig: SeeBackendConfig;
    constructor(visionConfig: SeeBackendConfig);
    /**
     * Ensure the Vision engine is initialized (lazy init).
     */
    private _initializeVisionEngineIfNeeded;
    /**
     * Detect objects in an image using the configured Vision engine.
     * @param image Image buffer or file path
     */
    detectObjects(image: Buffer | string): Promise<import("./vision-engine.js").ObjectDetectionResult[]>;
    /**
     * Classify an image using the configured Vision engine.
     * @param image Image buffer or file path
     * @param confidenceThreshold Optional confidence threshold (default 0.5). Only return labels above this threshold.
     */
    classifyImage(image: Buffer | string, confidenceThreshold?: number): Promise<import("./vision-engine.js").ImageClassificationResult[]>;
    /**
     * Detect faces in an image using the configured Vision engine.
     * @param image Image buffer or file path
     */
    detectFaces(image: Buffer | string): Promise<import("./vision-engine.js").FaceDetectionResult[]>;
    /**
     * Describe an image using the configured Vision engine (if supported).
     * Note: This method is only supported by Azure Vision backend.
     * @param image Image buffer or file path
     */
    describeImage(image: Buffer | string): Promise<import("./vision-engine.js").ImageDescriptionResult>;
}
