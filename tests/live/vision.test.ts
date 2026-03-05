#!/usr/bin/env node

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

import { select } from '@inquirer/prompts';
import { TJBot } from '../../src/tjbot.js';
import { ModelRegistry } from '../../src/utils/model-registry.js';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { initWinston, formatTitle, formatSection } from './utils.js';

const LOG_LEVEL = 'info';

const BACKENDS = [
    { id: 'local', label: 'Local (ONNX)' },
    { id: 'google-cloud-vision', label: 'Google Cloud Vision' },
    { id: 'azure-vision', label: 'Azure Vision' },
];

interface VisionResult {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    metadata?: any[];
}

interface Landmark {
    x: number;
    y: number;
    type: string;
}

interface BoundingBoxItem {
    boundingBox?: number[];
    confidence?: number;
    landmarks?: Landmark[];
}

async function runTest(): Promise<void> {
    initWinston(LOG_LEVEL);
    console.log(formatTitle('TJBot Vision Test'));

    // Get user configuration choices
    const selectedBackend = await promptBackendChoice();
    const task = await promptTaskChoice(selectedBackend);
    await promptBackendSpecificOptions(selectedBackend, task);

    // Build see config from user choices
    const seeConfig = buildSeeConfig(selectedBackend);

    // Get the selected backend info
    const selectedBackendInfo = BACKENDS.find((b) => b.id === selectedBackend);
    const backendLabel = selectedBackendInfo?.label ?? 'Unknown';

    console.log(formatSection(`Initializing TJBot with Vision (${backendLabel})`));

    const tj = await TJBot.getInstance().initialize({
        hardware: { [TJBot.Hardware.CAMERA]: true },
        see: seeConfig,
    });
    console.log('✓ TJBot initialized');

    // Capture image from camera
    const imgPath = path.join('/tmp', `tjbot-vision-test-${Date.now()}.jpg`);
    console.log(formatSection('Capturing image and running vision task'));
    console.log('Capturing image from camera...');
    await tj.look(imgPath);
    const imgBuf = fs.readFileSync(imgPath);

    // Run selected CV task
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let result: any;
    if (task === 'detectObjects') {
        result = await tj.detectObjects(imgBuf);
    } else if (task === 'classifyImage') {
        result = await tj.classifyImage(imgBuf);
    } else if (task === 'detectFaces') {
        result = await tj.detectFaces(imgBuf);
    } else if (task === 'describeImage') {
        result = await tj.describeImage(imgBuf);
    }
    console.log('\nResult:');
    console.log(JSON.stringify(result, null, 2));

    // Annotate image with bounding boxes if applicable
    if ((task === 'detectFaces' || task === 'detectObjects') && result?.metadata) {
        const annotatedPath = await annotateImageWithBoundingBoxes(imgPath, result, task);
        console.log(`\n✓ Original image saved to: ${imgPath}`);
        console.log(`✓ Annotated image saved to: ${annotatedPath}`);
    } else {
        console.log(`\n✓ Test image saved to: ${imgPath}`);
    }

    console.log('\n✓ Vision test complete');
}

async function promptBackendChoice(): Promise<string> {
    const backendId = await select({
        message: 'Select a Vision backend to test:',
        choices: BACKENDS.map((b) => ({ name: b.label, value: b.id })),
        default: 'local',
    });
    return backendId;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function promptBackendSpecificOptions(selectedBackend: string, task: string): Promise<Record<string, any>> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const config: Record<string, any> = {};

    if (selectedBackend === 'local') {
        return await promptONNXVisionOptions(task);
    } else if (selectedBackend === 'google-cloud-vision') {
        return await promptGoogleCloudVisionOptions();
    } else if (selectedBackend === 'azure-vision') {
        return await promptAzureVisionOptions();
    }

    return config;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function promptONNXVisionOptions(task: string): Promise<Record<string, any>> {
    // Map task to model type
    const modelTypeMap: Record<string, string> = {
        detectObjects: 'vision.object-recognition',
        classifyImage: 'vision.classification',
        detectFaces: 'vision.face-detection',
    };

    const modelType = modelTypeMap[task];
    if (!modelType) {
        return {};
    }

    // Get available models from registry
    const registry = ModelRegistry.getInstance();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const models = registry.lookupModels(modelType as any, false);

    if (models.length === 0) {
        console.log(`\nNo models available for task: ${task}`);
        return {};
    }

    // Show which model will be used and its status
    const defaultModel = models[0];
    const isDownloaded = registry.isModelDownloaded(defaultModel.key);
    const status = isDownloaded ? '✓ downloaded' : '✗ not downloaded';

    console.log(`\nUsing model: ${defaultModel.label || defaultModel.key} ${status}`);

    return {};
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function promptGoogleCloudVisionOptions(): Promise<Record<string, any>> {
    // Google Cloud Vision uses credentials from environment or config file
    console.log('\nUsing Google Cloud Vision with default credentials');
    return {};
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function promptAzureVisionOptions(): Promise<Record<string, any>> {
    // Azure Vision uses credentials from environment or config file
    console.log('\nUsing Azure Computer Vision with default credentials');
    return {};
}

async function promptTaskChoice(selectedBackend: string): Promise<string> {
    // Get model information from registry
    const registry = ModelRegistry.getInstance();

    // Get models for each vision task type
    const detectionModels = registry.lookupModels('vision.object-recognition', false);
    const classificationModels = registry.lookupModels('vision.classification', false);
    const faceDetectionModels = registry.lookupModels('vision.face-detection', false);
    const imageDescriptionModels = registry.lookupModels('vision.image-description', false);

    // Validate that required model kinds are available
    if (detectionModels.length === 0 || classificationModels.length === 0 || faceDetectionModels.length === 0) {
        throw new Error('Required vision models not found in registry');
    }

    const detectionLabel = detectionModels[0].label || detectionModels[0].key;
    const classificationLabel = classificationModels[0].label || classificationModels[0].key;
    const faceDetectionLabel = faceDetectionModels[0].label || faceDetectionModels[0].key;

    const tasks = [
        {
            name: `Object detection (${detectionLabel})`,
            value: 'detectObjects',
        },
        {
            name: `Image classification (${classificationLabel})`,
            value: 'classifyImage',
        },
        {
            name: `Face detection (${faceDetectionLabel})`,
            value: 'detectFaces',
        },
    ];

    // Add image description only for Azure backend
    if (selectedBackend === 'azure-vision' && imageDescriptionModels.length > 0) {
        tasks.push({ name: 'Image description', value: 'describeImage' });
    }

    const task = await select({
        message: 'Choose a vision task:',
        choices: tasks,
    });

    return task;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildSeeConfig(selectedBackend: string): any {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const baseConfig: any = {
        backend: {
            type: selectedBackend,
        },
    };

    // Build backend-specific configuration
    if (selectedBackend === 'local') {
        // For local backend, configure all required models with defaults
        const registry = ModelRegistry.getInstance();

        // Get default models for each vision task
        const detectionModels = registry.lookupModels('vision.object-recognition', false);
        const classificationModels = registry.lookupModels('vision.classification', false);
        const faceDetectionModels = registry.lookupModels('vision.face-detection', false);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const localConfig: any = {};
        if (detectionModels.length > 0) {
            localConfig.objectDetectionModel = detectionModels[0].key;
        }
        if (classificationModels.length > 0) {
            localConfig.imageClassificationModel = classificationModels[0].key;
        }
        if (faceDetectionModels.length > 0) {
            localConfig.faceDetectionModel = faceDetectionModels[0].key;
        }

        baseConfig.backend.local = localConfig;
    } else if (selectedBackend === 'google-cloud-vision') {
        // Google Cloud Vision will use credentials from environment
        baseConfig.backend['google-cloud-vision'] = {};
    } else if (selectedBackend === 'azure-vision') {
        // Azure will use credentials from environment or tjbot.toml
        baseConfig.backend['azure-vision'] = {};
    }

    return baseConfig;
}

/**
 * Annotates an image with bounding boxes from vision detection results
 * @param imgPath - Path to the image to annotate
 * @param result - Vision detection result with metadata containing bounding boxes
 * @returns Path to the annotated image
 */
async function annotateImageWithBoundingBoxes(imgPath: string, result: VisionResult): Promise<string> {
    try {
        // Get image metadata to know dimensions
        const metadata = await sharp(imgPath).metadata();
        const { width, height } = metadata;

        if (!width || !height) {
            throw new Error('Could not determine image dimensions');
        }

        // Create SVG overlay with bounding boxes
        let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`;

        if (result.metadata && Array.isArray(result.metadata)) {
            result.metadata.forEach((item: BoundingBoxItem, _index: number) => {
                if (item.boundingBox && Array.isArray(item.boundingBox)) {
                    // Bounding box is [x, y, w, h] in normalized coordinates (0-1)
                    // where x, y are top-left corner and w, h are width/height
                    const [x, y, w, h] = item.boundingBox;

                    // Convert to pixel coordinates
                    const x1 = Math.round(x * width);
                    const y1 = Math.round(y * height);
                    const boxWidth = Math.round(w * width);
                    const boxHeight = Math.round(h * height);

                    // Determine color based on confidence if available
                    let color = '#00FF00'; // Default green
                    if (item.confidence !== undefined) {
                        const confidence = item.confidence;
                        if (confidence < 0.5) {
                            color = '#FF0000'; // Red for low confidence
                        } else if (confidence < 0.7) {
                            color = '#FFFF00'; // Yellow for medium confidence
                        }
                    }

                    // Draw rectangle
                    svg += `<rect x="${x1}" y="${y1}" width="${boxWidth}" height="${boxHeight}" fill="none" stroke="${color}" stroke-width="3"/>`;

                    // Add label with confidence if available
                    if (item.confidence !== undefined) {
                        const confidencePercent = (item.confidence * 100).toFixed(1);
                        svg += `<text x="${x1 + 5}" y="${y1 - 5}" fill="${color}" font-size="16" font-weight="bold" font-family="Arial">`;
                        svg += `${confidencePercent}%</text>`;
                    }

                    // Draw landmarks if available (for face detection)
                    if (item.landmarks && Array.isArray(item.landmarks)) {
                        item.landmarks.forEach((landmark: Landmark) => {
                            // Landmarks are normalized coordinates (0-1)
                            const lx = Math.round(landmark.x * width);
                            const ly = Math.round(landmark.y * height);
                            // Draw small circle for each landmark
                            svg += `<circle cx="${lx}" cy="${ly}" r="4" fill="${color}"/>`;
                            // Add label
                            svg += `<text x="${lx + 6}" y="${ly - 6}" fill="${color}" font-size="12" font-family="Arial">`;
                            svg += `${landmark.type}</text>`;
                        });
                    }
                }
            });
        }

        svg += '</svg>';

        // Create output filename for annotated image
        const timestamp = Date.now();
        const annotatedPath = path.join('/tmp', `tjbot-vision-test-annotated-${timestamp}.jpg`);

        // Overlay SVG on image and save to new file
        await sharp(imgPath)
            .composite([
                {
                    input: Buffer.from(svg),
                    left: 0,
                    top: 0,
                },
            ])
            .jpeg({ quality: 90 })
            .toFile(annotatedPath);

        return annotatedPath;
    } catch (error) {
        console.error('Error annotating image:', error);
        throw error;
    }
}

runTest().catch(console.error);
