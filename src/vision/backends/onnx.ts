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
    ImageSegmentationResult,
    ObjectDetectionResult,
    VisionEngine,
} from '../vision-engine.js';
import path from 'path';

export class ONNXVisionEngine extends VisionEngine {
    private manager: ModelManager = ModelManager.getInstance();
    private modelPath: string | undefined;
    private modelLabels: string[] = [];
    private session?: ort.InferenceSession;

    constructor(config?: SeeBackendConfig) {
        super(config);
    }

    /**
     * Initialize the ONNX vision engine.
     * Pre-downloads the configured model.
     */
    async initialize(): Promise<void> {
        try {
            // Front-load model download during initialization
            this.modelPath = await this.ensureModelIsDownloaded();

            // Initialize ONNX session
            this.session = await ort.InferenceSession.create(this.modelPath);

            winston.info('👁️ ONNX vision engine initialized');
        } catch (error) {
            winston.error('Failed to initialize ONNX vision engine:', error);
            throw new TJBotError('Failed to initialize ONNX vision engine', { cause: error as Error });
        }
    }

    /**
     * Ensure the vision model is downloaded and return its local path.
     * @returns Path to the vision model file.
     * @throws {TJBotError} if model download fails
     */
    private async ensureModelIsDownloaded(): Promise<string> {
        try {
            const model = await this.manager.loadModel<VisionModelMetadata>(this.config.model as string);
            const cacheDir = this.manager.getTTSModelCacheDir();
            return path.join(cacheDir, model.folder, model.required[0]);
        } catch (error) {
            throw new TJBotError('Failed to load TTS model path', { cause: error as Error });
        }
    }

    async detectObjects(image: Buffer | string): Promise<ObjectDetectionResult[]> {
        if (!this.session) throw new Error('ONNX session not initialized');
        // Only works for YOLO-like models for now
        // 1. Preprocess image
        const input = await this.preprocessImage(image, [640, 640]);
        // 2. Run inference
        const feeds: Record<string, ort.Tensor> = {};
        feeds[this.session.inputNames[0]] = input;
        const results = await this.session.run(feeds);
        // 3. Postprocess output (YOLOv5/YOLOv8 style)
        // Assumes output is [batch, num_boxes, 5+num_classes]: [x, y, w, h, conf, ...class_scores]
        const outputName = this.session.outputNames[0];
        const output = results[outputName].data as Float32Array;
        const shape = results[outputName].dims; // [1, num_boxes, 5+num_classes]
        const numBoxes = shape[1];
        const numClasses = shape[2] - 5;
        const boxes: ObjectDetectionResult[] = [];
        const confThreshold = 0.25;
        for (let i = 0; i < numBoxes; ++i) {
            const offset = i * (5 + numClasses);
            const x = output[offset];
            const y = output[offset + 1];
            const w = output[offset + 2];
            const h = output[offset + 3];
            const objConf = output[offset + 4];
            // Find class with max score
            let maxClass = 0;
            let maxScore = -Infinity;
            for (let c = 0; c < numClasses; ++c) {
                const score = output[offset + 5 + c];
                if (score > maxScore) {
                    maxScore = score;
                    maxClass = c;
                }
            }
            const confidence = objConf * maxScore;
            if (confidence > confThreshold) {
                boxes.push({
                    label: this.modelLabels[maxClass] || `class${maxClass}`,
                    confidence,
                    bbox: [x, y, w, h],
                });
            }
        }
        // Optionally: NMS (not implemented here)
        return boxes;
    }

    async classifyImage(image: Buffer | string): Promise<ImageClassificationResult[]> {
        if (!this.session) throw new Error('ONNX session not initialized');
        // 1. Preprocess image
        const input = await this.preprocessImage(image, [224, 224]);
        // 2. Run inference
        const feeds: Record<string, ort.Tensor> = {};
        feeds[this.session.inputNames[0]] = input;
        const results = await this.session.run(feeds);
        // 3. Postprocess output (assume softmax)
        const outputName = this.session.outputNames[0];
        const scores = results[outputName].data as Float32Array;
        // Get top-5
        const top = Array.from(scores)
            .map((score, i) => ({ label: this.modelLabels[i] || `class${i}`, confidence: score }))
            .sort((a, b) => b.confidence - a.confidence)
            .slice(0, 5);
        return top;
    }

    async segmentImage(image: Buffer | string): Promise<ImageSegmentationResult> {
        if (!this.session) throw new Error('ONNX session not initialized');
        // 1. Preprocess image
        const input = await this.preprocessImage(image, [513, 513]);
        // 2. Run inference
        const feeds: Record<string, ort.Tensor> = {};
        feeds[this.session.inputNames[0]] = input;
        const results = await this.session.run(feeds);
        // 3. Postprocess output (assume mask in output)
        const outputName = this.session.outputNames[0];
        const mask = Buffer.from(results[outputName].data as Uint8Array);
        return { mask, width: 513, height: 513, labels: this.modelLabels };
    }

    /**
     * Preprocess image to Float32 tensor for ONNX model
     * @param image Buffer or file path
     * @param size [width, height]
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
