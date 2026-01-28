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

import { describe, test, expect, beforeAll, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { ModelManager, STTModelMetadata } from '../../src/utils/model-manager.js';

/**
 * Test suite for ModelManager
 * Tests model downloading, validation, and management
 *
 * These tests download real models from the internet, so they may take some time.
 * We test one model of each type with the smallest available size:
 * - STT: moonshine-tiny (~103MB)
 * - TTS: vits-piper-en_US-ryan-low (~64MB)
 * - VAD: silero-vad (~629KB)
 * - Vision: yolov5-nano (~14MB)
 */
describe('ModelManager', () => {
    let manager: ModelManager;

    beforeAll(() => {
        manager = ModelManager.getInstance();
    });

    // ============================================================================
    // STT Model Tests
    // ============================================================================

    describe('STT Models', () => {
        test('getSupportedSTTModels returns an array with at least one model', () => {
            const models = manager.getSupportedSTTModels();
            expect(Array.isArray(models)).toBe(true);
            expect(models.length).toBeGreaterThan(0);
        });

        test('moonshine-tiny STT model exists in supported models', () => {
            const models = manager.getSupportedSTTModels();
            const moonshine = models.find((m) => m.key === 'moonshine-tiny');
            expect(moonshine).toBeDefined();
            expect(moonshine?.type).toBe('stt');
        });

        // don't run this test because it downloads a 100mb model each time
        // test('can download and validate moonshine-tiny STT model', async () => {
        //     const modelKey = 'moonshine-tiny';
        //     await manager.downloadModel(modelKey);

        //     // Verify model is now downloaded
        //     const isDownloaded = manager.isModelDownloaded(modelKey);
        //     expect(isDownloaded).toBe(true);

        //     // Verify all required files exist
        //     const installed = manager.getInstalledSTTModels();
        //     const moonshine = installed.find((m) => m.key === modelKey);
        //     expect(moonshine).toBeDefined();
        //     expect(moonshine?.key).toBe('moonshine-tiny');
        // }, 600000); // 10 minute timeout for download

        test('loadModel returns correct STT model metadata', async () => {
            const modelKey = 'moonshine-tiny';
            const model = await manager.loadModel<STTModelMetadata>(modelKey);

            expect(model).toBeDefined();
            expect(model.key).toBe(modelKey);
            expect(model.type).toBe('stt');
            expect(model.kind).toBe('offline');
        }, 600000);
    });

    // ============================================================================
    // TTS Model Tests
    // ============================================================================

    describe('TTS Models', () => {
        test('getSupportedTTSModels returns an array with at least one model', () => {
            const models = manager.getSupportedTTSModels();
            expect(Array.isArray(models)).toBe(true);
            expect(models.length).toBeGreaterThan(0);
        });

        test('vits-piper-en_US-ryan-low TTS model exists in supported models', () => {
            const models = manager.getSupportedTTSModels();
            const ryanLow = models.find((m) => m.key === 'vits-piper-en_US-ryan-low');
            expect(ryanLow).toBeDefined();
            expect(ryanLow?.type).toBe('tts');
        });

        // don't run these tests because they download a 60mb model each time
        // test('can download and validate vits-piper-en_US-ryan-low TTS model', async () => {
        //     const modelKey = 'vits-piper-en_US-ryan-low';
        //     await manager.downloadModel(modelKey);

        //     // Verify model is now downloaded
        //     const isDownloaded = manager.isModelDownloaded(modelKey);
        //     expect(isDownloaded).toBe(true);

        //     // Verify all required files exist
        //     const installed = manager.getInstalledTTSModels();
        //     const ryan = installed.find((m) => m.key === modelKey);
        //     expect(ryan).toBeDefined();
        //     expect(ryan?.key).toBe(modelKey);
        // }, 600000); // 10 minute timeout for download

        // test('loadModel returns correct TTS model metadata', async () => {
        //     const modelKey = 'vits-piper-en_US-ryan-low';
        //     const model = await manager.loadModel<TTSModelMetadata>(modelKey);

        //     expect(model).toBeDefined();
        //     expect(model.key).toBe(modelKey);
        //     expect(model.type).toBe('tts');
        //     expect(model.kind).toBe('vits-piper');
        // }, 600000);
    });

    // ============================================================================
    // VAD Model Tests
    // ============================================================================

    describe('VAD Models', () => {
        beforeEach(async () => {
            // Clean up silero-vad model before each test to ensure clean state
            const vadModelsDir = path.join(os.homedir(), '.tjbot', 'models', 'vad', 'silero_vad');
            if (fs.existsSync(vadModelsDir)) {
                await fs.promises.rm(vadModelsDir, { recursive: true, force: true });
            }
        });

        test('getSupportedVADModels returns an array with at least one model', () => {
            const models = manager.getSupportedVADModels();
            expect(Array.isArray(models)).toBe(true);
            expect(models.length).toBeGreaterThan(0);
        });

        test('silero-vad model exists in supported models', () => {
            const models = manager.getSupportedVADModels();
            const sileroVad = models.find((m) => m.key === 'silero-vad');
            expect(sileroVad).toBeDefined();
            expect(sileroVad?.type).toBe('vad');
        });

        test('can download and validate silero-vad model', async () => {
            const modelKey = 'silero-vad';
            await manager.downloadModel(modelKey);

            // Verify model is now downloaded
            const isDownloaded = manager.isModelDownloaded(modelKey);
            expect(isDownloaded).toBe(true);

            // Verify all required files exist
            const installed = manager.getInstalledVADModels();
            const sileroVad = installed.find((m) => m.key === modelKey);
            expect(sileroVad).toBeDefined();
            expect(sileroVad?.key).toBe(modelKey);
        }, 60000); // 1 minute timeout

        test('loadModel returns correct VAD model metadata', async () => {
            const modelKey = 'silero-vad';
            const model = await manager.loadModel(modelKey);

            expect(model).toBeDefined();
            expect(model.key).toBe(modelKey);
            expect(model.type).toBe('vad');
        }, 60000); // 1 minute timeout
    });

    // ============================================================================
    // Vision Model Tests
    // ============================================================================

    describe('Vision Models', () => {
        test('getSupportedVisionModels returns an array with at least one model', () => {
            const models = manager.getSupportedVisionModels();
            expect(Array.isArray(models)).toBe(true);
            expect(models.length).toBeGreaterThan(0);
        });

        test('yolov5-nano vision model exists in supported models', () => {
            const models = manager.getSupportedVisionModels();
            const yolo = models.find((m) => m.key === 'yolov5-nano');
            expect(yolo).toBeDefined();
            expect(yolo?.type).toBe('vision');
        });

        // don't run these tests because they download a 14mb model each time
        // test('can download and validate yolov5-nano vision model', async () => {
        //     const modelKey = 'yolov5-nano';
        //     await manager.downloadModel(modelKey);

        //     // Verify model is now downloaded
        //     const isDownloaded = manager.isModelDownloaded(modelKey);
        //     expect(isDownloaded).toBe(true);

        //     // Verify all required files exist
        //     const installed = manager.getInstalledVisionModels();
        //     const yolo = installed.find((m) => m.key === modelKey);
        //     expect(yolo).toBeDefined();
        //     expect(yolo?.key).toBe(modelKey);
        // }, 300000); // 5 minute timeout (smallest model)

        // test('loadModel returns correct Vision model metadata', async () => {
        //     const modelKey = 'yolov5-nano';
        //     const model = await manager.loadModel<VisionModelMetadata>(modelKey);

        //     expect(model).toBeDefined();
        //     expect(model.key).toBe(modelKey);
        //     expect(model.type).toBe('vision');
        //     expect(model.kind).toBe('detection');
        // }, 300000);
    });

    // ============================================================================
    // Model Query Tests
    // ============================================================================

    describe('Model Queries', () => {
        test('getInstalledSTTModels returns array of installed models', () => {
            const installed = manager.getInstalledSTTModels();
            expect(Array.isArray(installed)).toBe(true);
        });

        test('getInstalledTTSModels returns array of installed models', () => {
            const installed = manager.getInstalledTTSModels();
            expect(Array.isArray(installed)).toBe(true);
        });

        test('getInstalledVADModels returns array of installed models', () => {
            const installed = manager.getInstalledVADModels();
            expect(Array.isArray(installed)).toBe(true);
        });

        test('getInstalledVisionModels returns array of installed models', () => {
            const installed = manager.getInstalledVisionModels();
            expect(Array.isArray(installed)).toBe(true);
        });

        test('isModelDownloaded returns true for downloaded models', async () => {
            const modelKey = 'silero-vad';
            const isDownloadedBefore = manager.isModelDownloaded(modelKey);

            if (!isDownloadedBefore) {
                await manager.downloadModel(modelKey);
            }

            const isDownloadedAfter = manager.isModelDownloaded(modelKey);
            expect(isDownloadedAfter).toBe(true);
        }, 300000);
    });

    // ============================================================================
    // Error Handling Tests
    // ============================================================================

    describe('Error Handling', () => {
        test('loadModel throws error for non-existent model', async () => {
            await expect(manager.loadModel('non-existent-model-xyz')).rejects.toThrow();
        });

        test('downloadModel throws error for non-existent model', async () => {
            await expect(manager.downloadModel('non-existent-model-xyz')).rejects.toThrow();
        });
    });
});
