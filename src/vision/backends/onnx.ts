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

import fs from 'fs';
import * as ort from 'onnxruntime-node';
import sharp from 'sharp';
import winston from 'winston';
import type { SeeBackendConfig } from '../../config/config-types.js';
import { TJBotError } from '../../utils/index.js';
import { ModelManager, VisionModelMetadata } from '../../utils/model-manager.js';
import {
    ImageClassificationResult,
    ObjectDetectionResult,
    VisionEngine,
    FaceDetectionResult,
    ImageDescriptionResult,
    Landmark,
} from '../vision-engine.js';
import path from 'path';

interface LoadedModel {
    session: ort.InferenceSession;
    labels: string[];
    inputShape: number[];
    kind: string;
}

export class ONNXVisionEngine extends VisionEngine {
    private manager: ModelManager = ModelManager.getInstance();
    private models: Map<string, LoadedModel> = new Map();

    constructor(config?: SeeBackendConfig) {
        super(config);
    }

    /**
     * Initialize the ONNX vision engine.
     */
    async initialize(): Promise<void> {
        try {
            // Validate that configuration is present
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const localConfig = (this.config as any) ?? {};
            const detectionModelName = localConfig.detectionModel as string;
            const classificationModelName = localConfig.classificationModel as string;
            const faceDetectionModelName = localConfig.faceDetectionModel as string;

            if (!detectionModelName || !classificationModelName || !faceDetectionModelName) {
                throw new TJBotError(
                    'ONNX vision engine config is missing required model names (detectionModel, classificationModel, faceDetectionModel)'
                );
            }

            // Eagerly load all models
            await this.loadModel(detectionModelName);
            await this.loadModel(classificationModelName);
            await this.loadModel(faceDetectionModelName);

            winston.info('👁️ ONNX vision engine initialized');
        } catch (error) {
            winston.error('Failed to initialize ONNX vision engine:', error);
            throw new TJBotError('Failed to initialize ONNX vision engine', { cause: error as Error });
        }
    }

    /**
     * Load a model and cache it
     */
    private async loadModel(modelName: string): Promise<void> {
        if (this.models.has(modelName)) {
            return; // Already loaded
        }

        try {
            winston.debug(`Loading ONNX model: ${modelName}`);

            // Get model metadata and download
            const metadata = await this.manager.loadModel<VisionModelMetadata>(modelName);

            // Build model path
            const modelCacheDir = this.manager.getVisionModelCacheDir();
            const modelDir = path.join(modelCacheDir, metadata.folder);

            // Find the ONNX model file in the required files
            const onnxFile = metadata.required.find((file: string) => file.endsWith('.onnx'));
            if (!onnxFile) {
                throw new TJBotError(`No ONNX file found in model requirements for: ${modelName}`);
            }

            const modelPath = path.join(modelDir, onnxFile);

            // Create ONNX session
            const session = await ort.InferenceSession.create(modelPath);

            // Load labels if available
            let labels: string[] = [];
            if (metadata.labelUrl && metadata.kind !== 'face-detection') {
                labels = await this.loadLabels(modelName, metadata, modelDir);
            }

            // Get input shape from metadata
            const inputShape = metadata.inputShape ?? [1, 3, 640, 640];

            this.models.set(modelName, {
                session,
                labels,
                inputShape,
                kind: metadata.kind,
            });

            winston.info(`✅ Loaded ONNX model: ${modelName} (${metadata.kind})`);
        } catch (error) {
            throw new TJBotError(`Failed to load ONNX model ${modelName}`, { cause: error as Error });
        }
    }

    /**
     * Load label file for a model
     */
    private async loadLabels(modelName: string, metadata: VisionModelMetadata, modelDir: string): Promise<string[]> {
        try {
            // Try common label file names based on model kind
            let labelFile: string | undefined;
            if (metadata.kind === 'detection') {
                // Look for classes.txt, coco.yaml or coco.names
                const possibleNames = ['classes.txt', 'coco.yaml', 'coco.names'];
                for (const name of possibleNames) {
                    if (fs.existsSync(path.join(modelDir, name))) {
                        labelFile = path.join(modelDir, name);
                        break;
                    }
                }
            } else if (metadata.kind === 'classification') {
                // Look for imagenet_classes.txt or similar
                const possibleNames = ['imagenet_classes.txt', 'labels.txt', 'classes.txt'];
                for (const name of possibleNames) {
                    if (fs.existsSync(path.join(modelDir, name))) {
                        labelFile = path.join(modelDir, name);
                        break;
                    }
                }
            }

            if (!labelFile) {
                winston.warn(`No label file found for model: ${modelName}`);
                return [];
            }

            const content = fs.readFileSync(labelFile, 'utf8');

            // Parse YAML files for detection models
            if (labelFile.endsWith('.yaml') && metadata.kind === 'detection') {
                // Extract class names from YAML
                // YAML format 1: names: ['person', 'bicycle', ...]
                let namesMatch = content.match(/names:\s*\[(.*?)\]/s);
                if (namesMatch) {
                    const namesStr = namesMatch[1];
                    // Split by comma and clean up each class name
                    return namesStr
                        .split(',')
                        .map((name) => name.trim().replace(/^['"]|['"]$/g, ''))
                        .filter((name) => name.length > 0);
                }

                // YAML format 2: names: \n  0: person \n  1: bicycle \n ...
                namesMatch = content.match(/names:\s*\n([\s\S]*?)(?:\n[a-z]|$)/);
                if (namesMatch) {
                    const namesStr = namesMatch[1];
                    // Extract values from "index: 'value'" format
                    const lines = namesStr.split('\n');
                    const labels = lines
                        .map((line) => {
                            // Match pattern like "67: 'cell phone'" or "67: cell phone"
                            const match = line.match(/^\s*\d+:\s*['"]?([^'"]+)['"]?\s*$/);
                            return match ? match[1].trim() : null;
                        })
                        .filter((name): name is string => name !== null && name.length > 0);
                    return labels;
                }
            }

            // For non-YAML files (txt), split by newlines
            let labels = content
                .split('\n')
                .map((line) => line.trim())
                .filter((line) => line.length > 0);

            // Remove numeric prefixes if present (e.g., "67: cell phone" -> "cell phone")
            if (labels.length > 0 && labels[0].includes(':')) {
                labels = labels.map((line) => {
                    const match = line.match(/^\d+:\s*(.+)$/);
                    return match ? match[1].trim() : line;
                });
            }

            return labels;
        } catch (error) {
            winston.warn(`Failed to load labels for ${modelName}:`, error);
            return [];
        }
    }

    /**
     * Get a model, loading it if necessary
     */
    private async getOrLoadModel(modelName: string): Promise<LoadedModel> {
        let model = this.models.get(modelName);
        if (!model) {
            await this.loadModel(modelName);
            model = this.models.get(modelName);
        }
        if (!model) {
            throw new TJBotError(`Failed to load model: ${modelName}`);
        }
        return model;
    }

    /**
     * Detect objects in an image.
     */
    async detectObjects(image: Buffer | string): Promise<ObjectDetectionResult[]> {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const localConfig = (this.config as any) ?? {};
        const detectionModelName = localConfig.detectionModel as string;

        // Lazy load model if needed
        const model = await this.getOrLoadModel(detectionModelName);

        try {
            // Preprocess image using model's expected input size
            const [, , height, width] = model.inputShape;
            const input = await this.preprocessImage(image, [width, height]);

            // Run inference
            const feeds: Record<string, ort.Tensor> = {};
            feeds[model.session.inputNames[0]] = input;
            const results = await model.session.run(feeds);

            // Postprocess YOLO output
            return this.postprocessDetection(results, model.labels, model.session.outputNames);
        } catch (error) {
            throw new TJBotError('Object detection failed', { cause: error as Error });
        }
    }

    /**
     * Classify an image.
     */
    async classifyImage(
        image: Buffer | string,
        confidenceThreshold: number = 0.5
    ): Promise<ImageClassificationResult[]> {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const localConfig = (this.config as any) ?? {};
        const classificationModelName = localConfig.classificationModel as string;

        // Lazy load model if needed
        const model = await this.getOrLoadModel(classificationModelName);

        try {
            // Preprocess image using model's expected input size
            const [, , height, width] = model.inputShape;
            const input = await this.preprocessImage(image, [width, height]);

            // Run inference
            const feeds: Record<string, ort.Tensor> = {};
            feeds[model.session.inputNames[0]] = input;
            const results = await model.session.run(feeds);

            // Postprocess classification output
            return this.postprocessClassification(
                results,
                model.labels,
                confidenceThreshold,
                model.session.outputNames
            );
        } catch (error) {
            throw new TJBotError('Image classification failed', { cause: error as Error });
        }
    }

    /**
     * Detect faces in an image.
     */
    async detectFaces(image: Buffer | string): Promise<FaceDetectionResult[]> {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const localConfig = (this.config as any) ?? {};
        const faceDetectionModelName = localConfig.faceDetectionModel as string;

        // Lazy load model if needed
        const model = await this.getOrLoadModel(faceDetectionModelName);

        try {
            // Preprocess image using model's expected input size
            const [, , height, width] = model.inputShape;
            const input = await this.preprocessImage(image, [width, height]);

            // Run inference
            const feeds: Record<string, ort.Tensor> = {};
            feeds[model.session.inputNames[0]] = input;
            const results = await model.session.run(feeds);

            // Postprocess face detection output
            return this.postprocessFaceDetection(results, model.session.outputNames);
        } catch (error) {
            throw new TJBotError('Face detection failed', { cause: error as Error });
        }
    }

    /**
     * Describe an image - not supported by ONNX backend.
     */
    async describeImage(_image: Buffer | string): Promise<ImageDescriptionResult> {
        throw new TJBotError(
            'Image description is only available with Azure Vision backend. Configure see.backend.type to "azure-vision".'
        );
    }

    /**
     * Postprocess YOLO object detection output
     */
    /**
     * Sigmoid function to normalize logits to 0-1 range
     */
    private sigmoid(x: number): number {
        return 1 / (1 + Math.exp(-x));
    }

    /**
     * Postprocess YOLO object detection output
     */
    private postprocessDetection(
        results: Record<string, ort.Tensor>,
        labels: string[],
        outputNames: readonly string[]
    ): ObjectDetectionResult[] {
        const outputName = outputNames[0];
        const outputData = results[outputName].data as Float32Array;

        // YOLO output format: [batch, num_detections, (x, y, w, h, confidence, class_scores...)]
        // For simplicity, assume each detection is 5 + num_classes values
        let detections: ObjectDetectionResult[] = [];
        const numClasses = labels.length || 80; // Default to 80 for COCO
        const valuesPerDetection = 5 + numClasses;

        for (let i = 0; i < outputData.length; i += valuesPerDetection) {
            // Apply sigmoid to normalize confidence (it's a logit from the model)
            const confidence = this.sigmoid(outputData[i + 4]);

            // Filter by confidence threshold (0.25)
            if (confidence < 0.25) continue;

            // Find class with highest probability (apply sigmoid to class scores too)
            let maxClassScore = 0;
            let maxClassIdx = 0;
            for (let j = 0; j < numClasses; j++) {
                const score = this.sigmoid(outputData[i + 5 + j]);
                if (score > maxClassScore) {
                    maxClassScore = score;
                    maxClassIdx = j;
                }
            }

            const label = labels[maxClassIdx] || `class${maxClassIdx}`;
            const x = outputData[i];
            const y = outputData[i + 1];
            const w = outputData[i + 2];
            const h = outputData[i + 3];

            detections.push({
                label,
                confidence: maxClassScore, // Use class score as confidence, not combined score
                bbox: [x, y, w, h],
            });
        }

        // Apply Non-Maximum Suppression (NMS) to remove duplicate detections
        detections = this.nonMaxSuppression(detections);

        return detections;
    }

    /**
     * Apply Non-Maximum Suppression to remove overlapping detections
     */
    private nonMaxSuppression(
        detections: ObjectDetectionResult[],
        iouThreshold: number = 0.5
    ): ObjectDetectionResult[] {
        if (detections.length === 0) return [];

        // Sort by confidence descending
        const sorted = [...detections].sort((a, b) => b.confidence - a.confidence);
        const kept: ObjectDetectionResult[] = [];

        for (const detection of sorted) {
            // Check if this detection overlaps with any kept detection
            let overlaps = false;
            for (const kept_det of kept) {
                const iou = this.calculateIoU(detection.bbox, kept_det.bbox);
                if (iou > iouThreshold) {
                    overlaps = true;
                    break;
                }
            }

            if (!overlaps) {
                kept.push(detection);
            }
        }

        return kept;
    }

    /**
     * Calculate Intersection over Union (IoU) between two bounding boxes
     * bbox format: [x, y, w, h]
     */
    private calculateIoU(bbox1: number[], bbox2: number[]): number {
        const [x1, y1, w1, h1] = bbox1;
        const [x2, y2, w2, h2] = bbox2;

        // Convert to [x_min, y_min, x_max, y_max] format
        const box1_x_min = x1;
        const box1_y_min = y1;
        const box1_x_max = x1 + w1;
        const box1_y_max = y1 + h1;

        const box2_x_min = x2;
        const box2_y_min = y2;
        const box2_x_max = x2 + w2;
        const box2_y_max = y2 + h2;

        // Calculate intersection area
        const inter_x_min = Math.max(box1_x_min, box2_x_min);
        const inter_y_min = Math.max(box1_y_min, box2_y_min);
        const inter_x_max = Math.min(box1_x_max, box2_x_max);
        const inter_y_max = Math.min(box1_y_max, box2_y_max);

        const inter_width = Math.max(0, inter_x_max - inter_x_min);
        const inter_height = Math.max(0, inter_y_max - inter_y_min);
        const intersection = inter_width * inter_height;

        // Calculate union area
        const box1_area = w1 * h1;
        const box2_area = w2 * h2;
        const union = box1_area + box2_area - intersection;

        // Avoid division by zero
        if (union === 0) return 0;

        return intersection / union;
    }

    /**
     * Postprocess classification output
     */
    private postprocessClassification(
        results: Record<string, ort.Tensor>,
        labels: string[],
        confidenceThreshold: number,
        outputNames: readonly string[]
    ): ImageClassificationResult[] {
        const outputName = outputNames[0];
        const scores = results[outputName].data as Float32Array;

        // Create results for all classes, then filter by threshold and sort
        const allResults = Array.from(scores)
            .map((score, i) => ({
                label: labels[i] || `class${i}`,
                confidence: score,
            }))
            .filter((result) => result.confidence >= confidenceThreshold)
            .sort((a, b) => b.confidence - a.confidence);

        return allResults;
    }

    /**
     * Postprocess face detection output from YuNet
     * YuNet outputs: [n_faces, 15] where each face has [x, y, w, h, confidence, landmarks_x, landmarks_y, ...]
     */
    private postprocessFaceDetection(
        results: Record<string, ort.Tensor>,
        outputNames: readonly string[]
    ): FaceDetectionResult[] {
        const outputName = outputNames[0];
        const detections = results[outputName].data as Float32Array;

        const faces: FaceDetectionResult[] = [];

        // YuNet output format per face: 15 values
        // [x, y, w, h, confidence, x1, y1, x2, y2, x3, y3, x4, y4, x5, y5]
        // where x1-y5 are 5 landmark points
        const valuesPerFace = 15;

        for (let i = 0; i < detections.length; i += valuesPerFace) {
            if (i + valuesPerFace > detections.length) break;

            const x = detections[i];
            const y = detections[i + 1];
            const w = detections[i + 2];
            const h = detections[i + 3];
            const confidence = detections[i + 4];

            // Extract 5 landmarks
            const landmarks: Landmark[] = [];
            const landmarkTypes = ['eye-left', 'eye-right', 'nose', 'mouth-left', 'mouth-right'];
            for (let j = 0; j < 5; j++) {
                landmarks.push({
                    x: detections[i + 5 + j * 2],
                    y: detections[i + 6 + j * 2],
                    type: landmarkTypes[j],
                });
            }

            faces.push({
                boundingBox: [x, y, w, h],
                confidence,
                landmarks,
            });
        }

        return faces;
    }

    /**
     * Preprocess image to Float32 tensor for ONNX model
     */
    private async preprocessImage(image: Buffer | string, size: [number, number]): Promise<ort.Tensor> {
        let imgBuf: Buffer;
        if (typeof image === 'string') {
            imgBuf = fs.readFileSync(image);
        } else {
            imgBuf = image;
        }

        // Use sharp to resize and get raw RGB
        const { data, info: _info } = await sharp(imgBuf)
            .resize(size[0], size[1])
            .removeAlpha()
            .raw()
            .toBuffer({ resolveWithObject: true });

        // Normalize to [0,1] and convert to Float32Array
        const float = new Float32Array(data.length);
        for (let i = 0; i < data.length; ++i) float[i] = data[i] / 255.0;

        // ONNX expects NCHW: [1,3,H,W]
        const [W, H] = size;
        const input = new Float32Array(3 * H * W);
        for (let y = 0; y < H; ++y) {
            for (let x = 0; x < W; ++x) {
                for (let c = 0; c < 3; ++c) {
                    input[c * H * W + y * W + x] = float[y * W * 3 + x * 3 + c];
                }
            }
        }

        return new ort.Tensor('float32', input, [1, 3, H, W]);
    }
}
