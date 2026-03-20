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
import { ImageAnnotatorClient } from '@google-cloud/vision';
import winston from 'winston';
import fs from 'fs';
import { loadGoogleCloudCredentials } from '../../utils/credentials.js';
import { TJBotError } from '../../utils/errors.js';
import { LogEmoji } from '../../utils/logging.js';
import { VisionEngine, } from '../vision-engine.js';
const EMO = LogEmoji.VISION;
export class GoogleCloudVisionEngine extends VisionEngine {
    client;
    async initialize() {
        const config = this.config;
        loadGoogleCloudCredentials(config?.credentialsPath);
        // Create client using Application Default Credentials (ADC)
        // which reads GOOGLE_APPLICATION_CREDENTIALS environment variable
        this.client = new ImageAnnotatorClient();
        winston.info(`${EMO} Google Cloud Vision engine initialized`);
        winston.debug(`${EMO} Initialized GoogleCloudVisionEngine with config:
            credentialsPath: ${config.credentialsPath}`);
    }
    readImageBuffer(image) {
        if (typeof image === 'string') {
            return fs.readFileSync(image);
        }
        return image;
    }
    async detectObjects(image) {
        if (!this.client) {
            throw new TJBotError('Google Cloud Vision client not initialized. Call initialize() first.');
        }
        winston.verbose(`${EMO} Detecting objects in image with Google Cloud Vision API`);
        const imageBuffer = this.readImageBuffer(image);
        try {
            const request = {
                image: { content: imageBuffer },
                features: [{ type: 'OBJECT_LOCALIZATION' }],
            };
            const [result] = await this.client.annotateImage(request);
            const objects = result.localizedObjectAnnotations ?? [];
            return objects
                .map((obj) => {
                // Convert normalized vertices to bounding box [x, y, width, height]
                const vertices = obj.boundingPoly?.normalizedVertices ?? [];
                if (vertices.length < 2) {
                    return null;
                }
                const x = vertices[0]?.x ?? 0;
                const y = vertices[0]?.y ?? 0;
                const w = (vertices[2]?.x ?? 0) - x;
                const h = (vertices[2]?.y ?? 0) - y;
                return {
                    label: obj.name ?? 'unknown',
                    confidence: obj.score ?? 0,
                    bbox: [x, y, w, h],
                };
            })
                .filter((obj) => obj !== null)
                .sort((a, b) => b.confidence - a.confidence);
        }
        catch (error) {
            throw new TJBotError(`Google Cloud Vision API error during object detection: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async classifyImage(image, confidenceThreshold = 0.5) {
        if (!this.client) {
            throw new TJBotError('Google Cloud Vision client not initialized. Call initialize() first.');
        }
        winston.verbose(`${EMO} Classifying image with Google Cloud Vision API`);
        const imageBuffer = this.readImageBuffer(image);
        try {
            const request = {
                image: { content: imageBuffer },
                features: [{ type: 'LABEL_DETECTION' }],
            };
            const [result] = await this.client.annotateImage(request);
            const labels = result.labelAnnotations ?? [];
            return labels
                .filter((label) => (label.score ?? 0) >= confidenceThreshold)
                .map((label) => ({
                label: label.description ?? 'unknown',
                confidence: label.score ?? 0,
            }))
                .sort((a, b) => b.confidence - a.confidence);
        }
        catch (error) {
            throw new TJBotError(`Google Cloud Vision API error during classification: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async detectFaces(image) {
        if (!this.client) {
            throw new TJBotError('Google Cloud Vision client not initialized. Call initialize() first.');
        }
        winston.verbose(`${EMO} Detecting faces in image with Google Cloud Vision API`);
        const imageBuffer = this.readImageBuffer(image);
        try {
            const request = {
                image: { content: imageBuffer },
                features: [{ type: 'FACE_DETECTION' }],
            };
            const [result] = await this.client.annotateImage(request);
            const faces = result.faceAnnotations ?? [];
            const metadata = faces
                .map((face) => {
                // Extract bounding box from vertices
                const vertices = face.boundingPoly?.vertices ?? [];
                if (vertices.length === 0) {
                    return null;
                }
                let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                for (const vertex of vertices) {
                    minX = Math.min(minX, vertex.x ?? 0);
                    minY = Math.min(minY, vertex.y ?? 0);
                    maxX = Math.max(maxX, vertex.x ?? 0);
                    maxY = Math.max(maxY, vertex.y ?? 0);
                }
                const w = maxX - minX;
                const h = maxY - minY;
                // Extract landmarks
                const landmarks = (face.landmarks ?? []).map((landmark) => ({
                    x: landmark.position?.x ?? 0,
                    y: landmark.position?.y ?? 0,
                    type: String(landmark.type ?? '') || undefined,
                }));
                // Map head pose angles (cast to any to access extended properties)
                const faceWithHeadPose = face;
                const ryp = {
                    roll: faceWithHeadPose?.headPose?.rollAngle ?? 0,
                    yaw: faceWithHeadPose?.headPose?.panAngle ?? 0,
                    pitch: faceWithHeadPose?.headPose?.tiltAngle ?? 0,
                };
                const headPose = faceWithHeadPose.headPose ? ryp : undefined;
                return {
                    boundingBox: [minX, minY, w, h],
                    confidence: face.detectionConfidence ?? 0,
                    landmarks,
                    headPose,
                };
            })
                .filter((meta) => meta !== null);
            return {
                isFaceDetected: metadata.length > 0,
                metadata,
            };
        }
        catch (error) {
            throw new TJBotError(`Google Cloud Vision API error during face detection: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async describeImage(_image) {
        throw new TJBotError('Image description is only available with Azure Vision backend. Configure see.backend.type to "azure-vision".');
    }
}
//# sourceMappingURL=google-cloud-vision.js.map