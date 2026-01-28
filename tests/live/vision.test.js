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
import { formatTitle, formatSection } from './utils.js';

// Supported CV backends for testing
const BACKENDS = [
    { id: 'local', label: 'Local (ONNX)' },
    { id: 'google-cloud-vision', label: 'Google Cloud Vision' },
    { id: 'azure-vision', label: 'Azure Vision' },
];

async function runTest() {
    console.log(formatTitle('TJBot Vision Test'));

    // Get user configuration choices
    const selectedBackend = await promptBackendChoice();
    const backendConfig = await promptBackendSpecificOptions(selectedBackend);
    const task = await promptTaskChoice();

    // Build see config from user choices
    const seeConfig = buildSeeConfig(selectedBackend, backendConfig);

    console.log(
        formatSection(
            `Initializing TJBot with Vision (${selectedBackend}${backendConfig.model ? `: ${backendConfig.model}` : ''})`
        )
    );

    const tj = new TJBot({
        hardware: { camera: true },
        see: seeConfig,
    });
    console.log('✓ TJBot initialized');

    // Capture image from camera
    const imgPath = path.join('/tmp', `tjbot-cvtest-${Date.now()}.jpg`);
    console.log(formatSection('Capturing image and running CV task'));
    console.log('Capturing image from camera...');
    await tj.look(imgPath);
    const imgBuf = fs.readFileSync(imgPath);

    // Run selected CV task
    let result;
    if (task === 'detectObjects') {
        result = await tj.detectObjects(imgBuf);
    } else if (task === 'classifyImage') {
        result = await tj.classifyImage(imgBuf);
    } else if (task === 'segmentImage') {
        result = await tj.segmentImage(imgBuf);
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

async function promptBackendSpecificOptions(selectedBackend, manager) {
    const config = {};

    if (selectedBackend === 'local') {
        return await promptONNXVisionOptions(manager);
    } else if (selectedBackend === 'google-cloud-vision') {
        return await promptGoogleCloudVisionOptions();
    } else if (selectedBackend === 'azure-vision') {
        return await promptAzureVisionOptions();
    }

    return config;
}

async function promptONNXVisionOptions() {
    // Get available models from metadata
    const models = await TJBot.supportedVisionModels();
    const choices = await Promise.all(
        models.map(async (m) => {
            const installedModels = new Set(TJBot.installedVisionModels().map((mm) => mm.key));
            const downloaded = installedModels.has(m.key);
            const status = downloaded ? '✓ downloaded' : '✗ not downloaded';
            return {
                name: `${m.label || m.model} ${status}`,
                value: m.model,
                short: m.label || m.model,
            };
        })
    );

    const modelKey = await select({
        message: 'Select a ONNX vision model:',
        choices,
        default: models[0].model,
    });

    const selectedModel = models.find((m) => m.model === modelKey);
    return {
        model: selectedModel.model,
    };
}

async function promptGoogleCloudVisionOptions() {
    // TODO: look up what the actual options are for Google Cloud Vision
    const vision = await select({
        message: 'Select Google Cloud vision model:',
        choices: [
            { name: 'Standard', value: 'standard' },
            { name: 'Enhanced', value: 'enhanced' },
        ],
        default: 'standard',
    });

    return { vision };
}

async function promptAzureVisionOptions() {
    // TODO: look up what the actual options are for Azure Vision
    const vision = await select({
        message: 'Select Azure vision model:',
        choices: [
            { name: 'Standard', value: 'standard' },
            { name: 'Enhanced', value: 'enhanced' },
        ],
        default: 'standard',
    });

    return { vision };
}

async function promptTaskChoice() {
    const tasks = [
        { name: 'Detect Objects', value: 'detectObjects' },
        { name: 'Classify Image', value: 'classifyImage' },
        { name: 'Segment Image', value: 'segmentImage' },
    ];

    const task = await select({
        message: 'Choose a CV task:',
        choices: tasks,
    });

    return task;
}

function buildSeeConfig(selectedBackend, backendConfig) {
    const baseConfig = {
        backend: {
            type: selectedBackend,
        },
    };

    // Build backend-specific configuration
    if (selectedBackend === 'local') {
        baseConfig.backend.local = {
            model: backendConfig.model,
        };
    } else if (selectedBackend === 'google-cloud-vision') {
        baseConfig.backend['google-cloud-vision'] = {
            apiKey: backendConfig.apiKey,
        };
    } else if (selectedBackend === 'azure-vision') {
        baseConfig.backend['azure-vision'] = {
            apiKey: backendConfig.apiKey,
            endpoint: backendConfig.endpoint,
        };
    }

    return baseConfig;
}

runTest().catch(console.error);
