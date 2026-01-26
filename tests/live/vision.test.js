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
import { VisionModelManager } from '../../dist/utils/vision-utils.js';
import fs from 'fs';
import path from 'path';
import { formatTitle } from './utils.js';

async function runTest() {
    console.log(formatTitle('TJBot Vision Test'));

    const modelManager = VisionModelManager.getInstance();
    const models = modelManager.getModelMetadata();

    // Gather download status and size for each model
    const modelChoices = await Promise.all(
        models.map(async (m) => {
            const isDownloaded = modelManager.isModelDownloaded(m);
            let sizeStr = '';
            if (!isDownloaded) {
                const size = await modelManager.fetchModelSize(m);
                if (size) {
                    sizeStr = ` (${(size / 1024 / 1024).toFixed(1)} MB)`;
                }
            }
            const status = isDownloaded ? '\x1b[32m✓ Downloaded\x1b[0m' : `\x1b[33mNot downloaded${sizeStr}\x1b[0m`;
            return {
                name: `${m.label} (${m.key})  ${status}`,
                value: m.key,
            };
        })
    );

    const modelKey = await select({
        message: 'Choose a CV model:',
        choices: modelChoices,
    });

    const model = models.find((m) => m.key === modelKey);
    const tasks = [];
    if (model.type === 'detection') tasks.push({ name: 'Detect Objects', value: 'detectObjects' });
    if (model.type === 'classification') tasks.push({ name: 'Classify Image', value: 'classifyImage' });
    if (model.type === 'segmentation') tasks.push({ name: 'Segment Image', value: 'segmentImage' });

    const task = await select({
        message: 'Choose a CV task:',
        choices: tasks,
    });

    // Set up TJBot with camera and CV config
    const tj = new TJBot({
        hardware: { camera: true },
        see: { cv: { backend: 'onnx', model: modelKey } },
    });

    // Capture image from camera
    const imgPath = path.join('/tmp', `tjbot-cvtest-${Date.now()}.jpg`);
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
    console.log('CV result:', JSON.stringify(result, null, 2));
    console.log('==== CV Test Complete ====');
}

runTest().catch(console.error);
