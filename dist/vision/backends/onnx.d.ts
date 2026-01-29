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
import { ImageClassificationResult, ObjectDetectionResult, VisionEngine, FaceDetectionMetadata, ImageDescriptionResult } from '../vision-engine.js';
export declare class ONNXVisionEngine extends VisionEngine {
    private manager;
    private models;
    constructor(config?: SeeBackendConfig);
    /**
     * Initialize the ONNX vision engine.
     */
    initialize(): Promise<void>;
    /**
     * Load a model
     */
    private loadModel;
    /**
     * Load label file for a model
     */
    private loadLabels;
    /**
     * Get a model, loading it if necessary
     */
    private getOrLoadModel;
    /**
     * Detect objects in an image.
     */
    detectObjects(image: Buffer | string): Promise<ObjectDetectionResult[]>;
    /**
     * Classify an image.
     */
    classifyImage(image: Buffer | string, confidenceThreshold?: number): Promise<ImageClassificationResult[]>;
    /**
     * Detect faces in an image.
     */
    detectFaces(image: Buffer | string): Promise<{
        isFaceDetected: boolean;
        metadata: FaceDetectionMetadata[];
    }>;
    /**
     * Describe an image - not supported by ONNX backend.
     */
    describeImage(_image: Buffer | string): Promise<ImageDescriptionResult>;
    /**
     * Postprocess YOLO object detection output
     */
    /**
     * Sigmoid function to normalize logits to 0-1 range
     */
    private sigmoid;
    /**
     * Postprocess YOLO object detection output
     */
    private postprocessDetection;
    /**
     * Apply Non-Maximum Suppression to remove overlapping detections
     */
    private nonMaxSuppression;
    /**
     * Calculate Intersection over Union (IoU) between two bounding boxes
     * bbox format: [x, y, w, h]
     */
    private calculateIoU;
    /**
     * Postprocess classification output
     */
    private postprocessClassification;
    /**
     * Postprocess face detection output from YuNet
     * YuNet outputs: [n_faces, 15] where each face has [x, y, w, h, confidence, landmarks_x, landmarks_y, ...]
     */
    private postprocessFaceDetection;
    /**
     * Apply Non-Maximum Suppression to remove overlapping face detections
     * @param faces Array of detected faces
     * @param iouThreshold IoU threshold for suppression (default 0.5)
     * @returns Filtered array of non-overlapping faces
     */
    private applyNMS;
    /**
     * Compute Intersection over Union (IoU) between two bounding boxes
     * @param box1 [x, y, w, h]
     * @param box2 [x, y, w, h]
     * @returns IoU value between 0 and 1
     */
    private computeIoU;
    /**
     * Preprocess image to Float32 tensor for ONNX model
     */
    private preprocessImage;
}
