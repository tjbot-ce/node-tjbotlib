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

import { describe, test, expect, beforeAll } from 'vitest';
import { ModelManager } from '../../src/utils/model-manager.js';

/**
 * Lightweight test suite for ModelManager - Model Discovery Only
 *
 * These tests verify model discovery and querying without downloading models.
 * For full integration tests with model downloads, see tests/models/model-manager.test.ts
 * Run those with: npm run test-models
 */
describe('ModelManager - Model Discovery', () => {
    let manager: ModelManager;

    beforeAll(() => {
        manager = ModelManager.getInstance();
    });

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
    });

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
    });

    describe('VAD Models', () => {
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
    });

    describe('Vision Models', () => {
        test('getSupportedVisionModels returns an array with at least one model', () => {
            const models = manager.getSupportedVisionModels();
            expect(Array.isArray(models)).toBe(true);
            expect(models.length).toBeGreaterThan(0);
        });

        test('yolov8n vision model exists in supported models', () => {
            const models = manager.getSupportedVisionModels();
            const yolo = models.find((m) => m.key === 'yolov8n');
            expect(yolo).toBeDefined();
            expect(yolo?.type).toBe('vision');
        });

        test('mobilenetv3 classification model exists in supported models', () => {
            const models = manager.getSupportedVisionModels();
            const mobilenet = models.find((m) => m.key === 'mobilenetv3');
            expect(mobilenet).toBeDefined();
            expect(mobilenet?.type).toBe('vision');
            expect(mobilenet?.kind).toBe('classification');
        });

        test('yunet face detection model exists in supported models', () => {
            const models = manager.getSupportedVisionModels();
            const yunet = models.find((m) => m.key === 'yunet');
            expect(yunet).toBeDefined();
            expect(yunet?.type).toBe('vision');
            expect(yunet?.kind).toBe('face-detection');
        });
    });

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
    });

    describe('Error Handling', () => {
        test('loadModel throws error for non-existent model', async () => {
            await expect(manager.loadModel('non-existent-model-xyz')).rejects.toThrow();
        });

        test('downloadModel throws error for non-existent model', async () => {
            await expect(manager.downloadModel('non-existent-model-xyz')).rejects.toThrow();
        });

        test('isModelDownloaded throws error for non-existent model', () => {
            expect(() => manager.isModelDownloaded('non-existent-model-xyz')).toThrow();
        });
    });
});
