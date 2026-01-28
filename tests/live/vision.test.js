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
import { TJBot } from '../../dist/tjbot.js';
import fs from 'fs';
import path from 'path';
import { initWinston, formatTitle, formatSection } from './utils.js';

const LOG_LEVEL = 'info';

const BACKENDS = [
    { id: 'local', label: 'Local (ONNX)' },
    { id: 'google-cloud-vision', label: 'Google Cloud Vision' },
    { id: 'azure-vision', label: 'Azure Vision' },
];

async function runTest() {
    initWinston(LOG_LEVEL);
    console.log(formatTitle('TJBot Vision Test'));

    // Get user configuration choices
    const selectedBackend = await promptBackendChoice();
    const task = await promptTaskChoice(selectedBackend);
    await promptBackendSpecificOptions(selectedBackend, task);

    // Build see config from user choices
    const seeConfig = buildSeeConfig(selectedBackend, task);

    console.log(
        formatSection(`Initializing TJBot with Vision (${BACKENDS.find((b) => b.id === selectedBackend).label})`)
    );

    const tj = TJBot.getInstance();
    await tj.initialize({
        hardware: { camera: true },
        see: seeConfig,
    });
    console.log('✓ TJBot initialized');

    // Capture image from camera
    const imgPath = path.join('/tmp', `tjbot-cvtest-${Date.now()}.jpg`);
    console.log(formatSection('Capturing image and running vision task'));
    console.log('Capturing image from camera...');
    await tj.look(imgPath);
    const imgBuf = fs.readFileSync(imgPath);

    // Run selected CV task
    let result;
    if (task === 'detectObjects') {
        result = await tj.detectObjects(imgBuf);
    } else if (task === 'classifyImage') {
        result = await tj.classifyImage(imgBuf);
    } else if (task === 'detectFaces') {
        result = await tj.detectFaces(imgBuf);
    } else if (task === 'describeImage') {
        result = await tj.describeImage(imgBuf);
    }
    console.log('\nCV result:');
    console.log(JSON.stringify(result, null, 2));
    console.log('\n✓ Vision test complete');
}

async function promptBackendChoice() {
    const backendId = await select({
        message: 'Select a Vision backend to test:',
        choices: BACKENDS.map((b) => ({ name: b.label, value: b.id })),
        default: 'local',
    });
    return backendId;
}

async function promptBackendSpecificOptions(selectedBackend, task) {
    const config = {};

    if (selectedBackend === 'local') {
        return await promptONNXVisionOptions(task);
    } else if (selectedBackend === 'google-cloud-vision') {
        return await promptGoogleCloudVisionOptions();
    } else if (selectedBackend === 'azure-vision') {
        return await promptAzureVisionOptions();
    }

    return config;
}

async function promptONNXVisionOptions(task) {
    // Map task to model type
    const modelTypeMap = {
        detectObjects: 'detection',
        classifyImage: 'classification',
        detectFaces: 'face-detection',
    };

    const modelType = modelTypeMap[task];
    if (!modelType) {
        return {};
    }

    // Get available models from metadata
    const tjbot = TJBot.getInstance();
    const allModels = tjbot.supportedVisionModels();
    const models = allModels.filter((m) => {
        // Get model metadata to check kind
        const metadata = allModels.find((mm) => mm.model === m.model);
        return metadata && metadata.kind === modelType;
    });

    if (models.length === 0) {
        console.log(`\nNo models available for task: ${task}`);
        return {};
    }

    // Since we now have task-specific models in the config, just show which model will be used
    const defaultModel = models[0];
    const installedModels = new Set(tjbot.installedVisionModels());
    const downloaded = installedModels.has(defaultModel.model);
    const status = downloaded ? '✓ downloaded' : '✗ not downloaded';

    console.log(`\nUsing ${modelType} model: ${defaultModel.label || defaultModel.model} ${status}`);

    return {};
}

async function promptGoogleCloudVisionOptions() {
    // Google Cloud Vision uses credentials from environment or config file
    console.log('\nUsing Google Cloud Vision with default credentials');
    return {};
}

async function promptAzureVisionOptions() {
    // Azure Vision uses credentials from environment or config file
    console.log('\nUsing Azure Computer Vision with default credentials');
    return {};
}

async function promptTaskChoice(selectedBackend) {
    // Get model information for display
    const tjbot = TJBot.getInstance();
    const allModels = tjbot.supportedVisionModels();
    const modelByKind = {};
    allModels.forEach((m) => {
        if (!modelByKind[m.kind]) {
            modelByKind[m.kind] = m.label || m.model;
        }
    });

    // Validate that required model kinds are defined
    const requiredKinds = ['detection', 'classification', 'face-detection'];
    for (const kind of requiredKinds) {
        if (!modelByKind[kind]) {
            throw new Error(`Required vision model kind not found: ${kind}`);
        }
    }

    const tasks = [
        {
            name: `Object detection (${modelByKind['detection']})`,
            value: 'detectObjects',
        },
        {
            name: `Image classification (${modelByKind['classification']})`,
            value: 'classifyImage',
        },
        {
            name: `Face detection (${modelByKind['face-detection']})`,
            value: 'detectFaces',
        },
    ];

    // Add image description only for Azure backend
    if (selectedBackend === 'azure-vision') {
        tasks.push({ name: 'Image description', value: 'describeImage' });
    }

    const task = await select({
        message: 'Choose a vision task:',
        choices: tasks,
    });

    return task;
}

function buildSeeConfig(selectedBackend) {
    const baseConfig = {
        backend: {
            type: selectedBackend,
        },
    };

    // Build backend-specific configuration
    if (selectedBackend === 'local') {
        // For local backend, configure all required models with defaults
        const tjbot = TJBot.getInstance();
        const allModels = tjbot.supportedVisionModels();

        const kindMap = {
            detectionModel: 'detection',
            classificationModel: 'classification',
            faceDetectionModel: 'face-detection',
        };

        const localConfig = {};
        for (const [modelKey, modelKind] of Object.entries(kindMap)) {
            const defaultModel = allModels.find((m) => m.kind === modelKind);
            if (defaultModel) {
                localConfig[modelKey] = defaultModel.model;
            }
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

runTest().catch(console.error);
