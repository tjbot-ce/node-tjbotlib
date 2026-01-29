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
import { VisionEngine, } from '../vision-engine.js';
export class AzureVisionEngine extends VisionEngine {
    constructor(config) {
        super(config);
        this.apiKey = typeof config.apiKey === 'string' ? config.apiKey : undefined;
        this.url =
            typeof config.url === 'string'
                ? config.url
                : 'https://<region>.api.cognitive.microsoft.com/vision/v3.2/analyze';
    }
    async initialize() {
        // No-op for now; could validate API key or endpoint
    }
    async detectObjects(image) {
        if (!this.apiKey)
            throw new Error('Azure Computer Vision API key not configured');
        // Prepare image buffer
        let imgBuf;
        if (typeof image === 'string') {
            imgBuf = fs.readFileSync(image);
        }
        else {
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
        if (!res.ok)
            throw new Error(`Azure Computer Vision API error: ${res.status} ${res.statusText}`);
        const data = (await res.json());
        // Parse objects from response
        const results = [];
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
    async classifyImage(image, confidenceThreshold = 0.5) {
        if (!this.apiKey)
            throw new Error('Azure Computer Vision API key not configured');
        // Prepare image buffer
        let imgBuf;
        if (typeof image === 'string') {
            imgBuf = fs.readFileSync(image);
        }
        else {
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
        if (!res.ok)
            throw new Error(`Azure Computer Vision API error: ${res.status} ${res.statusText}`);
        const data = (await res.json());
        // Parse tags from response
        const results = [];
        if (data.tags) {
            for (const tag of data.tags) {
                if (tag.confidence >= confidenceThreshold) {
                    results.push({
                        label: tag.name,
                        confidence: tag.confidence,
                    });
                }
            }
        }
        // Sort by confidence descending
        results.sort((a, b) => b.confidence - a.confidence);
        return results;
    }
    async detectFaces(image) {
        if (!this.apiKey)
            throw new Error('Azure Computer Vision API key not configured');
        let imgBuf;
        if (typeof image === 'string') {
            imgBuf = fs.readFileSync(image);
        }
        else {
            imgBuf = image;
        }
        // Call Azure Computer Vision API for face detection
        const endpoint = `${this.url}?visualFeatures=Faces`;
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Ocp-Apim-Subscription-Key': this.apiKey,
                'Content-Type': 'application/octet-stream',
            },
            body: imgBuf,
        });
        if (!res.ok)
            throw new Error(`Azure Computer Vision API error: ${res.status} ${res.statusText}`);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = (await res.json());
        const metadata = [];
        if (data.faces && Array.isArray(data.faces)) {
            for (const face of data.faces) {
                const rect = face.faceRectangle || {};
                // Extract landmarks from faceLandmarks
                const landmarks = [];
                const faceLandmarks = face.faceLandmarks || {};
                const landmarkMap = {
                    pupilLeft: 'eye-left',
                    pupilRight: 'eye-right',
                    noseTip: 'nose',
                    mouthLeft: 'mouth-left',
                    mouthRight: 'mouth-right',
                };
                for (const [azureType, standardType] of Object.entries(landmarkMap)) {
                    if (faceLandmarks[azureType]) {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const point = faceLandmarks[azureType];
                        landmarks.push({
                            x: point.x || 0,
                            y: point.y || 0,
                            type: standardType,
                        });
                    }
                }
                // Extract head pose angles
                const faceAttributes = face.faceAttributes || {};
                let headPose;
                if (faceAttributes.headPose) {
                    headPose = {
                        roll: faceAttributes.headPose.roll || 0,
                        yaw: faceAttributes.headPose.yaw || 0,
                        pitch: faceAttributes.headPose.pitch || 0,
                    };
                }
                // Extract quality metrics if available
                let qualityMetrics = undefined;
                if (faceAttributes.blur || faceAttributes.noise || faceAttributes.exposure) {
                    const blurLevel = faceAttributes.blur?.blurLevel;
                    const blurValue = blurLevel === 'high' ? 0.8 : blurLevel === 'medium' ? 0.5 : blurLevel ? 0.2 : undefined;
                    const exposureLevel = faceAttributes.exposure?.exposureLevel;
                    let exposure;
                    if (exposureLevel === 'overExposure')
                        exposure = 'overExposed';
                    else if (exposureLevel === 'underExposure')
                        exposure = 'underExposed';
                    else if (exposureLevel)
                        exposure = 'goodExposure';
                    const noiseLevel = faceAttributes.noise?.noiseLevel;
                    const noise = noiseLevel === 'high' ? 0.8 : noiseLevel === 'medium' ? 0.5 : noiseLevel ? 0.2 : undefined;
                    qualityMetrics = { blurValue, exposure, noise };
                }
                // Extract occlusion data
                let occlusion;
                if (faceAttributes.occlusion) {
                    occlusion = {
                        eyeOccluded: faceAttributes.occlusion.eyeOccluded || false,
                        foreheadOccluded: faceAttributes.occlusion.foreheadOccluded || false,
                        mouthOccluded: faceAttributes.occlusion.mouthOccluded || false,
                    };
                }
                metadata.push({
                    boundingBox: [rect.left || 0, rect.top || 0, rect.width || 0, rect.height || 0],
                    confidence: face.confidence || 0,
                    landmarks,
                    headPose,
                    qualityMetrics,
                    occlusion,
                });
            }
        }
        return {
            isFaceDetected: metadata.length > 0,
            metadata,
        };
    }
    async describeImage(image) {
        if (!this.apiKey)
            throw new Error('Azure Computer Vision API key not configured');
        let imgBuf;
        if (typeof image === 'string') {
            imgBuf = fs.readFileSync(image);
        }
        else {
            imgBuf = image;
        }
        // Call Azure Computer Vision API for image description
        const endpoint = `${this.url}?visualFeatures=Description`;
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Ocp-Apim-Subscription-Key': this.apiKey,
                'Content-Type': 'application/octet-stream',
            },
            body: imgBuf,
        });
        if (!res.ok)
            throw new Error(`Azure Computer Vision API error: ${res.status} ${res.statusText}`);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = (await res.json());
        if (data.description && data.description.captions && data.description.captions.length > 0) {
            const caption = data.description.captions[0];
            return {
                description: caption.text || '',
                confidence: caption.confidence || 0,
            };
        }
        return {
            description: '',
            confidence: 0,
        };
    }
}
//# sourceMappingURL=azure-vision.js.map