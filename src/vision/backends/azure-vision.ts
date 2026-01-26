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
import fetch from 'node-fetch';
import type { SeeBackendAzureConfig } from '../../config/config-types.js';
import type {
    VisionEngine,
    ImageClassificationResult,
    ImageSegmentationResult,
    ObjectDetectionResult,
} from '../vision-engine.js';

interface AzureVisionObject {
    object: string;
    confidence: number;
    rectangle: { x: number; y: number; w: number; h: number };
}

interface AzureVisionTag {
    name: string;
    confidence: number;
}

interface AzureVisionAPIResponse {
    objects?: AzureVisionObject[];
    tags?: AzureVisionTag[];
}

export class AzureVisionEngine implements VisionEngine {
    private config: SeeBackendAzureConfig;
    private apiKey?: string;
    private url?: string;

    constructor(config: SeeBackendAzureConfig) {
        this.config = config;
        this.apiKey = typeof config.apiKey === 'string' ? config.apiKey : undefined;
        this.url =
            typeof config.url === 'string'
                ? config.url
                : 'https://<region>.api.cognitive.microsoft.com/vision/v3.2/analyze';
    }

    async initialize(): Promise<void> {
        // No-op for now; could validate API key or endpoint
    }

    async detectObjects(image: Buffer | string): Promise<ObjectDetectionResult[]> {
        if (!this.apiKey) throw new Error('Azure Computer Vision API key not configured');
        // Prepare image buffer
        let imgBuf: Buffer;
        if (typeof image === 'string') {
            imgBuf = fs.readFileSync(image);
        } else {
            imgBuf = image;
        }
        // Call Azure Computer Vision API (analyze for objects)
        const endpoint = `${this.url}?visualFeatures=Objects`;
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Ocp-Apim-Subscription-Key': this.apiKey,
                'Content-Type': 'application/octet-stream',
            },
            body: imgBuf,
        });
        if (!res.ok) throw new Error(`Azure Computer Vision API error: ${res.status} ${res.statusText}`);
        const data = (await res.json()) as AzureVisionAPIResponse;
        // Parse objects from response
        const results: ObjectDetectionResult[] = [];
        if (data.objects) {
            for (const obj of data.objects) {
                results.push({
                    label: obj.object,
                    confidence: obj.confidence,
                    bbox: [obj.rectangle.x, obj.rectangle.y, obj.rectangle.w, obj.rectangle.h],
                });
            }
        }
        return results;
    }

    async classifyImage(image: Buffer | string): Promise<ImageClassificationResult[]> {
        if (!this.apiKey) throw new Error('Azure Computer Vision API key not configured');
        // Prepare image buffer
        let imgBuf: Buffer;
        if (typeof image === 'string') {
            imgBuf = fs.readFileSync(image);
        } else {
            imgBuf = image;
        }
        // Call Azure Computer Vision API (analyze for tags)
        const endpoint = `${this.url}?visualFeatures=Tags`;
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Ocp-Apim-Subscription-Key': this.apiKey,
                'Content-Type': 'application/octet-stream',
            },
            body: imgBuf,
        });
        if (!res.ok) throw new Error(`Azure Computer Vision API error: ${res.status} ${res.statusText}`);
        const data = (await res.json()) as AzureVisionAPIResponse;
        // Parse tags from response
        const results: ImageClassificationResult[] = [];
        if (data.tags) {
            for (const tag of data.tags) {
                results.push({
                    label: tag.name,
                    confidence: tag.confidence,
                });
            }
        }
        return results;
    }

    async segmentImage(_image: Buffer | string): Promise<ImageSegmentationResult> {
        // Not supported by Azure Computer Vision, or implement if available
        throw new Error('Segmentation not supported by Azure Computer Vision');
    }
}
