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
import { ComputerVisionClient } from '@azure/cognitiveservices-computervision';
import { ApiKeyCredentials } from '@azure/ms-rest-js';
import fs from 'fs';
import winston from 'winston';
import { loadAzureCredentials } from '../../utils/credentials.js';
import { TJBotError } from '../../utils/index.js';
import { LogEmoji } from '../../utils/logging.js';
import { VisionEngine, } from '../vision-engine.js';
const EMO = LogEmoji.VISION;
export class AzureVisionEngine extends VisionEngine {
    visionKey;
    visionEndpoint;
    client;
    async initialize() {
        const config = this.config;
        const credentials = loadAzureCredentials(config?.credentialsPath);
        this.visionKey = credentials.visionKey;
        this.visionEndpoint = credentials.visionEndpoint;
        if (!this.visionKey || !this.visionEndpoint) {
            throw new TJBotError('Azure Vision visionKey and visionEndpoint are required');
        }
        const apiKeyCredentials = new ApiKeyCredentials({ inHeader: { 'Ocp-Apim-Subscription-Key': this.visionKey } });
        this.client = new ComputerVisionClient(apiKeyCredentials, this.visionEndpoint);
        winston.info(`${EMO} Azure Vision engine initialized`);
        winston.debug(`${EMO} Initialized AzureVisionEngine with config:
            visionKey: ${this.visionKey ? '***' : 'not set'},
            visionEndpoint: ${this.visionEndpoint ? this.visionEndpoint : 'not set'}`);
    }
    readImageBuffer(image) {
        if (typeof image === 'string') {
            return fs.readFileSync(image);
        }
        return image;
    }
    getObjectDetectionConfidenceThreshold() {
        const config = this.config;
        if (config.objectDetectionConfidence === undefined) {
            throw new TJBotError('Object detection confidence threshold is not configured for Azure Vision engine');
        }
        return config.objectDetectionConfidence;
    }
    getImageClassificationConfidenceThreshold() {
        const config = this.config;
        if (config.imageClassificationConfidence === undefined) {
            throw new TJBotError('Image classification confidence threshold is not configured for Azure Vision engine');
        }
        return config.imageClassificationConfidence;
    }
    async detectObjects(image) {
        if (!this.client) {
            throw new TJBotError('Azure Vision client not initialized. Call initialize() first.');
        }
        const resolvedConfidenceThreshold = this.getObjectDetectionConfidenceThreshold();
        winston.verbose(`${EMO} Running object detection using Azure Computer Vision API`);
        const imageBuffer = this.readImageBuffer(image);
        try {
            const result = await this.client.analyzeImageInStream(imageBuffer, {
                visualFeatures: ['Objects'],
            });
            const objects = result.objects ?? [];
            return objects
                .map((obj) => ({
                label: obj.object ?? 'unknown',
                confidence: obj.confidence ?? 0,
                bbox: [
                    obj.rectangle?.x ?? 0,
                    obj.rectangle?.y ?? 0,
                    obj.rectangle?.w ?? 0,
                    obj.rectangle?.h ?? 0,
                ],
            }))
                .filter((obj) => obj.confidence >= resolvedConfidenceThreshold)
                .sort((a, b) => b.confidence - a.confidence);
        }
        catch (error) {
            throw new TJBotError(`Azure Vision API error during object detection: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async classifyImage(image) {
        if (!this.client) {
            throw new TJBotError('Azure Vision client not initialized. Call initialize() first.');
        }
        const resolvedConfidenceThreshold = this.getImageClassificationConfidenceThreshold();
        winston.verbose(`${EMO} Classifying image with Azure Computer Vision API`);
        const imageBuffer = this.readImageBuffer(image);
        try {
            const result = await this.client.analyzeImageInStream(imageBuffer, {
                visualFeatures: ['Tags'],
            });
            const tags = result.tags ?? [];
            return tags
                .filter((tag) => tag.confidence && tag.confidence >= resolvedConfidenceThreshold)
                .map((tag) => ({
                label: tag.name ?? 'unknown',
                confidence: tag.confidence ?? 0,
            }))
                .sort((a, b) => b.confidence - a.confidence);
        }
        catch (error) {
            throw new TJBotError(`Azure Vision API error during classification: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async detectFaces(image) {
        void image;
        throw new TJBotError('Face detection is not supported by the Azure Computer Vision service. Please use another backend for face detection.');
    }
    async describeImage(image) {
        if (!this.client) {
            throw new TJBotError('Azure Vision client not initialized. Call initialize() first.');
        }
        winston.verbose(`${EMO} Describing image with Azure Computer Vision API`);
        const imageBuffer = this.readImageBuffer(image);
        try {
            const result = await this.client.analyzeImageInStream(imageBuffer, {
                visualFeatures: ['Description'],
            });
            // Handle description array - take first caption if available
            const descriptions = result
                .description?.captions ?? [];
            const firstCaption = descriptions[0];
            if (firstCaption && firstCaption.text) {
                return {
                    description: firstCaption.text,
                    confidence: firstCaption.confidence ?? 0,
                };
            }
            return {
                description: '',
                confidence: 0,
            };
        }
        catch (error) {
            throw new TJBotError(`Azure Vision API error during description: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}
//# sourceMappingURL=azure-vision.js.map