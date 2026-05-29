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
import { TJBotError } from '../../src/utils/errors.js';

/**
 * Lightweight test suite for ModelRegistry - Model Discovery and Error Handling
 *
 * These tests verify model discovery and querying without downloading models.
 * Error handling tests verify rejection of non-existent models without attempting downloads.
 * For full integration tests with model downloads, see tests/models/model-registry.test.ts
 * Run those with: npm run test-models
 */
describe('ModelRegistry - Model Discovery', () => {
    let manager: ModelRegistry;

    beforeAll(() => {
        manager = ModelRegistry.getInstance();
    });

    describe('STT Models', () => {
        test('[test_lookup_models_filters_by_stt_type] lookupModels returns an array of STT models with at least one', () => {
            const models = manager.lookupModels('stt');
            expect(Array.isArray(models)).toBe(true);
            expect(models.length).toBeGreaterThan(0);
        });

        test('[test_lookup_model_returns_stt_model] moonshine-tiny STT model exists in supported models', () => {
            const models = manager.lookupModels('stt');
            const moonshine = models.find((m) => m.key === 'moonshine-tiny');
            expect(moonshine).toBeDefined();
            expect(moonshine?.type).toBe('stt');
        });
    });

    describe('TTS Models', () => {
        test('[test_lookup_models_filters_by_tts_type] lookupModels returns an array of TTS models with at least one', () => {
            const models = manager.lookupModels('tts');
            expect(Array.isArray(models)).toBe(true);
            expect(models.length).toBeGreaterThan(0);
        });

        test('[test_lookup_model_returns_tts_model] vits-piper-en_US-ryan-low TTS model exists in supported models', () => {
            const models = manager.lookupModels('tts');
            const ryanLow = models.find((m) => m.key === 'vits-piper-en_US-ryan-low');
            expect(ryanLow).toBeDefined();
            expect(ryanLow?.type).toBe('tts');
        });
    });

    describe('VAD Models', () => {
        test('[test_lookupmodels_returns_an_array_of_vad_models_with_at_least_one] lookupModels returns an array of VAD models with at least one', () => {
            const models = manager.lookupModels('vad');
            expect(Array.isArray(models)).toBe(true);
            expect(models.length).toBeGreaterThan(0);
        });

        test('[test_lookup_model_returns_vad_model] silero-vad model exists in supported models', () => {
            const models = manager.lookupModels('vad');
            const sileroVad = models.find((m) => m.key === 'silero-vad');
            expect(sileroVad).toBeDefined();
            expect(sileroVad?.type).toBe('vad');
        });
    });

    describe('Vision Models', () => {
        test('[test_lookup_models_filters_by_vision_object_recognition] lookupModels returns vision models by filtering on type', () => {
            const classModels = manager.lookupModels('vision.classification');
            expect(Array.isArray(classModels)).toBe(true);
            expect(classModels.length).toBeGreaterThan(0);
        });

        test('[test_mobilenetv3_classification_model_exists_in_supported_models] mobilenetv3 classification model exists in supported models', () => {
            const models = manager.lookupModels('vision.classification');
            const mobilenet = models.find((m) => m.key === 'mobilenetv3');
            expect(mobilenet).toBeDefined();
            expect(mobilenet?.type).toBe('vision.classification');
        });

        test('[test_lookup_models_filters_by_vision_face_detection] scrfd-2.5g face detection model exists in supported models', () => {
            const models = manager.lookupModels('vision.face-detection');
            const scrfd = models.find((m) => m.key === 'scrfd-2.5g');
            expect(scrfd).toBeDefined();
            expect(scrfd?.type).toBe('vision.face-detection');
        });
    });

    describe('Model Queries', () => {
        test('[test_lookupmodels_with_installedonly_true_returns_only_installed_stt_models] lookupModels with installedOnly=true returns only installed STT models', () => {
            const installed = manager.lookupModels('stt', true);
            expect(Array.isArray(installed)).toBe(true);
            // All returned models should be installed
            for (const model of installed) {
                expect(manager.isModelDownloaded(model.key)).toBe(true);
            }
        });

        test('[test_lookupmodels_with_installedonly_true_returns_only_installed_tts_models] lookupModels with installedOnly=true returns only installed TTS models', () => {
            const installed = manager.lookupModels('tts', true);
            expect(Array.isArray(installed)).toBe(true);
            // All returned models should be installed
            for (const model of installed) {
                expect(manager.isModelDownloaded(model.key)).toBe(true);
            }
        });

        test('[test_lookupmodels_with_installedonly_true_returns_only_installed_vad_models] lookupModels with installedOnly=true returns only installed VAD models', () => {
            const installed = manager.lookupModels('vad', true);
            expect(Array.isArray(installed)).toBe(true);
            // All returned models should be installed
            for (const model of installed) {
                expect(manager.isModelDownloaded(model.key)).toBe(true);
            }
        });

        test('[test_lookupmodels_with_installedonly_true_returns_only_installed_vision_models] lookupModels with installedOnly=true returns only installed vision models', () => {
            const installed = manager.lookupModels('vision.classification', true);
            expect(Array.isArray(installed)).toBe(true);
            // All returned models should be installed
            for (const model of installed) {
                expect(manager.isModelDownloaded(model.key)).toBe(true);
            }
        });
    });

    describe('Model Registration', () => {
        test('[test_register_model_adds_to_registry] registerModel adds a new model to the registry', () => {
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

        test('[test_register_model_appears_in_lookup_models] registered model appears in lookupModels results', () => {
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
        test('[test_loadmodel_throws_error_for_non_existent_model] loadModel throws error for non-existent model', async () => {
            await expect(manager.loadModel('non-existent-model-xyz')).rejects.toThrow();
        });

        test('[test_downloadmodel_throws_error_for_non_existent_model] downloadModel throws error for non-existent model', async () => {
            await expect(manager.downloadModel('non-existent-model-xyz')).rejects.toThrow();
        });

        test('[test_is_model_downloaded_raises_for_unknown_key] isModelDownloaded throws error for non-existent model', () => {
            expect(() => manager.isModelDownloaded('non-existent-model-xyz')).toThrow();
        });
    });

    describe('Model registry metadata integrity and query behavior', () => {
        test('[test_model_registry_loads_metadata_file] model registry loads metadata file', () => {
            const models = manager.lookupModels();
            expect(Array.isArray(models)).toBe(true);
        });

        test('[test_model_registry_contains_known_node_parity_models] model registry contains known node parity models', () => {
            const objectDetection = manager.lookupModel('ssd-mobilenet-v2');
            const faceDetection = manager.lookupModel('scrfd-2.5g');
            expect(objectDetection.type).toBe('vision.object-recognition');
            expect(faceDetection.type).toBe('vision.face-detection');
        });

        test('[test_model_registry_cache_dir_layout] model registry cache dir layout', () => {
            const visionDir = manager.getModelCacheDirForType('vision.object-recognition');
            const sttDir = manager.getModelCacheDirForType('stt');
            expect(visionDir).toContain('/.tjbot/models/vision');
            expect(sttDir).toContain('/.tjbot/models/stt');
        });

        test('[test_lookup_models_returns_all_models_when_no_filter] lookup models returns all models when no filter', () => {
            const models = manager.lookupModels();
            expect(Array.isArray(models)).toBe(true);
            expect(models.length).toBeGreaterThan(0);
        });

        test('[test_lookup_models_filters_by_vision_face_detection] lookup models filters by vision face detection', () => {
            const models = manager.lookupModels('vision.face-detection');
            expect(models.length).toBeGreaterThan(0);
            for (const m of models) {
                expect(m.type).toBe('vision.face-detection');
            }
        });

        test('[test_lookup_models_filters_by_vision_object_recognition] lookup models filters by vision object recognition', () => {
            const models = manager.lookupModels('vision.object-recognition');
            expect(models.length).toBeGreaterThan(0);
            for (const m of models) {
                expect(m.type).toBe('vision.object-recognition');
            }
        });

        test('[test_lookup_models_returns_empty_list_for_unknown_type] lookup models returns empty list for unknown type', () => {
            const models = manager.lookupModels('not.a.real.type' as never);
            expect(Array.isArray(models)).toBe(true);
            expect(models.length).toBe(0);
        });

        test('[test_lookup_model_returns_stt_model] lookup model returns stt model', () => {
            const model = manager.lookupModel('moonshine-tiny');
            expect(model).toBeDefined();
            expect(model.key).toBe('moonshine-tiny');
            expect(model.type).toBe('stt');
        });

        test('[test_lookup_model_returns_tts_model] lookup model returns tts model', () => {
            const model = manager.lookupModel('vits-piper-en_US-ryan-low');
            expect(model).toBeDefined();
            expect(model.key).toBe('vits-piper-en_US-ryan-low');
            expect(model.type).toBe('tts');
        });

        test('[test_lookup_model_returns_vad_model] lookup model returns vad model', () => {
            const model = manager.lookupModel('silero-vad');
            expect(model).toBeDefined();
            expect(model.type).toBe('vad');
        });

        test('[test_lookup_model_raises_for_unknown_key] lookup model raises for unknown key', () => {
            expect(() => manager.lookupModel('this-model-does-not-exist')).toThrow(TJBotError);
        });

        test('[test_is_model_downloaded_returns_bool] is model downloaded returns bool', () => {
            const result = manager.isModelDownloaded('moonshine-tiny');
            expect(typeof result).toBe('boolean');
        });

        test('[test_model_metadata_has_required_fields] model metadata has required fields', () => {
            const model = manager.lookupModel('ssd-mobilenet-v2');
            expect(model.key).toBeTruthy();
            expect(model.type).toBeTruthy();
            expect(model.label).toBeTruthy();
            expect(model.url).toBeTruthy();
            expect(model.folder).toBeTruthy();
            expect(Array.isArray(model.required)).toBe(true);
        });
    });
});
