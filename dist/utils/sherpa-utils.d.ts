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
 * Model definition for Sherpa-ONNX models
 */
export interface SherpaModel {
    model: string;
    label?: string;
    modelUrl: string;
}
/**
 * Detailed STT model metadata for Sherpa-ONNX
 */
export interface SherpaSTTModelMetadata {
    key: string;
    label: string;
    url: string;
    folder: string;
    required: string[];
    kind: 'offline' | 'offline-whisper' | 'streaming-zipformer' | 'streaming';
}
/**
 * VAD model configuration
 */
export interface VADModelConfig {
    url: string;
    filename: string;
}
/**
 * Singleton manager for Sherpa-ONNX models
 * Handles model metadata, downloading, and caching
 */
export declare class SherpaModelManager {
    private static instance?;
    private sttModels;
    private ttsModels;
    private vadModel;
    private metadataLoaded;
    private constructor();
    /**
     * Get singleton instance
     */
    static getInstance(): SherpaModelManager;
    /**
     * Load model metadata from YAML file
     * If no path provided, uses default sherpa-models.yaml in config directory
     */
    loadMetadata(yamlPath?: string): void;
    /**
     * Ensure metadata is loaded, throw if not
     */
    private ensureMetadataLoaded;
    /**
     * Get all STT model metadata
     */
    getSTTModelMetadata(): SherpaSTTModelMetadata[];
    /**
     * Get STT models for user selection (simplified, without technical details)
     */
    getSTTModels(): SherpaModel[];
    /**
     * Get all TTS models
     */
    getTTSModels(): SherpaModel[];
    /**
     * Get VAD model configuration
     */
    getVADModel(): VADModelConfig;
    /**
     * Get STT model cache directory
     */
    getSTTModelCacheDir(): string;
    /**
     * Get TTS model cache directory
     */
    getTTSModelCacheDir(): string;
    /**
     * List downloaded models in a directory
     */
    listDownloadedModels(modelDir: string): string[];
    /**
     * Check if a specific model is downloaded
     */
    isModelDownloaded(modelName: string, modelDir: string): boolean;
    /**
     * Check if an STT model is downloaded
     */
    isSTTModelDownloaded(modelName: string): boolean;
    /**
     * Check if a TTS model is downloaded
     */
    isTTSModelDownloaded(modelName: string): boolean;
    /**
     * Download a file from URL with progress bar
     */
    downloadFile(url: string, destination: string): Promise<void>;
    /**
     * Extract tar.bz2 archive
     */
    extractTarBz2(archivePath: string, destinationDir: string): Promise<void>;
    /**
     * Ensure an STT model is downloaded and cached
     */
    ensureSTTModelDownloaded(modelName: string, downloadUrl: string): Promise<string>;
    /**
     * Ensure a TTS model is downloaded and cached
     */
    ensureTTSModelDownloaded(modelName: string, downloadUrl: string): Promise<string>;
    /**
     * Generic helper to download/extract a Sherpa model to a target directory.
     * If requiredFiles are provided, all must exist post-download. If returnOnnxFile is true,
     * returns the first .onnx file found; otherwise returns the target directory path.
     */
    private ensureModelDownloaded;
    /**
     * Ensure the Silero VAD model is downloaded
     */
    ensureVADModelDownloaded(): Promise<string>;
}
/**
 * @deprecated Use SherpaModelManager.getInstance().getSTTModelMetadata() instead
 */
export declare const STT_MODEL_METADATA: SherpaSTTModelMetadata[];
/**
 * @deprecated Use SherpaModelManager.getInstance().getVADModel() instead
 */
export declare const VAD_MODEL: VADModelConfig;
/**
 * @deprecated Use SherpaModelManager.getInstance().getSTTModels() instead
 */
export declare const STT_MODELS: SherpaModel[];
/**
 * @deprecated Use SherpaModelManager.getInstance().getTTSModels() instead
 */
export declare const TTS_MODELS: SherpaModel[];
/**
 * @deprecated Use SherpaModelManager.getInstance().getSTTModelCacheDir() instead
 */
export declare function getSTTModelCacheDir(): string;
/**
 * @deprecated Use SherpaModelManager.getInstance().getTTSModelCacheDir() instead
 */
export declare function getTTSModelCacheDir(): string;
/**
 * @deprecated Use SherpaModelManager.getInstance().listDownloadedModels() instead
 */
export declare function listDownloadedModels(modelDir: string): Promise<string[]>;
/**
 * @deprecated Use SherpaModelManager.getInstance().isModelDownloaded() instead
 */
export declare function isModelDownloaded(modelName: string, modelDir: string): Promise<boolean>;
/**
 * @deprecated Use SherpaModelManager.getInstance().isSTTModelDownloaded() instead
 */
export declare function isSTTModelDownloaded(modelName: string): Promise<boolean>;
/**
 * @deprecated Use SherpaModelManager.getInstance().isTTSModelDownloaded() instead
 */
export declare function isTTSModelDownloaded(modelName: string): Promise<boolean>;
/**
 * @deprecated Use SherpaModelManager.getInstance().downloadFile() instead
 */
export declare function downloadFile(url: string, destination: string): Promise<void>;
/**
 * @deprecated Use SherpaModelManager.getInstance().extractTarBz2() instead
 */
export declare function extractTarBz2(archivePath: string, destinationDir: string): Promise<void>;
/**
 * @deprecated Use SherpaModelManager.getInstance().ensureSTTModelDownloaded() instead
 */
export declare function ensureSTTModelDownloaded(modelName: string, downloadUrl: string): Promise<string>;
/**
 * @deprecated Use SherpaModelManager.getInstance().ensureTTSModelDownloaded() instead
 */
export declare function ensureTTSModelDownloaded(modelName: string, downloadUrl: string): Promise<string>;
/**
 * @deprecated Use SherpaModelManager.getInstance().ensureVADModelDownloaded() instead
 */
export declare function ensureVADModelDownloaded(): Promise<string>;
