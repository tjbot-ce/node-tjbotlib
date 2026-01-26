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
export interface VisionModelMetadata {
    key: string;
    label: string;
    url: string;
    type: 'detection' | 'classification' | 'segmentation';
    inputShape?: number[];
    labels?: string[];
    labelUrl?: string;
}
export declare class VisionModelManager {
    private static instance?;
    private models;
    private metadataLoaded;
    private constructor();
    static getInstance(): VisionModelManager;
    /**
     * Fetch and cache the label list for a model if labelUrl is present.
     * Returns the label list as a string array.
     */
    fetchLabelsForModel(model: VisionModelMetadata): Promise<string[] | undefined>;
    loadMetadata(yamlPath?: string): void;
    getModelMetadata(): VisionModelMetadata[];
    getModelCacheDir(): string;
    /**
     * Check if a model file is downloaded in the cache directory
     */
    isModelDownloaded(model: VisionModelMetadata): boolean;
    /**
     * Fetch the remote file size in bytes using HTTP HEAD
     */
    fetchModelSize(model: VisionModelMetadata): Promise<number | null>;
}
