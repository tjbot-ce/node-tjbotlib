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
import { VisionEngine, type ObjectDetectionResult, type ImageClassificationResult, type FaceDetectionResult, type ImageDescriptionResult } from '../vision-engine.js';
import type { SeeBackendGoogleCloudConfig } from '../../config/config-types.js';
export declare class GoogleCloudVisionEngine extends VisionEngine {
    private credentialsPath?;
    private model?;
    private endpoint;
    private apiKey?;
    constructor(config: SeeBackendGoogleCloudConfig);
    initialize(): Promise<void>;
    detectObjects(image: Buffer | string): Promise<ObjectDetectionResult[]>;
    classifyImage(image: Buffer | string, confidenceThreshold?: number): Promise<ImageClassificationResult[]>;
    detectFaces(image: Buffer | string): Promise<FaceDetectionResult[]>;
    describeImage(_image: Buffer | string): Promise<ImageDescriptionResult>;
}
