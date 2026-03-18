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
import path from 'path';
import sharp from 'sharp';
import winston from 'winston';
import { ModelRegistry, TJBotError } from '../../utils/index.js';
import { LogEmoji } from '../../utils/logging.js';
import { VisionEngine, } from '../vision-engine.js';
const EMO = LogEmoji.VISION;
export class ONNXVisionEngine extends VisionEngine {
    manager = ModelRegistry.getInstance();
    models = new Map();
    /**
     * Initialize the ONNX vision engine.
     */
    async initialize() {
        if (this.config === undefined) {
            throw new TJBotError('ONNX vision engine config is missing');
        }
        if (this.config.objectDetectionModel === undefined) {
            throw new TJBotError('ONNX vision engine config is missing required parameter: objectDetectionModel');
        }
        if (this.config.imageClassificationModel === undefined) {
            throw new TJBotError('ONNX vision engine config is missing required parameter: imageClassificationModel');
        }
        if (this.config.faceDetectionModel === undefined) {
            throw new TJBotError('ONNX vision engine config is missing required parameter: faceDetectionModel');
        }
        // Eagerly load all models
        await this.loadModel(this.config.objectDetectionModel);
        await this.loadModel(this.config.imageClassificationModel);
        await this.loadModel(this.config.faceDetectionModel);
        winston.info(`${EMO} ONNX vision engine initialized`);
        winston.debug(`${EMO} Initialized ONNXVisionEngine with config:
            objectDetectionModel: ${this.config.objectDetectionModel},
            objectDetectionConfidence: ${this.config.objectDetectionConfidence},
            imageClassificationModel: ${this.config.imageClassificationModel},
            imageClassificationConfidence: ${this.config.imageClassificationConfidence},
            faceDetectionModel: ${this.config.faceDetectionModel},
            faceDetectionConfidence: ${this.config.faceDetectionConfidence}`);
    }
    /**
     * Load a model
     */
    async loadModel(modelName) {
        if (modelName === undefined) {
            throw new TJBotError('Cannot load model: modelName is undefined');
        }
        if (this.models.has(modelName)) {
            return; // Already loaded
        }
        winston.verbose(`${EMO} Loading ONNX model: ${modelName}`);
        // Get model metadata and download
        const metadata = await this.manager.loadModel(modelName);
        // Build model path
        const modelCacheDir = this.manager.getModelCacheDirForType('vision');
        const modelDir = path.join(modelCacheDir, metadata.folder);
        // Find the ONNX model file in the required files
        const onnxFile = metadata.required.find((file) => file.endsWith('.onnx'));
        if (!onnxFile) {
            throw new TJBotError(`No ONNX file found in model requirements for: ${modelName}`);
        }
        const modelPath = path.join(modelDir, onnxFile);
        // Create ONNX session
        const session = await ort.InferenceSession.create(modelPath);
        // Load labels if available
        let labels = [];
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
        winston.info(`${EMO} Loaded ONNX model: ${modelName} (${metadata.kind})`);
    }
    /**
     * Load label file for a model
     */
    async loadLabels(modelName, metadata, modelDir) {
        winston.info(`${EMO} Loading labels for model: ${modelName}`);
        try {
            // Try common label file names based on model kind
            let labelFile;
            if (metadata.kind === 'detection') {
                // Look for classes.txt, coco.yaml or coco.names
                const possibleNames = ['classes.txt', 'coco.yaml', 'coco.names'];
                for (const name of possibleNames) {
                    if (fs.existsSync(path.join(modelDir, name))) {
                        labelFile = path.join(modelDir, name);
                        break;
                    }
                }
            }
            else if (metadata.kind === 'classification') {
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
                winston.warn(`${EMO} No label file found for model: ${modelName}`);
                return [];
            }
            winston.debug(`${EMO} Found label file for ${modelName}: ${labelFile}`);
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
                        .filter((name) => name !== null && name.length > 0);
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
        }
        catch (error) {
            winston.warn(`Failed to load labels for ${modelName}:`, error);
            return [];
        }
    }
    /**
     * Get a model, loading it if necessary
     */
    async getOrLoadModel(modelName) {
        let model = this.models.get(modelName);
        if (!model) {
            winston.debug(`${EMO} model ${modelName} not yet loaded, loading now...`);
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
    async detectObjects(image) {
        if (this.config.objectDetectionModel === undefined) {
            throw new TJBotError('Object detection model is not configured for ONNX vision engine');
        }
        if (this.config.objectDetectionConfidence === undefined) {
            throw new TJBotError('Object detection confidence threshold is not configured for ONNX vision engine');
        }
        const modelName = this.config.objectDetectionModel;
        const confidenceThreshold = this.config.objectDetectionConfidence;
        winston.info(`${EMO} Running object detection using model ${modelName} with confidence threshold ${confidenceThreshold}`);
        const model = await this.getOrLoadModel(modelName);
        try {
            // Preprocess image using model's expected input size
            const [, , height, width] = model.inputShape;
            const input = await this.preprocessImage(image, [width, height]);
            // Run inference
            const feeds = {};
            feeds[model.session.inputNames[0]] = input;
            const results = await model.session.run(feeds);
            // Postprocess YOLO output
            return this.postprocessDetection(results, model.labels, model.session.outputNames, confidenceThreshold);
        }
        catch (error) {
            throw new TJBotError('Object detection failed', { cause: error });
        }
    }
    /**
     * Classify an image.
     */
    async classifyImage(image) {
        if (this.config.imageClassificationModel === undefined) {
            throw new TJBotError('Image classification model is not configured for ONNX vision engine');
        }
        if (this.config.imageClassificationConfidence === undefined) {
            throw new TJBotError('Image classification confidence threshold is not configured for ONNX vision engine');
        }
        const modelName = this.config.imageClassificationModel;
        const confidenceThreshold = this.config.imageClassificationConfidence;
        winston.info(`${EMO} Running image classification using model ${modelName} with confidence threshold ${confidenceThreshold}`);
        const model = await this.getOrLoadModel(modelName);
        try {
            // Preprocess image using model's expected input size
            const [, , height, width] = model.inputShape;
            const input = await this.preprocessImage(image, [width, height]);
            // Run inference
            const feeds = {};
            feeds[model.session.inputNames[0]] = input;
            const results = await model.session.run(feeds);
            // Postprocess classification output
            return this.postprocessClassification(results, model.labels, confidenceThreshold, model.session.outputNames);
        }
        catch (error) {
            throw new TJBotError('Image classification failed', { cause: error });
        }
    }
    /**
     * Detect faces in an image.
     */
    async detectFaces(image) {
        if (this.config.faceDetectionModel === undefined) {
            throw new TJBotError('Face detection model is not configured for ONNX vision engine');
        }
        if (this.config.faceDetectionConfidence === undefined) {
            throw new TJBotError('Face detection confidence threshold is not configured for ONNX vision engine');
        }
        const modelName = this.config.faceDetectionModel;
        const confidenceThreshold = this.config.faceDetectionConfidence;
        winston.info(`${EMO} Running face detection using model ${modelName} with confidence threshold ${confidenceThreshold}`);
        const model = await this.getOrLoadModel(modelName);
        try {
            // Preprocess image using model's expected input size
            const [, , height, width] = model.inputShape;
            const input = await this.preprocessFaceImage(image, [width, height], modelName);
            // Run inference
            const feeds = {};
            feeds[model.session.inputNames[0]] = input;
            const results = await model.session.run(feeds);
            winston.debug(`Face model output: ${model.session.outputNames.join(', ')}`);
            const outputTensor = results[model.session.outputNames[0]];
            winston.debug(`Output shape: [${outputTensor.dims.join(', ')}], size: ${outputTensor.size}`);
            // Postprocess face detection output
            const metadata = this.postprocessFaceDetection(results, confidenceThreshold, [width, height]);
            return {
                isFaceDetected: metadata.length > 0,
                metadata,
            };
        }
        catch (error) {
            throw new TJBotError('Face detection failed', { cause: error });
        }
    }
    /**
     * Describe an image - not supported by ONNX backend.
     */
    async describeImage(_image) {
        throw new TJBotError('Image description is only available with Azure Vision backend. Configure see.backend.type to "azure-vision".');
    }
    /**
     * Sigmoid function to normalize logits to 0-1 range
     */
    sigmoid(x) {
        return 1 / (1 + Math.exp(-x));
    }
    postprocessDetection(results, labels, outputNames, confidenceThreshold = 0.8) {
        const isSSDMobileNetV2 = outputNames.some((name) => name.includes('BoxPredictor_'));
        if (isSSDMobileNetV2) {
            return this.postprocessSSDMobileNetV2(results, labels, confidenceThreshold);
        }
        // Fallback for YOLO-style output [batch, num_detections, (x, y, w, h, conf, class_scores...)]
        const outputName = outputNames[0];
        const outputData = results[outputName].data;
        let detections = [];
        const numClasses = labels.length || 80;
        const valuesPerDetection = 5 + numClasses;
        for (let i = 0; i < outputData.length; i += valuesPerDetection) {
            const confidence = this.sigmoid(outputData[i + 4]);
            if (confidence < confidenceThreshold)
                continue;
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
                confidence: maxClassScore,
                bbox: [x, y, w, h],
            });
        }
        detections = this.nonMaxSuppression(detections);
        return detections;
    }
    /**
     * Decode SSD MobileNet v2 raw predictor outputs into object detections.
     */
    postprocessSSDMobileNetV2(results, labels, confidenceThreshold) {
        const boxScales = {
            x: 10,
            y: 10,
            w: 5,
            h: 5,
        };
        const featureMapShapes = [
            [19, 19],
            [10, 10],
            [5, 5],
            [3, 3],
            [2, 2],
            [1, 1],
        ];
        const anchorsByLayer = this.generateSSDMobileNetV2Anchors(featureMapShapes);
        const detections = [];
        for (let layer = 0; layer < featureMapShapes.length; layer++) {
            const boxTensor = results[`BoxPredictor_${layer}/BoxEncodingPredictor/BiasAdd:0`];
            const classTensor = results[`BoxPredictor_${layer}/ClassPredictor/BiasAdd:0`];
            if (!boxTensor || !classTensor) {
                continue;
            }
            const boxData = boxTensor.data;
            const classData = classTensor.data;
            const [, boxChannels, h, w] = boxTensor.dims;
            const [, classChannels] = classTensor.dims;
            const numAnchorsPerCell = boxChannels / 4;
            const numClassesWithBackground = classChannels / numAnchorsPerCell;
            for (let y = 0; y < h; y++) {
                for (let x = 0; x < w; x++) {
                    for (let a = 0; a < numAnchorsPerCell; a++) {
                        const anchorIdxInLayer = (y * w + x) * numAnchorsPerCell + a;
                        const anchor = anchorsByLayer[layer][anchorIdxInLayer];
                        if (!anchor)
                            continue;
                        const classLogits = new Float32Array(numClassesWithBackground);
                        for (let c = 0; c < numClassesWithBackground; c++) {
                            const classChannel = a * numClassesWithBackground + c;
                            const classOffset = (classChannel * h + y) * w + x;
                            classLogits[c] = classData[classOffset];
                        }
                        const probs = this.softmax(classLogits);
                        // Class index 0 is background for SSD models.
                        let bestClass = 0;
                        let bestScore = 0;
                        for (let c = 1; c < probs.length; c++) {
                            if (probs[c] > bestScore) {
                                bestScore = probs[c];
                                bestClass = c;
                            }
                        }
                        if (bestScore < confidenceThreshold) {
                            continue;
                        }
                        // Box tensor channel layout per anchor: [ty, tx, th, tw]
                        const ty = boxData[((a * 4 + 0) * h + y) * w + x];
                        const tx = boxData[((a * 4 + 1) * h + y) * w + x];
                        const th = boxData[((a * 4 + 2) * h + y) * w + x];
                        const tw = boxData[((a * 4 + 3) * h + y) * w + x];
                        const yCenter = (ty / boxScales.y) * anchor.h + anchor.cy;
                        const xCenter = (tx / boxScales.x) * anchor.w + anchor.cx;
                        const boxH = Math.exp(th / boxScales.h) * anchor.h;
                        const boxW = Math.exp(tw / boxScales.w) * anchor.w;
                        const xMin = Math.max(0, Math.min(1, xCenter - boxW / 2));
                        const yMin = Math.max(0, Math.min(1, yCenter - boxH / 2));
                        const xMax = Math.max(0, Math.min(1, xCenter + boxW / 2));
                        const yMax = Math.max(0, Math.min(1, yCenter + boxH / 2));
                        const width = xMax - xMin;
                        const height = yMax - yMin;
                        if (width <= 0 || height <= 0) {
                            continue;
                        }
                        const labelIndex = bestClass - 1;
                        const label = labels[labelIndex] || `class${labelIndex}`;
                        detections.push({
                            label,
                            confidence: bestScore,
                            bbox: [xMin, yMin, width, height],
                        });
                    }
                }
            }
        }
        return this.nonMaxSuppression(detections);
    }
    /**
     * Generate normalized anchors for SSD MobileNet v2 with input size 300x300.
     */
    generateSSDMobileNetV2Anchors(featureMapShapes) {
        const minScale = 0.2;
        const maxScale = 0.95;
        const aspectRatios = [1.0, 2.0, 0.5, 3.0, 1.0 / 3.0];
        const anchorsByLayer = [];
        const scaleForLayer = (layer) => {
            if (featureMapShapes.length === 1) {
                return (minScale + maxScale) * 0.5;
            }
            return minScale + ((maxScale - minScale) * layer) / (featureMapShapes.length - 1);
        };
        for (let layer = 0; layer < featureMapShapes.length; layer++) {
            const [featH, featW] = featureMapShapes[layer];
            const scale = scaleForLayer(layer);
            const nextScale = layer === featureMapShapes.length - 1 ? 1.0 : scaleForLayer(layer + 1);
            const layerAnchors = [];
            const anchorSizes = [];
            if (layer === 0) {
                // Reduced anchor set on first layer per TF SSD config.
                anchorSizes.push({ w: 0.1, h: 0.1 });
                anchorSizes.push({ w: scale * Math.sqrt(2.0), h: scale / Math.sqrt(2.0) });
                anchorSizes.push({ w: scale / Math.sqrt(2.0), h: scale * Math.sqrt(2.0) });
            }
            else {
                for (const ratio of aspectRatios) {
                    const ratioSqrt = Math.sqrt(ratio);
                    anchorSizes.push({ w: scale * ratioSqrt, h: scale / ratioSqrt });
                }
                // Interpolated scale anchor with aspect ratio 1.0.
                const interpolated = Math.sqrt(scale * nextScale);
                anchorSizes.push({ w: interpolated, h: interpolated });
            }
            for (let y = 0; y < featH; y++) {
                for (let x = 0; x < featW; x++) {
                    const cy = (y + 0.5) / featH;
                    const cx = (x + 0.5) / featW;
                    for (const sz of anchorSizes) {
                        layerAnchors.push({ cx, cy, w: sz.w, h: sz.h });
                    }
                }
            }
            anchorsByLayer.push(layerAnchors);
        }
        return anchorsByLayer;
    }
    softmax(values) {
        let max = -Infinity;
        for (let i = 0; i < values.length; i++) {
            if (values[i] > max)
                max = values[i];
        }
        const exps = new Float32Array(values.length);
        let sum = 0;
        for (let i = 0; i < values.length; i++) {
            const e = Math.exp(values[i] - max);
            exps[i] = e;
            sum += e;
        }
        if (sum === 0)
            return exps;
        for (let i = 0; i < exps.length; i++) {
            exps[i] /= sum;
        }
        return exps;
    }
    /**
     * Apply Non-Maximum Suppression to remove overlapping detections
     */
    nonMaxSuppression(detections, iouThreshold = 0.5) {
        if (detections.length === 0)
            return [];
        // Sort by confidence descending
        const sorted = [...detections].sort((a, b) => b.confidence - a.confidence);
        const kept = [];
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
    calculateIoU(bbox1, bbox2) {
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
        if (union === 0)
            return 0;
        return intersection / union;
    }
    /**
     * Postprocess classification output
     */
    postprocessClassification(results, labels, confidenceThreshold, outputNames) {
        const outputName = outputNames[0];
        const scores = results[outputName].data;
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
     * Postprocess face detection output.
     */
    postprocessFaceDetection(results, confidenceThreshold = 0.5, modelInputSize) {
        return this.postprocessSCRFDFaceDetection(results, confidenceThreshold, modelInputSize);
    }
    /**
     * Postprocess face detection output from SCRFD-2.5G.
     */
    postprocessSCRFDFaceDetection(results, confidenceThreshold = 0.5, modelInputSize) {
        const [modelWidth, modelHeight] = modelInputSize || [640, 640];
        const faces = [];
        const scales = [
            { stride: 8, scoreKey: '446', bboxKey: '449', kpsKey: '452' },
            { stride: 16, scoreKey: '466', bboxKey: '469', kpsKey: '472' },
            { stride: 32, scoreKey: '486', bboxKey: '489', kpsKey: '492' },
        ];
        winston.debug(`${EMO} Processing SCRFD-2.5G multi-scale output...`);
        for (const scale of scales) {
            const scoreTensor = results[scale.scoreKey];
            const bboxTensor = results[scale.bboxKey];
            const kpsTensor = results[scale.kpsKey];
            if (!scoreTensor || !bboxTensor) {
                winston.warn(`${EMO} Missing SCRFD tensors for stride ${scale.stride}`);
                continue;
            }
            const scores = scoreTensor.data;
            const bboxes = bboxTensor.data;
            const kps = kpsTensor?.data;
            const gridSize = modelWidth / scale.stride;
            const numAnchors = 2;
            for (let i = 0; i < scores.length; i++) {
                const confidence = scores[i];
                if (confidence < confidenceThreshold)
                    continue;
                const anchorIndex = Math.floor(i / numAnchors);
                const gridY = Math.floor(anchorIndex / gridSize);
                const gridX = anchorIndex % gridSize;
                const anchorX = (gridX + 0.5) * scale.stride;
                const anchorY = (gridY + 0.5) * scale.stride;
                const left = bboxes[i * 4 + 0] * scale.stride;
                const top = bboxes[i * 4 + 1] * scale.stride;
                const right = bboxes[i * 4 + 2] * scale.stride;
                const bottom = bboxes[i * 4 + 3] * scale.stride;
                const x1 = Math.max(0, anchorX - left);
                const y1 = Math.max(0, anchorY - top);
                const x2 = Math.min(modelWidth, anchorX + right);
                const y2 = Math.min(modelHeight, anchorY + bottom);
                if (x2 <= x1 || y2 <= y1)
                    continue;
                const boxW = x2 - x1;
                const boxH = y2 - y1;
                const landmarks = [];
                if (kps && kps.length >= i * 10 + 10) {
                    const landmarkTypes = ['eye-left', 'eye-right', 'nose', 'mouth-left', 'mouth-right'];
                    for (let j = 0; j < 5; j++) {
                        const kx = (kps[i * 10 + j * 2] * scale.stride + anchorX) / modelWidth;
                        const ky = (kps[i * 10 + j * 2 + 1] * scale.stride + anchorY) / modelHeight;
                        landmarks.push({
                            x: Math.min(1, Math.max(0, kx)),
                            y: Math.min(1, Math.max(0, ky)),
                            type: landmarkTypes[j],
                        });
                    }
                }
                faces.push({
                    boundingBox: [x1 / modelWidth, y1 / modelHeight, boxW / modelWidth, boxH / modelHeight],
                    confidence,
                    landmarks,
                });
            }
        }
        return this.applyNMS(faces, 0.45);
    }
    /**
     * Preprocess face image for SCRFD input requirements.
     */
    async preprocessFaceImage(image, size, _modelName) {
        let imgBuf;
        if (typeof image === 'string') {
            imgBuf = fs.readFileSync(image);
        }
        else {
            imgBuf = image;
        }
        const { data } = await sharp(imgBuf)
            .resize(size[0], size[1])
            .removeAlpha()
            .raw()
            .toBuffer({ resolveWithObject: true });
        const [W, H] = size;
        const input = new Float32Array(3 * H * W);
        for (let y = 0; y < H; ++y) {
            for (let x = 0; x < W; ++x) {
                const offset = y * W * 3 + x * 3;
                const r = data[offset] / 255.0;
                const g = data[offset + 1] / 255.0;
                const b = data[offset + 2] / 255.0;
                input[0 * H * W + y * W + x] = b * 2.0 - 1.0;
                input[1 * H * W + y * W + x] = g * 2.0 - 1.0;
                input[2 * H * W + y * W + x] = r * 2.0 - 1.0;
            }
        }
        return new ort.Tensor('float32', input, [1, 3, H, W]);
    }
    /**
     * Apply Non-Maximum Suppression to remove overlapping face detections
     * @param faces Array of detected faces
     * @param iouThreshold IoU threshold for suppression (default 0.5)
     * @returns Filtered array of non-overlapping faces
     */
    applyNMS(faces, iouThreshold = 0.5) {
        if (faces.length === 0)
            return faces;
        // Sort by confidence descending
        const sortedFaces = [...faces].sort((a, b) => b.confidence - a.confidence);
        const result = [];
        const suppressed = new Array(sortedFaces.length).fill(false);
        for (let i = 0; i < sortedFaces.length; i++) {
            if (suppressed[i])
                continue;
            result.push(sortedFaces[i]);
            // Suppress overlapping faces
            for (let j = i + 1; j < sortedFaces.length; j++) {
                if (suppressed[j])
                    continue;
                const iou = this.computeIoU(sortedFaces[i].boundingBox, sortedFaces[j].boundingBox);
                if (iou > iouThreshold) {
                    suppressed[j] = true;
                }
            }
        }
        return result;
    }
    /**
     * Compute Intersection over Union (IoU) between two bounding boxes
     * @param box1 [x, y, w, h]
     * @param box2 [x, y, w, h]
     * @returns IoU value between 0 and 1
     */
    computeIoU(box1, box2) {
        const [x1, y1, w1, h1] = box1;
        const [x2, y2, w2, h2] = box2;
        // Convert to [x_min, y_min, x_max, y_max] format
        const x1_min = x1;
        const y1_min = y1;
        const x1_max = x1 + w1;
        const y1_max = y1 + h1;
        const x2_min = x2;
        const y2_min = y2;
        const x2_max = x2 + w2;
        const y2_max = y2 + h2;
        // Compute intersection
        const inter_x_min = Math.max(x1_min, x2_min);
        const inter_y_min = Math.max(y1_min, y2_min);
        const inter_x_max = Math.min(x1_max, x2_max);
        const inter_y_max = Math.min(y1_max, y2_max);
        if (inter_x_min >= inter_x_max || inter_y_min >= inter_y_max) {
            return 0; // No intersection
        }
        const interArea = (inter_x_max - inter_x_min) * (inter_y_max - inter_y_min);
        const box1Area = w1 * h1;
        const box2Area = w2 * h2;
        const unionArea = box1Area + box2Area - interArea;
        return interArea / unionArea;
    }
    /**
     * Preprocess image to Float32 tensor for ONNX model
     */
    async preprocessImage(image, size) {
        let imgBuf;
        if (typeof image === 'string') {
            imgBuf = fs.readFileSync(image);
        }
        else {
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
        for (let i = 0; i < data.length; ++i)
            float[i] = data[i] / 255.0;
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
//# sourceMappingURL=onnx.js.map