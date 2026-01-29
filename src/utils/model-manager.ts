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

import { execFile } from 'child_process';
import cliProgress from 'cli-progress';
import fs from 'fs';
import yaml from 'js-yaml';
import os from 'os';
import path from 'path';
import { Readable } from 'stream';
import { fileURLToPath } from 'url';
import { promisify } from 'util';
import winston from 'winston';
import { TJBotError } from './errors.js';

const execFileAsync = promisify(execFile);

/**
 * Types of models managed by ModelManager
 * Includes base types (stt, tts, vad) and vision subtypes
 */
export type ModelType =
    | 'stt'
    | 'tts'
    | 'vad'
    | 'vision.object-recognition'
    | 'vision.classification'
    | 'vision.face-detection'
    | 'vision.image-description';

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
    kind: 'detection' | 'classification' | 'face-detection' | 'image-description';
    labelUrl?: string;
    inputShape?: number[];
}

/**
 * Unified model metadata structure
 */
interface ModelsYAML {
    models: BaseModelMetadata[];
}

/**
 * Unified singleton registry for all TJBot models (STT, TTS, VAD, Vision)
 * Handles model metadata, registration, downloading, extraction, and caching
 */
export class ModelRegistry {
    private static instance?: ModelRegistry;
    private registeredModels: Map<string, BaseModelMetadata> = new Map();
    private metadataLoaded = false;

    private constructor() {
        this.loadMetadata();
    }

    /**
     * Get singleton instance
     */
    static getInstance(): ModelRegistry {
        if (!this.instance) {
            this.instance = new ModelRegistry();
        }
        return this.instance;
    }

    /**
     * Load model metadata from unified YAML file
     * If no path provided, uses default model-registry.yaml in config directory
     * @private
     */
    private loadMetadata(yamlPath?: string): void {
        if (this.metadataLoaded) {
            winston.debug('Model metadata already loaded');
            return;
        }

        try {
            // Default to model-registry.yaml in config directory
            if (!yamlPath) {
                const __filename = fileURLToPath(import.meta.url);
                const __dirname = path.dirname(__filename);
                yamlPath = path.join(__dirname, '..', 'config', 'model-registry.yaml');
            }

            winston.debug(`Loading model metadata from: ${yamlPath}`);

            const fileContents = fs.readFileSync(yamlPath, 'utf8');
            const data = yaml.load(fileContents) as ModelsYAML;

            const models = (data.models || []).map((m) => {
                const key = m.key;
                if (!key) {
                    throw new TJBotError('Model entry missing key');
                }
                return {
                    ...m,
                    key,
                    folder: m.folder ?? key,
                    required: m.required ?? [],
                };
            });

            // Register all loaded models
            for (const model of models) {
                this.registerModel(model);
            }

            this.metadataLoaded = true;
            winston.debug(`Loaded metadata for ${this.registeredModels.size} models from YAML`);
        } catch (error) {
            winston.error('Failed to load model metadata:', error);
            throw new TJBotError('Failed to load model metadata', { cause: error as Error });
        }
    }

    // ============================================================================
    // Cache Directory Paths
    // ============================================================================

    /**
     * Get model cache directory
     */
    private getModelCacheDir(): string {
        return path.join(os.homedir(), '.tjbot', 'models');
    }

    /**
     * Get model cache directory for a specific type
     * @param modelType The model type (stt, tts, vad, vision.*)
     * @returns The cache directory path for the specified model type
     */
    private getModelCacheDirForType(modelType: ModelType): string {
        // For vision subtypes, use 'vision' as the base directory
        const cacheSubdir = modelType.startsWith('vision.') ? 'vision' : modelType;
        return path.join(this.getModelCacheDir(), cacheSubdir);
    }

    /**
     * Get STT model cache directory
     */
    getSTTModelCacheDir(): string {
        return this.getModelCacheDirForType('stt');
    }

    /**
     * Get TTS model cache directory
     */
    getTTSModelCacheDir(): string {
        return this.getModelCacheDirForType('tts');
    }

    /**
     * Get VAD model cache directory
     */
    getVADModelCacheDir(): string {
        return this.getModelCacheDirForType('vad');
    }

    /**
     * Get Vision model cache directory
     */
    getVisionModelCacheDir(): string {
        // All vision models use the 'vision' subdirectory regardless of subtype
        return path.join(this.getModelCacheDir(), 'vision');
    }

    // ============================================================================
    // Query Methods
    // ============================================================================

    /**
     * Register a model in the registry
     * @param model The model metadata to register
     */
    registerModel(model: BaseModelMetadata): void {
        this.registeredModels.set(model.key, model);
        winston.debug(`Registered model: ${model.key} (type: ${model.type})`);
    }

    /**
     * Lookup model metadata by key
     * @param modelKey The model key
     * @returns The model metadata
     * @throws Error if model not found
     * @private
     */
    private lookupModel(modelKey: string): BaseModelMetadata {
        const model = this.registeredModels.get(modelKey);
        if (!model) {
            throw new TJBotError(`Model with key "${modelKey}" not found in registry`);
        }
        return model;
    }

    /**
     * Supported models of a given type
     * Supports exact type matching and prefix matching for vision subtypes
     * @param modelType The model type (stt, tts, vad, vision.*) or 'vision' to get all vision models
     * @returns List of supported models of the specified type
     * @private
     */
    private getSupportedModels(modelType: ModelType | 'vision'): BaseModelMetadata[] {
        // For 'vision', match all vision.* types
        if (modelType === 'vision') {
            return Array.from(this.registeredModels.values()).filter(
                (m: BaseModelMetadata) => typeof m.type === 'string' && m.type.startsWith('vision.')
            );
        }
        return Array.from(this.registeredModels.values()).filter((m: BaseModelMetadata) => m.type === modelType);
    }

    /**
     * Supported STT models (full metadata)
     */
    getSupportedSTTModels(): STTModelMetadata[] {
        return this.getSupportedModels('stt') as STTModelMetadata[];
    }

    /**
     * Supported TTS models (full metadata)
     */
    getSupportedTTSModels(): TTSModelMetadata[] {
        return this.getSupportedModels('tts') as TTSModelMetadata[];
    }

    /**
     * Supported VAD models (full metadata)
     */
    getSupportedVADModels(): VADModelMetadata[] {
        return this.getSupportedModels('vad') as VADModelMetadata[];
    }

    /**
     * Supported Vision models (full metadata)
     */
    getSupportedVisionModels(): VisionModelMetadata[] {
        return this.getSupportedModels('vision') as VisionModelMetadata[];
    }

    /**
     * Validate that all required model files exist in the given path
     * @param modelKey The model key
     * @returns True if all required files exist, false otherwise
     */
    private validateModelFilesExist(modelKey: string): boolean {
        const model = this.lookupModel(modelKey);
        const cacheDir = this.getModelCacheDirForType(model.type);
        const modelPath = path.join(cacheDir, model.folder);
        for (const file of model.required) {
            const filePath = path.join(modelPath, file);
            if (!fs.existsSync(filePath)) {
                winston.warn(`Required model file missing: ${filePath}`);
                return false;
            }
        }
        return true;
    }

    /**
     * Installed models of a given type
     * @param modelType The model type (stt, tts, vad, vision.*) or 'vision' to get all vision models
     * @returns List of installed models of the specified type
     */
    getInstalledModels(modelType: ModelType | 'vision'): BaseModelMetadata[] {
        const installed: BaseModelMetadata[] = [];
        winston.debug(
            `Checking for installed ${modelType} models. Total models in registry: ${this.registeredModels.size}`
        );

        for (const model of Array.from(this.registeredModels.values()).filter((m: BaseModelMetadata) => {
            if (modelType === 'vision') {
                return typeof m.type === 'string' && m.type.startsWith('vision.');
            }
            return m.type === modelType;
        })) {
            const cacheDir = this.getModelCacheDirForType(model.type);
            const modelPath = path.join(cacheDir, model.folder);
            winston.debug(`Checking ${modelType} model "${model.key}" at ${modelPath}`);
            winston.debug(`  Model object keys: ${Object.keys(model).join(', ')}`);

            if (fs.existsSync(modelPath)) {
                winston.debug('  Directory exists');
                if (this.validateModelFilesExist(model.key)) {
                    winston.debug('  All required files present, adding to installed list');
                    winston.debug(`  About to push model with key="${model.key}", label="${model.label}"`);
                    installed.push(model);
                } else {
                    winston.warn(
                        `One or more model files are missing for installed model ${model.key}. Please remove this model from ${modelPath} and re-download this model.`
                    );
                }
            } else {
                winston.debug('  Directory does not exist');
            }
        }
        winston.debug(`Found ${installed.length} installed ${modelType} models`);
        return installed;
    }

    /**
     * List installed STT models
     * @returns List of installed STT models
     */
    getInstalledSTTModels(): STTModelMetadata[] {
        return this.getInstalledModels('stt') as STTModelMetadata[];
    }

    /**
     * List installed TTS models
     * @returns List of installed TTS models
     */
    getInstalledTTSModels(): TTSModelMetadata[] {
        return this.getInstalledModels('tts') as TTSModelMetadata[];
    }

    /**
     * List installed VAD models
     * @returns List of installed VAD models
     */
    getInstalledVADModels(): VADModelMetadata[] {
        return this.getInstalledModels('vad') as VADModelMetadata[];
    }

    /**
     * List installed Vision models
     * @returns List of installed Vision models
     */
    getInstalledVisionModels(): VisionModelMetadata[] {
        return this.getInstalledModels('vision') as VisionModelMetadata[];
    }

    // ===========================================================================
    // Model Size Fetching
    // ===========================================================================

    /**
     * Fetch the remote file size in bytes using HTTP HEAD
     */
    async fetchModelSize(modelKey: string): Promise<number> {
        const meta = this.lookupModel(modelKey);

        // Synchronous HEAD request to get Content-Length
        const response = await fetch(meta.url, { method: 'HEAD' });
        if (!response.ok) {
            throw new TJBotError(`Failed to fetch model size for ${modelKey}: HTTP ${response.status}`);
        }

        const contentLength = response.headers.get('content-length');
        if (!contentLength) {
            throw new TJBotError(`Content-Length header not found for model ${modelKey}`);
        }

        return parseInt(contentLength, 10);
    }

    // ============================================================================
    // Download/Extract Models
    // ============================================================================

    /**
     * Check if a model is downloaded in the specified cache directory
     * @param modelKey The model key
     * @returns True if the model is downloaded, false otherwise
     */
    isModelDownloaded(modelKey: string): boolean {
        const model = this.lookupModel(modelKey);
        const cacheDir = this.getModelCacheDirForType(model.type);
        const modelPath = path.join(cacheDir, model.folder);

        if (!fs.existsSync(modelPath)) {
            return false;
        }

        // Check all required files exist
        return model.required.every((file) => fs.existsSync(path.join(modelPath, file)));
    }

    /**
     * Copy a file from local filesystem
     * Supports file:// URLs
     */
    private async copyFile(sourceUrl: string, destination: string): Promise<void> {
        try {
            // Convert file:// URL to path
            const sourcePath = sourceUrl.startsWith('file://') ? new URL(sourceUrl).pathname : sourceUrl;

            winston.info(`📦 Copying file from ${sourcePath}`);

            // Get file size for progress bar
            const stats = await fs.promises.stat(sourcePath);
            const totalSize = stats.size;
            let copiedSize = 0;

            // Create progress bar
            const progressBar = new cliProgress.SingleBar({
                format: 'Copying [{bar}] {percentage}% | {value}/{total} MB',
                barCompleteChar: '\u2588',
                barIncompleteChar: '\u2591',
                hideCursor: true,
            });

            if (totalSize > 0) {
                progressBar.start(Math.round(totalSize / 1024 / 1024), 0);
            }

            // Create destination directory
            await fs.promises.mkdir(path.dirname(destination), { recursive: true });

            // Copy file with progress tracking
            const reader = fs.createReadStream(sourcePath);
            const writer = fs.createWriteStream(destination);

            await new Promise<void>((resolve, reject) => {
                reader.on('data', (chunk: Buffer) => {
                    copiedSize += chunk.length;
                    if (totalSize > 0) {
                        progressBar.update(Math.round(copiedSize / 1024 / 1024));
                    }
                });

                reader.pipe(writer);
                writer.on('finish', () => {
                    if (totalSize > 0) {
                        progressBar.stop();
                    }
                    winston.info('✅ File copy complete');
                    resolve();
                });
                writer.on('error', (err) => {
                    if (totalSize > 0) {
                        progressBar.stop();
                    }
                    reject(err);
                });
                reader.on('error', (err) => {
                    if (totalSize > 0) {
                        progressBar.stop();
                    }
                    reject(err);
                });
            });
        } catch (err) {
            winston.error('❌ File copy failed:', err);
            throw new TJBotError(`Failed to copy file from ${sourceUrl}`, {
                cause: err as Error,
            });
        }
    }

    /**
     * Download a file from URL with progress bar and exponential backoff retry
     * Retries up to 3 times with delays: 1s, 2s, 4s
     * Supports both http/https URLs and file:// URLs
     */
    private async downloadFile(url: string, destination: string, maxRetries = 3): Promise<void> {
        // Handle file:// URLs (local files)
        if (url.startsWith('file://')) {
            return this.copyFile(url, destination);
        }

        let attempt = 0;
        let lastError: Error | null = null;

        while (attempt < maxRetries) {
            try {
                if (attempt > 0) {
                    const delay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
                    winston.info(`⏱️  Retrying download in ${delay / 1000}s... (attempt ${attempt + 1}/${maxRetries})`);
                    await new Promise((resolve) => setTimeout(resolve, delay));
                }

                winston.info(`📦 Downloading from ${url} (attempt ${attempt + 1}/${maxRetries})`);

                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const totalSize = parseInt(response.headers.get('content-length') ?? '0', 10);
                let downloadedSize = 0;

                // Create progress bar
                const progressBar = new cliProgress.SingleBar({
                    format: 'Downloading [{bar}] {percentage}% | {value}/{total} MB',
                    barCompleteChar: '\u2588',
                    barIncompleteChar: '\u2591',
                    hideCursor: true,
                });

                if (totalSize > 0) {
                    progressBar.start(Math.round(totalSize / 1024 / 1024), 0);
                }

                await fs.promises.mkdir(path.dirname(destination), { recursive: true });
                const writer = fs.createWriteStream(destination);
                const nodeStream = Readable.from(response.body as ReadableStream<Uint8Array>);

                await new Promise<void>((resolve, reject) => {
                    nodeStream.on('data', (chunk: Buffer) => {
                        downloadedSize += chunk.length;
                        if (totalSize > 0) {
                            progressBar.update(Math.round(downloadedSize / 1024 / 1024));
                        }
                    });

                    nodeStream.pipe(writer);
                    writer.on('finish', () => {
                        if (totalSize > 0) {
                            progressBar.stop();
                        }
                        winston.info('✅ Download complete');
                        resolve();
                    });
                    writer.on('error', (err) => {
                        if (totalSize > 0) {
                            progressBar.stop();
                        }
                        reject(err);
                    });
                    nodeStream.on('error', (err) => {
                        if (totalSize > 0) {
                            progressBar.stop();
                        }
                        reject(err);
                    });
                });

                // Success!
                return;
            } catch (err) {
                lastError = err as Error;
                winston.warn(`❌ Download failed (attempt ${attempt + 1}/${maxRetries}):`, err);
                attempt++;
            }
        }

        // All retries exhausted
        winston.error(`❌ Download failed after ${maxRetries} attempts`);
        throw new TJBotError(`Failed to download file after ${maxRetries} attempts`, {
            cause: lastError || new Error('Unknown error'),
        });
    }

    /**
     * Extract tar.bz2 archive using system tar command
     */
    private async extractTarBz2(archivePath: string, destinationDir: string): Promise<void> {
        winston.info('📦 Extracting archive...');
        await execFileAsync('tar', ['-xjf', archivePath, '-C', destinationDir]);
        winston.info('✅ Extraction complete');
    }

    /**
     * Download and extract a model
     * @param modelKey The model key
     * @throws Error if download or extraction fails
     */
    async downloadModel(modelKey: string) {
        const model = this.lookupModel(modelKey);
        const cacheDir = this.getModelCacheDirForType(model.type);
        const modelPath = path.join(cacheDir, model.folder);

        if (this.isModelDownloaded(modelKey)) {
            return { primaryPath: path.join(modelPath, model.required[0]), cachePath: modelPath };
        }

        // Ensure cache directory exists
        await fs.promises.mkdir(cacheDir, { recursive: true });

        // Download to temporary file
        const tempArchivePath = path.join(os.tmpdir(), `${model.key}-download`);
        await this.downloadFile(model.url, tempArchivePath);

        // Check if we need to extract based on file extension
        const isTarBz2 = model.url.endsWith('.tar.bz2');

        if (isTarBz2) {
            // Extract tar.bz2 archive
            await this.extractTarBz2(tempArchivePath, cacheDir);
            // Remove temporary archive file
            fs.unlinkSync(tempArchivePath);
        } else {
            // Single file model - move directly to model path
            await fs.promises.mkdir(modelPath, { recursive: true });
            const fileName = path.basename(model.url).split('?')[0]; // Remove query params
            const targetPath = path.join(modelPath, fileName);
            await fs.promises.rename(tempArchivePath, targetPath);
        }

        // Download labels file for vision models
        if (typeof model.type === 'string' && model.type.startsWith('vision.')) {
            const visionModel = model as VisionModelMetadata;
            if (visionModel.labelUrl) {
                const labelsFileName = path.basename(visionModel.labelUrl).split('?')[0]; // Extract filename, remove query params
                const labelsFilePath = path.join(modelPath, labelsFileName);
                await this.downloadFile(visionModel.labelUrl, labelsFilePath);
            }
        }

        // Verify all required files exist
        if (!this.validateModelFilesExist(modelKey)) {
            throw new TJBotError(`Model "${modelKey}" download incomplete: required files missing after extraction`);
        }

        winston.info(`✅ Model "${modelKey}" downloaded and extracted to ${modelPath}`);
        return;
    }

    /**
     * Ensure a model is downloaded and return its path
     * @param modelKey The model key
     * @returns The model metadata
     * @throws TJBotError if model not found or download fails
     */
    async loadModel<T extends BaseModelMetadata = BaseModelMetadata>(modelKey: string): Promise<T> {
        // Verify model exists in metadata
        const model = this.lookupModel(modelKey);

        // Download model if not already present
        if (!this.isModelDownloaded(modelKey)) {
            await this.downloadModel(modelKey);
        }

        // Return the model metadata
        return model as T;
    }
}
