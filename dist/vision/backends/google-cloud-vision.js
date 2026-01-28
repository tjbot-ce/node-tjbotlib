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
import { VisionEngine, } from '../vision-engine.js';
export class GoogleCloudVisionEngine extends VisionEngine {
    constructor(config) {
        super(config);
        this.credentialsPath = config.credentialsPath;
        this.model = config.model;
        this.endpoint = 'https://vision.googleapis.com/v1/images:annotate';
    }
    async initialize() {
        // Set GOOGLE_APPLICATION_CREDENTIALS if credentialsPath is provided
        if (this.credentialsPath) {
            if (!fs.existsSync(this.credentialsPath)) {
                throw new Error(`Google Cloud Vision credentials file not found at: ${this.credentialsPath}`);
            }
            process.env.GOOGLE_APPLICATION_CREDENTIALS = this.credentialsPath;
        }
        // Optionally, could validate credentials by making a test request
    }
    async detectObjects(image) {
        // Prepare image as base64
        let imgBuf;
        if (typeof image === 'string') {
            imgBuf = fs.readFileSync(image);
        }
        else {
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
        if (!res.ok)
            throw new Error(`Google Cloud Vision API error: ${res.status} ${res.statusText}`);
        const data = (await res.json());
        // Parse objects from response
        const results = [];
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
    async classifyImage(image, confidenceThreshold = 0.5) {
        // Prepare image as base64
        let imgBuf;
        if (typeof image === 'string') {
            imgBuf = fs.readFileSync(image);
        }
        else {
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
        if (!res.ok)
            throw new Error(`Google Cloud Vision API error: ${res.status} ${res.statusText}`);
        const data = (await res.json());
        // Parse labels from response
        const results = [];
        if (data.responses && data.responses[0] && data.responses[0].labelAnnotations) {
            for (const label of data.responses[0].labelAnnotations) {
                if (label.score >= confidenceThreshold) {
                    results.push({
                        label: label.description,
                        confidence: label.score,
                    });
                }
            }
        }
        // Sort by confidence descending
        results.sort((a, b) => b.confidence - a.confidence);
        return results;
    }
    async detectFaces(image) {
        // Prepare image as base64
        let imgBuf;
        if (typeof image === 'string') {
            imgBuf = fs.readFileSync(image);
        }
        else {
            imgBuf = image;
        }
        const base64 = imgBuf.toString('base64');
        const body = {
            requests: [
                {
                    image: { content: base64 },
                    features: [{ type: 'FACE_DETECTION' }],
                },
            ],
        };
        const res = await fetch(this.endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        if (!res.ok)
            throw new Error(`Google Cloud Vision API error: ${res.status} ${res.statusText}`);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = (await res.json());
        const results = [];
        if (data.responses && data.responses[0] && data.responses[0].faceAnnotations) {
            for (const face of data.responses[0].faceAnnotations) {
                // Extract bounding box from boundingPoly
                const vertices = face.boundingPoly?.vertices || [];
                let x = Infinity, y = Infinity, maxX = -Infinity, maxY = -Infinity;
                for (const vertex of vertices) {
                    x = Math.min(x, vertex.x || 0);
                    y = Math.min(y, vertex.y || 0);
                    maxX = Math.max(maxX, vertex.x || 0);
                    maxY = Math.max(maxY, vertex.y || 0);
                }
                const w = maxX - x;
                const h = maxY - y;
                // Extract landmarks - Google returns 27 points
                const landmarks = [];
                if (face.landmarks && Array.isArray(face.landmarks)) {
                    for (const landmark of face.landmarks) {
                        landmarks.push({
                            x: landmark.position?.x || 0,
                            y: landmark.position?.y || 0,
                            type: landmark.type,
                        });
                    }
                }
                // Map head pose angles to Azure terminology
                let headPose;
                if (face.headPose) {
                    headPose = {
                        roll: face.headPose.rollAngle || 0,
                        yaw: face.headPose.panAngle || 0,
                        pitch: face.headPose.tiltAngle || 0,
                    };
                }
                results.push({
                    boundingBox: [x, y, w, h],
                    confidence: face.detectionConfidence || 0,
                    landmarks,
                    headPose,
                });
            }
        }
        return results;
    }
    async describeImage(_image) {
        throw new Error('Image description is only available with Azure Vision backend. Configure see.backend.type to "azure-vision".');
    }
}
//# sourceMappingURL=google-cloud-vision.js.map