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
import type { SeeBackendConfig } from '../../config/config-types.js';
import { ImageClassificationResult, ImageSegmentationResult, ObjectDetectionResult, VisionEngine } from '../vision-engine.js';
export declare class ONNXVisionEngine extends VisionEngine {
    private manager;
    private modelPath;
    private modelLabels;
    private session?;
    constructor(config?: SeeBackendConfig);
    /**
     * Initialize the ONNX vision engine.
     * Pre-downloads the configured model.
     */
    initialize(): Promise<void>;
    /**
     * Ensure the vision model is downloaded and return its local path.
     * @returns Path to the vision model file.
     * @throws {TJBotError} if model download fails
     */
    private ensureModelIsDownloaded;
    detectObjects(image: Buffer | string): Promise<ObjectDetectionResult[]>;
    classifyImage(image: Buffer | string): Promise<ImageClassificationResult[]>;
    segmentImage(image: Buffer | string): Promise<ImageSegmentationResult>;
    /**
     * Preprocess image to Float32 tensor for ONNX model
     * @param image Buffer or file path
     * @param size [width, height]
     */
    private preprocessImage;
}
