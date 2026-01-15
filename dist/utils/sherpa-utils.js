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
import fs from 'fs';
import path from 'path';
import os from 'os';
import { Readable } from 'stream';
import { execFile } from 'child_process';
import { promisify } from 'util';
import yaml from 'js-yaml';
import winston from 'winston';
import cliProgress from 'cli-progress';
import { TJBotError } from './errors.js';
import { fileURLToPath } from 'url';
const execFileAsync = promisify(execFile);
/**
 * Singleton manager for Sherpa-ONNX models
 * Handles model metadata, downloading, and caching
 */
export class SherpaModelManager {
    constructor() {
        this.sttModels = [];
        this.ttsModels = [];
        this.vadModel = {
            url: 'https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/silero_vad.onnx',
            filename: 'silero_vad.onnx',
        };
        this.metadataLoaded = false;
    }
    /**
     * Get singleton instance
     */
    static getInstance() {
        if (!this.instance) {
            this.instance = new SherpaModelManager();
        }
        return this.instance;
    }
    /**
     * Load model metadata from YAML file
     * If no path provided, uses default sherpa-models.yaml in config directory
     */
    async loadMetadata(yamlPath) {
        if (this.metadataLoaded) {
            winston.debug('Sherpa model metadata already loaded');
            return;
        }
        try {
            // Default to sherpa-models.yaml in config directory
            if (!yamlPath) {
                const __filename = fileURLToPath(import.meta.url);
                const __dirname = path.dirname(__filename);
                yamlPath = path.join(__dirname, '..', 'config', 'sherpa-models.yaml');
            }
            winston.debug(`Loading Sherpa model metadata from: ${yamlPath}`);
            const fileContents = await fs.promises.readFile(yamlPath, 'utf8');
            const data = yaml.load(fileContents);
            this.sttModels = data.stt_models || [];
            this.ttsModels = data.tts_models || [];
            this.vadModel = data.vad_model || this.vadModel;
            this.metadataLoaded = true;
            winston.debug(`Loaded ${this.sttModels.length} STT models and ${this.ttsModels.length} TTS models from YAML`);
        }
        catch (error) {
            winston.error('Failed to load Sherpa model metadata:', error);
            throw new TJBotError('Failed to load Sherpa model metadata', { cause: error });
        }
    }
    /**
     * Ensure metadata is loaded, throw if not
     */
    ensureMetadataLoaded() {
        if (!this.metadataLoaded) {
            throw new TJBotError('Sherpa model metadata not loaded. Call SherpaModelManager.getInstance().loadMetadata() first.');
        }
    }
    /**
     * Get all STT model metadata
     */
    getSTTModelMetadata() {
        this.ensureMetadataLoaded();
        return this.sttModels;
    }
    /**
     * Get STT models for user selection (simplified, without technical details)
     */
    getSTTModels() {
        this.ensureMetadataLoaded();
        return this.sttModels.map((m) => ({
            model: m.key,
            label: m.label.replace(/\s*\[OFFLINE\]\s*|\s*\[STREAMING\]\s*/g, '').trim(),
            modelUrl: m.url,
        }));
    }
    /**
     * Get all TTS models
     */
    getTTSModels() {
        this.ensureMetadataLoaded();
        return this.ttsModels;
    }
    /**
     * Get VAD model configuration
     */
    getVADModel() {
        this.ensureMetadataLoaded();
        return this.vadModel;
    }
    /**
     * Get STT model cache directory
     */
    getSTTModelCacheDir() {
        return path.join(os.homedir(), '.tjbot', 'models', 'sherpa-stt');
    }
    /**
     * Get TTS model cache directory
     */
    getTTSModelCacheDir() {
        return path.join(os.homedir(), '.tjbot', 'models', 'sherpa-tts');
    }
    /**
     * List downloaded models in a directory
     */
    listDownloadedModels(modelDir) {
        try {
            if (!fs.existsSync(modelDir)) {
                return [];
            }
            return fs.readdirSync(modelDir).filter((f) => {
                const fullPath = path.join(modelDir, f);
                return fs.statSync(fullPath).isDirectory() || f.endsWith('.onnx') || f.endsWith('.bin');
            });
        }
        catch (_e) {
            return [];
        }
    }
    /**
     * Check if a specific model is downloaded
     */
    isModelDownloaded(modelName, modelDir) {
        const downloadedModels = this.listDownloadedModels(modelDir);
        return downloadedModels.some((f) => f.includes(modelName));
    }
    /**
     * Check if an STT model is downloaded
     */
    isSTTModelDownloaded(modelName) {
        return this.isModelDownloaded(modelName, this.getSTTModelCacheDir());
    }
    /**
     * Check if a TTS model is downloaded
     */
    isTTSModelDownloaded(modelName) {
        return this.isModelDownloaded(modelName, this.getTTSModelCacheDir());
    }
    /**
     * Download a file from URL with progress bar
     */
    async downloadFile(url, destination) {
        winston.info(`Downloading from ${url}`);
        try {
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
            const nodeStream = Readable.from(response.body);
            return new Promise((resolve, reject) => {
                nodeStream.on('data', (chunk) => {
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
                    winston.info('Download complete');
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
        }
        catch (err) {
            winston.error('Download failed:', err);
            throw err;
        }
    }
    /**
     * Extract tar.bz2 archive
     */
    async extractTarBz2(archivePath, destinationDir) {
        await execFileAsync('tar', ['-xjf', archivePath, '-C', destinationDir]);
    }
    /**
     * Ensure an STT model is downloaded and cached
     */
    async ensureSTTModelDownloaded(modelName, downloadUrl) {
        this.ensureMetadataLoaded();
        const info = this.sttModels.find((m) => m.key === modelName);
        if (!info) {
            throw new TJBotError(`Unknown STT model key: ${modelName}`);
        }
        const modelDir = path.join(this.getSTTModelCacheDir(), info.folder);
        return this.ensureModelDownloaded({
            id: modelName,
            url: downloadUrl,
            targetDir: modelDir,
            requiredFiles: info.required,
            logLabel: info.label,
        });
    }
    /**
     * Ensure a TTS model is downloaded and cached
     */
    async ensureTTSModelDownloaded(modelName, downloadUrl) {
        this.ensureMetadataLoaded();
        const info = this.ttsModels.find((m) => m.model === modelName);
        const logLabel = info?.label ?? modelName;
        const modelDir = path.join(this.getTTSModelCacheDir(), modelName);
        return this.ensureModelDownloaded({
            id: modelName,
            url: downloadUrl,
            targetDir: modelDir,
            returnOnnxFile: true,
            logLabel,
        });
    }
    /**
     * Generic helper to download/extract a Sherpa model to a target directory.
     * If requiredFiles are provided, all must exist post-download. If returnOnnxFile is true,
     * returns the first .onnx file found; otherwise returns the target directory path.
     */
    async ensureModelDownloaded(options) {
        const { id, url, targetDir, requiredFiles, returnOnnxFile, logLabel } = options;
        const label = logLabel ?? id;
        const targetRoot = path.dirname(targetDir);
        // Fast-path: cache hit
        if (fs.existsSync(targetDir)) {
            if (returnOnnxFile) {
                const onnxFiles = fs.readdirSync(targetDir).filter((f) => f.endsWith('.onnx') && !f.includes('voices'));
                if (onnxFiles.length > 0) {
                    winston.debug(`📦 Using cached sherpa-onnx model: ${label}`);
                    return path.join(targetDir, onnxFiles[0]);
                }
            }
            if (requiredFiles) {
                const missing = requiredFiles.filter((file) => !fs.existsSync(path.join(targetDir, file)));
                if (missing.length === 0) {
                    return targetDir;
                }
            }
        }
        await fs.promises.mkdir(targetRoot, { recursive: true });
        const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'sherpa-model-'));
        const archivePath = path.join(tmpDir, path.basename(url));
        winston.info(`📦 Downloading sherpa-onnx model: ${label}`);
        await this.downloadFile(url, archivePath);
        winston.info('📦 Extracting model...');
        await this.extractTarBz2(archivePath, targetRoot);
        await fs.promises.rm(tmpDir, { recursive: true, force: true });
        if (returnOnnxFile) {
            const onnxFiles = fs.readdirSync(targetDir).filter((f) => f.endsWith('.onnx') && !f.includes('voices'));
            if (onnxFiles.length === 0) {
                const files = fs.readdirSync(targetDir);
                throw new TJBotError(`No .onnx model file found in ${targetDir}. Files present: ${files.join(', ')}`);
            }
            winston.info(`📦 Successfully downloaded sherpa-onnx model: ${label} (${onnxFiles[0]})`);
            return path.join(targetDir, onnxFiles[0]);
        }
        if (requiredFiles) {
            const missing = requiredFiles.filter((file) => !fs.existsSync(path.join(targetDir, file)));
            if (missing.length > 0) {
                throw new TJBotError(`Model download incomplete. Missing: ${missing.join(', ')}`);
            }
        }
        winston.info(`📦 Successfully downloaded sherpa-onnx model: ${label}`);
        return targetDir;
    }
    /**
     * Ensure the Silero VAD model is downloaded
     */
    async ensureVADModelDownloaded() {
        this.ensureMetadataLoaded();
        const modelCacheDir = this.getSTTModelCacheDir();
        const dest = path.join(modelCacheDir, this.vadModel.filename);
        if (fs.existsSync(dest)) {
            return dest;
        }
        const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'sherpa-vad-'));
        const tmpFile = path.join(tmpDir, this.vadModel.filename);
        winston.info('📦 Downloading Silero VAD model...');
        await this.downloadFile(this.vadModel.url, tmpFile);
        await fs.promises.rename(tmpFile, dest);
        await fs.promises.rm(tmpDir, { recursive: true, force: true });
        return dest;
    }
}
// =============================================================================
// Backward Compatibility Exports
// These maintain the existing functional API while using the singleton internally
// =============================================================================
/**
 * @deprecated Use SherpaModelManager.getInstance().getSTTModelMetadata() instead
 */
export const STT_MODEL_METADATA = [];
/**
 * @deprecated Use SherpaModelManager.getInstance().getVADModel() instead
 */
export const VAD_MODEL = {
    url: 'https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/silero_vad.onnx',
    filename: 'silero_vad.onnx',
};
/**
 * @deprecated Use SherpaModelManager.getInstance().getSTTModels() instead
 */
export const STT_MODELS = [];
/**
 * @deprecated Use SherpaModelManager.getInstance().getTTSModels() instead
 */
export const TTS_MODELS = [];
/**
 * @deprecated Use SherpaModelManager.getInstance().getSTTModelCacheDir() instead
 */
export function getSTTModelCacheDir() {
    return SherpaModelManager.getInstance().getSTTModelCacheDir();
}
/**
 * @deprecated Use SherpaModelManager.getInstance().getTTSModelCacheDir() instead
 */
export function getTTSModelCacheDir() {
    return SherpaModelManager.getInstance().getTTSModelCacheDir();
}
/**
 * @deprecated Use SherpaModelManager.getInstance().listDownloadedModels() instead
 */
export function listDownloadedModels(modelDir) {
    return SherpaModelManager.getInstance().listDownloadedModels(modelDir);
}
/**
 * @deprecated Use SherpaModelManager.getInstance().isModelDownloaded() instead
 */
export function isModelDownloaded(modelName, modelDir) {
    return SherpaModelManager.getInstance().isModelDownloaded(modelName, modelDir);
}
/**
 * @deprecated Use SherpaModelManager.getInstance().isSTTModelDownloaded() instead
 */
export function isSTTModelDownloaded(modelName) {
    return SherpaModelManager.getInstance().isSTTModelDownloaded(modelName);
}
/**
 * @deprecated Use SherpaModelManager.getInstance().isTTSModelDownloaded() instead
 */
export function isTTSModelDownloaded(modelName) {
    return SherpaModelManager.getInstance().isTTSModelDownloaded(modelName);
}
/**
 * @deprecated Use SherpaModelManager.getInstance().downloadFile() instead
 */
export async function downloadFile(url, destination) {
    return SherpaModelManager.getInstance().downloadFile(url, destination);
}
/**
 * @deprecated Use SherpaModelManager.getInstance().extractTarBz2() instead
 */
export async function extractTarBz2(archivePath, destinationDir) {
    return SherpaModelManager.getInstance().extractTarBz2(archivePath, destinationDir);
}
/**
 * @deprecated Use SherpaModelManager.getInstance().ensureSTTModelDownloaded() instead
 */
export async function ensureSTTModelDownloaded(modelName, downloadUrl) {
    return SherpaModelManager.getInstance().ensureSTTModelDownloaded(modelName, downloadUrl);
}
/**
 * @deprecated Use SherpaModelManager.getInstance().ensureTTSModelDownloaded() instead
 */
export async function ensureTTSModelDownloaded(modelName, downloadUrl) {
    return SherpaModelManager.getInstance().ensureTTSModelDownloaded(modelName, downloadUrl);
}
/**
 * @deprecated Use SherpaModelManager.getInstance().ensureVADModelDownloaded() instead
 */
export async function ensureVADModelDownloaded() {
    return SherpaModelManager.getInstance().ensureVADModelDownloaded();
}
//# sourceMappingURL=sherpa-utils.js.map