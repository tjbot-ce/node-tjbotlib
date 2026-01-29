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
import { ModelRegistry } from '../../src/utils/model-registry.js';

/**
 * Lightweight test suite for ModelRegistry - Model Discovery Only
 *
 * These tests verify model discovery and querying without downloading models.
 * For full integration tests with model downloads, see tests/models/model-registry.test.ts
 * Run those with: npm run test-models
 */
describe('ModelRegistry - Model Discovery', () => {
    let manager: ModelRegistry;

    beforeAll(() => {
        manager = ModelRegistry.getInstance();
    });

    describe('STT Models', () => {
        test('lookupModels returns an array of STT models with at least one', () => {
            const models = manager.lookupModels('stt');
            expect(Array.isArray(models)).toBe(true);
            expect(models.length).toBeGreaterThan(0);
        });

        test('moonshine-tiny STT model exists in supported models', () => {
            const models = manager.lookupModels('stt');
            const moonshine = models.find((m) => m.key === 'moonshine-tiny');
            expect(moonshine).toBeDefined();
            expect(moonshine?.type).toBe('stt');
        });
    });

    describe('TTS Models', () => {
        test('lookupModels returns an array of TTS models with at least one', () => {
            const models = manager.lookupModels('tts');
            expect(Array.isArray(models)).toBe(true);
            expect(models.length).toBeGreaterThan(0);
        });

        test('vits-piper-en_US-ryan-low TTS model exists in supported models', () => {
            const models = manager.lookupModels('tts');
            const ryanLow = models.find((m) => m.key === 'vits-piper-en_US-ryan-low');
            expect(ryanLow).toBeDefined();
            expect(ryanLow?.type).toBe('tts');
        });
    });

    describe('VAD Models', () => {
        test('lookupModels returns an array of VAD models with at least one', () => {
            const models = manager.lookupModels('vad');
            expect(Array.isArray(models)).toBe(true);
            expect(models.length).toBeGreaterThan(0);
        });

        test('silero-vad model exists in supported models', () => {
            const models = manager.lookupModels('vad');
            const sileroVad = models.find((m) => m.key === 'silero-vad');
            expect(sileroVad).toBeDefined();
            expect(sileroVad?.type).toBe('vad');
        });
    });

    describe('Vision Models', () => {
        test('lookupModels returns vision models by filtering on type', () => {
            const classModels = manager.lookupModels('vision.classification');
            expect(Array.isArray(classModels)).toBe(true);
            expect(classModels.length).toBeGreaterThan(0);
        });

        test('mobilenetv3 classification model exists in supported models', () => {
            const models = manager.lookupModels('vision.classification');
            const mobilenet = models.find((m) => m.key === 'mobilenetv3');
            expect(mobilenet).toBeDefined();
            expect(mobilenet?.type).toBe('vision.classification');
        });

        test('yunet face detection model exists in supported models', () => {
            const models = manager.lookupModels('vision.face-detection');
            const yunet = models.find((m) => m.key === 'yunet');
            expect(yunet).toBeDefined();
            expect(yunet?.type).toBe('vision.face-detection');
        });
    });

    describe('Model Queries', () => {
        test('lookupModels with installedOnly=true returns only installed STT models', () => {
            const installed = manager.lookupModels('stt', true);
            expect(Array.isArray(installed)).toBe(true);
            // All returned models should be installed
            for (const model of installed) {
                expect(manager.isModelDownloaded(model.key)).toBe(true);
            }
        });

        test('lookupModels with installedOnly=true returns only installed TTS models', () => {
            const installed = manager.lookupModels('tts', true);
            expect(Array.isArray(installed)).toBe(true);
            // All returned models should be installed
            for (const model of installed) {
                expect(manager.isModelDownloaded(model.key)).toBe(true);
            }
        });

        test('lookupModels with installedOnly=true returns only installed VAD models', () => {
            const installed = manager.lookupModels('vad', true);
            expect(Array.isArray(installed)).toBe(true);
            // All returned models should be installed
            for (const model of installed) {
                expect(manager.isModelDownloaded(model.key)).toBe(true);
            }
        });

        test('lookupModels with installedOnly=true returns only installed vision models', () => {
            const installed = manager.lookupModels('vision.classification', true);
            expect(Array.isArray(installed)).toBe(true);
            // All returned models should be installed
            for (const model of installed) {
                expect(manager.isModelDownloaded(model.key)).toBe(true);
            }
        });
    });

    describe('Model Registration', () => {
        test('registerModel adds a new model to the registry', () => {
            const dummyModel = {
                type: 'stt' as const,
                key: 'dummy-test-model',
                label: 'Dummy Test Model',
                url: 'https://example.com/dummy.tar.bz2',
                folder: 'dummy-test-model',
                required: ['model.onnx'],
            };

            manager.registerModel(dummyModel);

            // Verify the model can be looked up
            const lookedUpModel = manager.lookupModel('dummy-test-model');
            expect(lookedUpModel).toBeDefined();
            expect(lookedUpModel.key).toBe('dummy-test-model');
            expect(lookedUpModel.type).toBe('stt');
            expect(lookedUpModel.label).toBe('Dummy Test Model');
        });

        test('registered model appears in lookupModels results', () => {
            const dummyModel = {
                type: 'tts' as const,
                key: 'dummy-tts-test',
                label: 'Dummy TTS Test',
                url: 'https://example.com/dummy-tts.tar.bz2',
                folder: 'dummy-tts-test',
                required: ['model.onnx'],
            };

            manager.registerModel(dummyModel);

            const models = manager.lookupModels('tts');
            const found = models.find((m) => m.key === 'dummy-tts-test');
            expect(found).toBeDefined();
            expect(found?.label).toBe('Dummy TTS Test');
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
