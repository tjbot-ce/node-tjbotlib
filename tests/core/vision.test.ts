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

import { beforeEach, describe, expect, test, vi } from 'vitest';
import fs from 'fs';
import * as ort from 'onnxruntime-node';
import { AzureVisionEngine } from '../../src/vision/backends/azure-vision.js';
import { GoogleCloudVisionEngine } from '../../src/vision/backends/google-cloud-vision.js';
import { ONNXVisionEngine } from '../../src/vision/backends/onnx.js';
import { VisionController } from '../../src/vision/vision.js';

vi.mock('onnxruntime-node', () => ({
    InferenceSession: {
        create: vi.fn(),
    },
}));

describe('Vision backend initialization and inference behavior', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    test('[test_azure_vision_requires_initialize_before_calls] azure vision requires initialize before calls', async () => {
        const engine = new AzureVisionEngine({
            objectDetectionConfidence: 0.5,
            imageClassificationConfidence: 0.5,
        } as never);

        await expect(engine.detectObjects(Buffer.from('x'))).rejects.toThrow('not initialized');
        await expect(engine.classifyImage(Buffer.from('x'))).rejects.toThrow('not initialized');
        await expect(engine.describeImage(Buffer.from('x'))).rejects.toThrow('not initialized');
    });

    test('[test_azure_vision_face_detection_reports_unsupported] azure vision face detection reports unsupported', async () => {
        const engine = new AzureVisionEngine({} as never);
        await expect(engine.detectFaces(Buffer.from('x'))).rejects.toThrow('not supported');
    });

    test('[test_azure_vision_read_image_returns_stream] azure vision read image returns stream', () => {
        const engine = new AzureVisionEngine({} as never);
        const readSpy = vi.spyOn(fs, 'readFileSync').mockReturnValue(Buffer.from('img') as never);
        const out = (engine as unknown as { readImageBuffer: (img: Buffer | string) => Buffer }).readImageBuffer(
            '/tmp/image.jpg'
        );

        expect(readSpy).toHaveBeenCalledWith('/tmp/image.jpg');
        expect(out.toString()).toBe('img');
    });

    test('[test_google_vision_requires_initialize_before_calls] google vision requires initialize before calls', async () => {
        const engine = new GoogleCloudVisionEngine({
            objectDetectionConfidence: 0.5,
            imageClassificationConfidence: 0.5,
            faceDetectionConfidence: 0.5,
        } as never);

        await expect(engine.detectObjects(Buffer.from('x'))).rejects.toThrow('not initialized');
        await expect(engine.classifyImage(Buffer.from('x'))).rejects.toThrow('not initialized');
        await expect(engine.detectFaces(Buffer.from('x'))).rejects.toThrow('not initialized');
    });

    test('[test_onnx_initialize_loads_three_configured_models] onnx initialize loads three configured models', async () => {
        const engine = new ONNXVisionEngine({
            objectDetectionModel: 'obj-model',
            imageClassificationModel: 'cls-model',
            faceDetectionModel: 'face-model',
            objectDetectionConfidence: 0.5,
            imageClassificationConfidence: 0.5,
            faceDetectionConfidence: 0.5,
        } as never);

        const loadSpy = vi
            .spyOn(engine as unknown as { loadModel: (name: string) => Promise<void> }, 'loadModel')
            .mockResolvedValue();

        await engine.initialize();

        expect(loadSpy).toHaveBeenCalledWith('obj-model');
        expect(loadSpy).toHaveBeenCalledWith('cls-model');
        expect(loadSpy).toHaveBeenCalledWith('face-model');
    });

    test('[test_load_model_without_onnx_file_raises] load model without onnx file raises', async () => {
        const engine = new ONNXVisionEngine({} as never);
        (engine as unknown as { manager: unknown }).manager = {
            loadModel: vi.fn().mockResolvedValue({
                folder: 'm',
                required: ['labels.txt'],
                kind: 'detection',
            }),
            getModelCacheDirForType: vi.fn().mockReturnValue('/tmp/models/vision'),
        };

        await expect(
            (engine as unknown as { loadModel: (name: string) => Promise<void> }).loadModel('model')
        ).rejects.toThrow('No ONNX file found');
    });

    test('[test_load_model_uses_model_registry_and_runtime_session] load model uses model registry and runtime session', async () => {
        const engine = new ONNXVisionEngine({} as never);
        const manager = {
            loadModel: vi.fn().mockResolvedValue({
                folder: 'm',
                required: ['model.onnx'],
                kind: 'detection',
                inputShape: [1, 3, 640, 640],
            }),
            getModelCacheDirForType: vi.fn().mockReturnValue('/tmp/models/vision'),
        };
        (engine as unknown as { manager: unknown }).manager = manager;

        const session = { inputNames: ['input'], outputNames: ['output'] };
        vi.mocked(ort.InferenceSession.create).mockResolvedValue(session as never);

        await (engine as unknown as { loadModel: (name: string) => Promise<void> }).loadModel('model-a');

        expect(manager.loadModel).toHaveBeenCalledWith('model-a');
        expect(ort.InferenceSession.create).toHaveBeenCalled();
    });

    test('[test_onnx_requires_initialize_before_inference] onnx requires initialize before inference', async () => {
        const controller = new VisionController();
        await expect(controller.detectObjects(Buffer.from('x'))).rejects.toThrow('not initialized');
        await expect(controller.classifyImage(Buffer.from('x'))).rejects.toThrow('not initialized');
        await expect(controller.detectFaces(Buffer.from('x'))).rejects.toThrow('not initialized');
    });

    test('[test_detect_objects_uses_mocked_runtime_and_postprocess] detect objects uses mocked runtime and postprocess', async () => {
        const engine = new ONNXVisionEngine({
            objectDetectionModel: 'obj-model',
            objectDetectionConfidence: 0.5,
        } as never);

        const run = vi.fn().mockResolvedValue({ output: {} });
        vi.spyOn(
            engine as unknown as { getOrLoadModel: (name: string) => Promise<unknown> },
            'getOrLoadModel'
        ).mockResolvedValue({
            session: { inputNames: ['input'], outputNames: ['output'], run },
            labels: ['person'],
            inputShape: [1, 3, 640, 640],
            kind: 'detection',
        });
        vi.spyOn(
            engine as unknown as { preprocessImage: (...args: unknown[]) => Promise<unknown> },
            'preprocessImage'
        ).mockResolvedValue({} as never);
        const postSpy = vi
            .spyOn(
                engine as unknown as { postprocessDetection: (...args: unknown[]) => unknown[] },
                'postprocessDetection'
            )
            .mockReturnValue([{ label: 'person', confidence: 0.9, bbox: [0, 0, 1, 1] }]);

        const out = await engine.detectObjects(Buffer.from('x'));
        expect(run).toHaveBeenCalled();
        expect(postSpy).toHaveBeenCalled();
        expect(out).toHaveLength(1);
    });

    test('[test_classify_image_uses_mocked_runtime_and_postprocess] classify image uses mocked runtime and postprocess', async () => {
        const engine = new ONNXVisionEngine({
            imageClassificationModel: 'cls-model',
            imageClassificationConfidence: 0.5,
        } as never);

        const run = vi.fn().mockResolvedValue({ output: {} });
        vi.spyOn(
            engine as unknown as { getOrLoadModel: (name: string) => Promise<unknown> },
            'getOrLoadModel'
        ).mockResolvedValue({
            session: { inputNames: ['input'], outputNames: ['output'], run },
            labels: ['cat'],
            inputShape: [1, 3, 640, 640],
            kind: 'classification',
        });
        vi.spyOn(
            engine as unknown as { preprocessImage: (...args: unknown[]) => Promise<unknown> },
            'preprocessImage'
        ).mockResolvedValue({} as never);
        const postSpy = vi
            .spyOn(
                engine as unknown as { postprocessClassification: (...args: unknown[]) => unknown[] },
                'postprocessClassification'
            )
            .mockReturnValue([{ label: 'cat', confidence: 0.8 }]);

        const out = await engine.classifyImage(Buffer.from('x'));
        expect(run).toHaveBeenCalled();
        expect(postSpy).toHaveBeenCalled();
        expect(out).toHaveLength(1);
    });

    test('[test_detect_faces_uses_mocked_runtime_and_postprocess] detect faces uses mocked runtime and postprocess', async () => {
        const engine = new ONNXVisionEngine({
            faceDetectionModel: 'face-model',
            faceDetectionConfidence: 0.5,
        } as never);

        const run = vi.fn().mockResolvedValue({ output: { dims: [1], size: 1 } });
        vi.spyOn(
            engine as unknown as { getOrLoadModel: (name: string) => Promise<unknown> },
            'getOrLoadModel'
        ).mockResolvedValue({
            session: { inputNames: ['input'], outputNames: ['output'], run },
            labels: [],
            inputShape: [1, 3, 640, 640],
            kind: 'face-detection',
        });
        vi.spyOn(
            engine as unknown as { preprocessFaceImage: (...args: unknown[]) => Promise<unknown> },
            'preprocessFaceImage'
        ).mockResolvedValue({} as never);
        const postSpy = vi
            .spyOn(
                engine as unknown as { postprocessFaceDetection: (...args: unknown[]) => unknown[] },
                'postprocessFaceDetection'
            )
            .mockReturnValue([{ boundingBox: [0, 0, 1, 1], confidence: 0.9, landmarks: [] }]);

        const out = await engine.detectFaces(Buffer.from('x'));
        expect(run).toHaveBeenCalled();
        expect(postSpy).toHaveBeenCalled();
        expect(out.isFaceDetected).toBe(true);
        expect(out.metadata).toHaveLength(1);
    });
});
