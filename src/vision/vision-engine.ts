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

import { SeeBackendConfig } from '../config/config-types.js';
import { TJBotError } from '../utils/index.js';

export interface ObjectDetectionResult {
    label: string;
    confidence: number;
    bbox: [number, number, number, number]; // [x, y, width, height]
}

export interface ImageClassificationResult {
    label: string;
    confidence: number;
}

export interface ImageSegmentationResult {
    mask: Uint8Array | Buffer;
    width: number;
    height: number;
    labels: string[];
}

/**
 * Abstract Vision Engine Base Class
 *
 * Defines the interface for Vision backends (ONNX, Google Cloud Vision, Azure Vision, etc.)
 * All implementations must extend this class and implement the required methods.
 * @public
 */
export abstract class VisionEngine {
    protected config: SeeBackendConfig;

    constructor(config?: SeeBackendConfig) {
        this.config = config ?? {};
    }

    /**
     * Initialize the Vision engine.
     * This method may perform setup tasks such as loading models or authenticating with services.
     * Should be called before the first call to detectObjects(), classifyImage(), or segmentImage().
     *
     * @throws {TJBotError} if initialization fails
     * @public
     */
    abstract initialize(): Promise<void>;

    /**
     * Detect objects in an image.
     *
     * @param image - Image buffer or file path
     * @returns Array of detected objects with labels, confidence scores, and bounding boxes
     * @throws {TJBotError} if detection fails
     * @public
     */
    abstract detectObjects(image: Buffer | string): Promise<ObjectDetectionResult[]>;

    /**
     * Classify an image.
     *
     * @param image - Image buffer or file path
     * @returns Array of classification results with labels and confidence scores
     * @throws {TJBotError} if classification fails
     * @public
     */
    abstract classifyImage(image: Buffer | string): Promise<ImageClassificationResult[]>;

    /**
     * Segment an image (optional - not all backends support this).
     *
     * @param image - Image buffer or file path
     * @returns Segmentation result with mask and labels
     * @throws {TJBotError} if segmentation fails or is not supported
     * @public
     */
    abstract segmentImage?(image: Buffer | string): Promise<ImageSegmentationResult>;
}

export async function createVisionEngine(config: SeeBackendConfig): Promise<VisionEngine> {
    const backend = (config.type as string) ?? 'local';

    try {
        if (backend === 'local') {
            const module = await import('./backends/onnx.js');
            if (!module?.ONNXVisionEngine) {
                throw new TJBotError('Vision backend "local" is unavailable (missing ONNXVisionEngine export).');
            }
            return new module.ONNXVisionEngine(config.local ?? {});
        }

        if (backend === 'google-cloud-vision') {
            const module = await import('./backends/google-cloud-vision.js');
            if (!module?.GoogleCloudVisionEngine) {
                throw new TJBotError(
                    'Vision backend "google-cloud-vision" is unavailable (missing GoogleCloudVisionEngine export).'
                );
            }
            return new module.GoogleCloudVisionEngine(config['google-cloud-vision'] ?? {});
        }

        if (backend === 'azure-vision') {
            const module = await import('./backends/azure-vision.js');
            if (!module?.AzureVisionEngine) {
                throw new TJBotError(
                    'Vision backend "azure-vision" is unavailable (missing AzureVisionEngine export).'
                );
            }
            return new module.AzureVisionEngine(config['azure-vision'] ?? {});
        }

        throw new TJBotError(`Unknown Vision backend type: ${backend}`);
    } catch (error) {
        if (error instanceof TJBotError) {
            throw error;
        }
        throw new TJBotError(`Failed to load Vision backend "${backend}". Ensure dependencies are installed.`, {
            cause: error as Error,
        });
    }
}
