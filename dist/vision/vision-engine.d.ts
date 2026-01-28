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
import { SeeBackendConfig } from '../config/config-types.js';
export interface ObjectDetectionResult {
    label: string;
    confidence: number;
    bbox: [number, number, number, number];
}
export interface Landmark {
    x: number;
    y: number;
    type?: string;
}
export interface FaceDetectionResult {
    boundingBox: [number, number, number, number];
    confidence: number;
    landmarks: Landmark[];
    headPose?: {
        roll: number;
        yaw: number;
        pitch: number;
    };
    qualityMetrics?: {
        blurValue?: number;
        exposure?: 'underExposed' | 'goodExposure' | 'overExposed';
        noise?: number;
    };
    occlusion?: {
        eyeOccluded: boolean;
        foreheadOccluded: boolean;
        mouthOccluded: boolean;
    };
}
export interface ImageClassificationResult {
    label: string;
    confidence: number;
}
export interface ImageDescriptionResult {
    description: string;
    confidence: number;
}
/**
 * Abstract Vision Engine Base Class
 *
 * Defines the interface for Vision backends (ONNX, Google Cloud Vision, Azure Vision, etc.)
 * All implementations must extend this class and implement the required methods.
 * @public
 */
export declare abstract class VisionEngine {
    protected config: SeeBackendConfig;
    constructor(config?: SeeBackendConfig);
    /**
     * Initialize the Vision engine.
     * This method may perform setup tasks such as loading models or authenticating with services.
     * Should be called before the first call to detectObjects(), classifyImage(), or segmentImage().
     *
     * @throws {TJBotError} if initialization fails
     * @public
     */
    abstract initialize(): Promise<void>;
    /**
     * Detect objects in an image.
     *
     * @param image - Image buffer or file path
     * @returns Array of detected objects with labels, confidence scores, and bounding boxes
     * @throws {TJBotError} if detection fails
     * @public
     */
    abstract detectObjects(image: Buffer | string): Promise<ObjectDetectionResult[]>;
    /**
     * Classify an image.
     *
     * @param image - Image buffer or file path
     * @param confidenceThreshold - Optional confidence threshold (default 0.5). Only return labels with confidence >= threshold.
     * @returns Array of classification results with labels and confidence scores, sorted by confidence descending
     * @throws {TJBotError} if classification fails
     * @public
     */
    abstract classifyImage(image: Buffer | string, confidenceThreshold?: number): Promise<ImageClassificationResult[]>;
    /**
     * Detect faces in an image.
     *
     * @param image - Image buffer or file path
     * @returns Array of detected faces with bounding boxes, confidence scores, and landmarks
     * @throws {TJBotError} if detection fails
     * @public
     */
    abstract detectFaces(image: Buffer | string): Promise<FaceDetectionResult[]>;
    /**
     * Describe an image with natural language caption.
     * Note: This method is only supported by Azure Vision backend.
     *
     * @param image - Image buffer or file path
     * @returns Image description with confidence score
     * @throws {TJBotError} if description fails or backend does not support this operation
     * @public
     */
    abstract describeImage(image: Buffer | string): Promise<ImageDescriptionResult>;
}
export declare function createVisionEngine(config: SeeBackendConfig): Promise<VisionEngine>;
