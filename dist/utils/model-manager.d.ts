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
/**
 * Types of models managed by ModelManager
 */
export type ModelType = 'stt' | 'tts' | 'vad' | 'vision';
/**
 * Base model metadata
 */
export interface BaseModelMetadata {
    type: ModelType;
    key: string;
    label: string;
    url: string;
    folder: string;
    required: string[];
}
/**
 * STT model metadata
 */
export interface STTModelMetadata extends BaseModelMetadata {
    kind: 'offline' | 'offline-whisper' | 'streaming-zipformer' | 'streaming';
}
/**
 * TTS model metadata
 */
export interface TTSModelMetadata extends BaseModelMetadata {
    kind: 'vits-piper' | 'tacotron' | 'fastpitch' | 'streaming';
}
/**
 * VAD model metadata
 */
export type VADModelMetadata = BaseModelMetadata;
/**
 * Vision model metadata
 */
export interface VisionModelMetadata extends BaseModelMetadata {
    kind: 'detection' | 'classification' | 'segmentation';
    labelUrl?: string;
    inputShape?: number[];
}
/**
 * Unified singleton manager for all TJBot models (STT, TTS, VAD, Vision)
 * Handles model metadata, downloading, extraction, and caching
 */
export declare class ModelManager {
    private static instance?;
    private models;
    private metadataLoaded;
    private constructor();
    /**
     * Get singleton instance
     */
    static getInstance(): ModelManager;
    /**
     * Load model metadata from unified YAML file
     * If no path provided, uses default models.yaml in config directory
     * @private
     */
    private loadMetadata;
    /**
     * Get model cache directory
     */
    private getModelCacheDir;
    /**
     * Get model cache directory for a specific type
     * @param modelType The model type (stt, tts, vad, vision)
     * @returns The cache directory path for the specified model type
     */
    private getModelCacheDirForType;
    /**
     * Get STT model cache directory
     */
    getSTTModelCacheDir(): string;
    /**
     * Get TTS model cache directory
     */
    getTTSModelCacheDir(): string;
    /**
     * Get VAD model cache directory
     */
    getVADModelCacheDir(): string;
    /**
     * Get Vision model cache directory
     */
    getVisionModelCacheDir(): string;
    /**
     * Lookup model metadata by key
     * @param modelKey The model key
     * @returns The model metadata
     * @throws Error if model not found
     * @private
     */
    private lookupModel;
    /**
     * Supported models of a given type
     * @param modelType The model type (stt, tts, vad, vision)
     * @returns List of supported models of the specified type
     * @private
     */
    private getSupportedModels;
    /**
     * Supported STT models (full metadata)
     */
    getSupportedSTTModels(): STTModelMetadata[];
    /**
     * Supported TTS models (full metadata)
     */
    getSupportedTTSModels(): TTSModelMetadata[];
    /**
     * Supported VAD models (full metadata)
     */
    getSupportedVADModels(): VADModelMetadata[];
    /**
     * Supported Vision models (full metadata)
     */
    getSupportedVisionModels(): VisionModelMetadata[];
    /**
     * Validate that all required model files exist in the given path
     * @param modelKey The model key
     * @returns True if all required files exist, false otherwise
     */
    private validateModelFilesExist;
    /**
     * Installed models of a given type
     * @param modelType The model type (stt, tts, vad, vision)
     * @returns List of installed models of the specified type
     */
    getInstalledModels(modelType: ModelType): BaseModelMetadata[];
    /**
     * List installed STT models
     * @returns List of installed STT models
     */
    getInstalledSTTModels(): STTModelMetadata[];
    /**
     * List installed TTS models
     * @returns List of installed TTS models
     */
    getInstalledTTSModels(): TTSModelMetadata[];
    /**
     * List installed VAD models
     * @returns List of installed VAD models
     */
    getInstalledVADModels(): VADModelMetadata[];
    /**
     * List installed Vision models
     * @returns List of installed Vision models
     */
    getInstalledVisionModels(): VisionModelMetadata[];
    /**
     * Fetch the remote file size in bytes using HTTP HEAD
     */
    fetchModelSize(modelKey: string): Promise<number>;
    /**
     * Check if a model is downloaded in the specified cache directory
     * @param modelKey The model key
     * @returns True if the model is downloaded, false otherwise
     */
    isModelDownloaded(modelKey: string): boolean;
    /**
     * Download a file from URL with progress bar and exponential backoff retry
     * Retries up to 3 times with delays: 1s, 2s, 4s
     */
    private downloadFile;
    /**
     * Extract tar.bz2 archive using system tar command
     */
    private extractTarBz2;
    /**
     * Download and extract a model
     * @param modelKey The model key
     * @throws Error if download or extraction fails
     */
    downloadModel(modelKey: string): Promise<{
        primaryPath: string;
        cachePath: string;
    } | undefined>;
    /**
     * Ensure a model is downloaded and return its path
     * @param modelKey The model key
     * @returns The model metadata
     * @throws TJBotError if model not found or download fails
     */
    loadModel<T extends BaseModelMetadata = BaseModelMetadata>(modelKey: string): Promise<T>;
}
