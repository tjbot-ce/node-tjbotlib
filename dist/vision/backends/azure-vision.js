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
import createImageAnalysisClient, { isUnexpected, } from '@azure-rest/ai-vision-image-analysis';
import { AzureKeyCredential } from '@azure/core-auth';
import fs from 'fs';
import winston from 'winston';
import { loadAzureCredentials } from '../../utils/credentials.js';
import { TJBotError } from '../../utils/index.js';
import { LogEmoji } from '../../utils/logging.js';
import { VisionEngine, } from '../vision-engine.js';
const EMO = LogEmoji.VISION;
export class AzureVisionEngine extends VisionEngine {
    imageAnalysisKey;
    imageAnalysisUrl;
    client;
    async initialize() {
        const config = this.config;
        const credentials = loadAzureCredentials(config?.credentialsPath);
        this.imageAnalysisKey = credentials.imageAnalysisKey;
        this.imageAnalysisUrl = this.normalizeEndpoint(credentials.imageAnalysisUrl ?? '');
        if (!this.imageAnalysisKey || !this.imageAnalysisUrl) {
            throw new TJBotError('Azure Vision imageAnalysisKey and imageAnalysisUrl are required');
        }
        this.client = createImageAnalysisClient(this.imageAnalysisUrl, new AzureKeyCredential(this.imageAnalysisKey));
        winston.info(`${EMO} Azure Vision engine initialized`);
        winston.debug(`${EMO} Initialized AzureVisionEngine with config:
            imageAnalysisKey: ${this.imageAnalysisKey ? '***' : 'not set'},
            imageAnalysisUrl: ${this.imageAnalysisUrl ? this.imageAnalysisUrl : 'not set'}`);
    }
    normalizeEndpoint(endpoint) {
        try {
            const parsed = new URL(endpoint.trim());
            const normalizedEndpoint = parsed.origin;
            if (parsed.pathname !== '/' || parsed.search || parsed.hash) {
                winston.warn(`${EMO} Azure Vision endpoint included a path or query string; using resource root endpoint ${normalizedEndpoint}`);
            }
            return normalizedEndpoint;
        }
        catch (error) {
            throw new TJBotError(`Azure Vision endpoint is not a valid URL: ${endpoint}`, {
                cause: error,
            });
        }
    }
    readImageBuffer(image) {
        if (typeof image === 'string') {
            return fs.readFileSync(image);
        }
        return image;
    }
    async analyzeImage(image, features) {
        if (!this.client) {
            throw new TJBotError('Azure Vision client not initialized. Call initialize() first.');
        }
        const imageBuffer = this.readImageBuffer(image);
        const response = await this.client.path('/imageanalysis:analyze').post({
            body: imageBuffer,
            queryParameters: {
                features,
            },
            contentType: 'application/octet-stream',
        });
        if (isUnexpected(response)) {
            throw new TJBotError(`Azure Vision API error: ${response.status} ${JSON.stringify(response.body)}`);
        }
        return response.body;
    }
    async detectObjects(image) {
        winston.verbose(`${EMO} Detecting objects in image with Azure Image Analysis API`);
        const result = await this.analyzeImage(image, ['Objects']);
        const objects = result.objectsResult?.values ?? [];
        return objects
            .map((object) => {
            const primaryTag = object.tags[0];
            return {
                label: primaryTag?.name ?? 'unknown',
                confidence: primaryTag?.confidence ?? 0,
                bbox: [object.boundingBox.x, object.boundingBox.y, object.boundingBox.w, object.boundingBox.h],
            };
        })
            .sort((a, b) => b.confidence - a.confidence);
    }
    async classifyImage(image, confidenceThreshold = 0.5) {
        winston.verbose(`${EMO} Classifying image with Azure Image Analysis API`);
        const result = await this.analyzeImage(image, ['Tags']);
        return (result.tagsResult?.values ?? [])
            .filter((tag) => tag.confidence >= confidenceThreshold)
            .map((tag) => ({
            label: tag.name,
            confidence: tag.confidence,
        }))
            .sort((a, b) => b.confidence - a.confidence);
    }
    async detectFaces(image) {
        void image;
        throw new TJBotError('Face detection is not supported by the Azure Image Analysis service. Please use another backend for face detection.');
    }
    async describeImage(image) {
        winston.verbose(`${EMO} Describing image with Azure Image Analysis API`);
        const result = await this.analyzeImage(image, ['Caption']);
        const caption = result.captionResult;
        if (caption) {
            return {
                description: caption.text,
                confidence: caption.confidence,
            };
        }
        return {
            description: '',
            confidence: 0,
        };
    }
}
//# sourceMappingURL=azure-vision.js.map