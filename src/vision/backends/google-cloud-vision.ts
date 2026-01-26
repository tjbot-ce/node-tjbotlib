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

import fetch from 'node-fetch';
import fs from 'fs';

import type {
    VisionEngine,
    ObjectDetectionResult,
    ImageClassificationResult,
    ImageSegmentationResult,
} from '../vision-engine.js';
import type { SeeBackendGoogleCloudConfig } from '../../config/config-types.js';

// Google Cloud Vision API response type
type GoogleCloudVisionAPIResponse = {
    responses: Array<{
        localizedObjectAnnotations?: Array<{
            name: string;
            score: number;
            boundingPoly: { normalizedVertices: { x: number; y: number }[] };
        }>;
        labelAnnotations?: Array<{
            description: string;
            score: number;
        }>;
    }>;
};

export class GoogleCloudVisionEngine implements VisionEngine {
    private config: SeeBackendGoogleCloudConfig;
    private credentialsPath?: string;
    private model?: string;
    private endpoint: string;
    private apiKey?: string; // Only for legacy fallback, not used if credentialsPath is set

    constructor(config: SeeBackendGoogleCloudConfig) {
        this.config = config;
        this.credentialsPath = config.credentialsPath as string | undefined;
        this.model = config.model as string | undefined;
        this.endpoint = 'https://vision.googleapis.com/v1/images:annotate';
    }

    async initialize(): Promise<void> {
        // Set GOOGLE_APPLICATION_CREDENTIALS if credentialsPath is provided
        if (this.credentialsPath) {
            if (!fs.existsSync(this.credentialsPath)) {
                throw new Error(`Google Cloud Vision credentials file not found at: ${this.credentialsPath}`);
            }
            process.env.GOOGLE_APPLICATION_CREDENTIALS = this.credentialsPath;
        }
        // Optionally, could validate credentials by making a test request
    }

    async detectObjects(image: Buffer | string): Promise<ObjectDetectionResult[]> {
        // Prepare image as base64
        let imgBuf: Buffer;
        if (typeof image === 'string') {
            imgBuf = fs.readFileSync(image);
        } else {
            imgBuf = image;
        }
        const base64 = imgBuf.toString('base64');
        // Use Application Default Credentials (ADC) if GOOGLE_APPLICATION_CREDENTIALS is set
        const body = {
            requests: [
                {
                    image: { content: base64 },
                    features: [{ type: 'OBJECT_LOCALIZATION' }],
                },
            ],
        };
        const res = await fetch(this.endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error(`Google Cloud Vision API error: ${res.status} ${res.statusText}`);
        const data = (await res.json()) as GoogleCloudVisionAPIResponse;
        // Parse objects from response
        const results: ObjectDetectionResult[] = [];
        if (data.responses && data.responses[0] && data.responses[0].localizedObjectAnnotations) {
            for (const obj of data.responses[0].localizedObjectAnnotations) {
                // Convert boundingPoly to [x, y, width, height] (normalized)
                const vertices = obj.boundingPoly.normalizedVertices;
                if (vertices.length >= 2) {
                    const x = vertices[0].x || 0;
                    const y = vertices[0].y || 0;
                    const w = (vertices[2]?.x || 0) - x;
                    const h = (vertices[2]?.y || 0) - y;
                    results.push({
                        label: obj.name,
                        confidence: obj.score,
                        bbox: [x, y, w, h],
                    });
                }
            }
        }
        return results;
    }

    async classifyImage(image: Buffer | string): Promise<ImageClassificationResult[]> {
        // Prepare image as base64
        let imgBuf: Buffer;
        if (typeof image === 'string') {
            imgBuf = fs.readFileSync(image);
        } else {
            imgBuf = image;
        }
        const base64 = imgBuf.toString('base64');
        // Use Application Default Credentials (ADC) if GOOGLE_APPLICATION_CREDENTIALS is set
        const body = {
            requests: [
                {
                    image: { content: base64 },
                    features: [{ type: 'LABEL_DETECTION' }],
                },
            ],
        };
        const res = await fetch(this.endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error(`Google Cloud Vision API error: ${res.status} ${res.statusText}`);
        const data = (await res.json()) as GoogleCloudVisionAPIResponse;
        // Parse labels from response
        const results: ImageClassificationResult[] = [];
        if (data.responses && data.responses[0] && data.responses[0].labelAnnotations) {
            for (const label of data.responses[0].labelAnnotations) {
                results.push({
                    label: label.description,
                    confidence: label.score,
                });
            }
        }
        return results;
    }

    async segmentImage(_image: Buffer | string): Promise<ImageSegmentationResult> {
        // Not supported by Google Cloud Vision, or implement if available
        throw new Error('Segmentation not supported by Google Cloud Vision');
    }
}
