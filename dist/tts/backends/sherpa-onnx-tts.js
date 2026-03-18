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
import winston from 'winston';
import { ModelRegistry, TJBotError } from '../../utils/index.js';
import { LogEmoji } from '../../utils/logging.js';
import { TTSEngine } from '../tts-engine.js';
const EMO = LogEmoji.TTS;
// Lazy require sherpa-onnx to avoid hard dependency issues
let sherpa;
/**
 * Sherpa-ONNX Local Text-to-Speech Engine
 *
 * Offline speech synthesis using Sherpa-ONNX library with Piper voices.
 * Models are automatically downloaded and cached in ~/.tjbot/models/sherpa-tts/
 * @public
 */
export class SherpaONNXTTSEngine extends TTSEngine {
    registry = ModelRegistry.getInstance();
    modelInfo;
    modelPath;
    ttsEngine;
    /**
     * Initialize the sherpa-onnx TTS engine.
     * Pre-downloads the configured model.
     */
    async initialize() {
        const config = this.config;
        // Set environment variables to reduce noisy logging
        if (!process.env.SHERPA_ONNX_LOG_LEVEL) {
            process.env.SHERPA_ONNX_LOG_LEVEL = 'OFF';
        }
        // Load sherpa-onnx
        if (!sherpa) {
            const module = await import('sherpa-onnx-node');
            // CommonJS module imported as ES module has exports in .default
            sherpa = (module.default || module);
            winston.debug(`${EMO} successfully loaded sherpa-onnx-node module`);
        }
        // Load TTS model from registry
        const modelName = config.model;
        winston.info(`${EMO} Loading TTS model: ${modelName}`);
        this.modelInfo = await this.registry.loadModel(modelName);
        this.modelPath = this.pathForModel();
        // Load the TTS synthesizer
        await this.setupSynthesizer();
        winston.info(`${EMO} Sherpa-ONNX TTS engine initialized`);
    }
    pathForModel() {
        if (!this.modelInfo) {
            throw new TJBotError('Model info not set. Ensure initialize() was called.');
        }
        // Resolve the model directory inside the local cache.
        const modelCacheDir = this.registry.getModelCacheDirForType('tts');
        const modelDir = path.join(modelCacheDir, this.modelInfo.folder);
        const vitsDataDir = this.resolveVitsDataDir(modelDir);
        // The voice model file is expected in the model directory.
        const files = fs.readdirSync(modelDir).filter((f) => f.endsWith('.onnx'));
        if (files.length === 0) {
            throw new TJBotError(`No .onnx file found in model directory: ${modelDir}`);
        }
        const modelFile = path.join(modelDir, files[0]);
        winston.debug(`${EMO} Found TTS model file: ${modelFile} (vitsDataDir: ${vitsDataDir})`);
        return modelFile;
    }
    /**
     * Setup synthesizer based on model configuration
     */
    async setupSynthesizer() {
        if (!this.modelInfo) {
            throw new TJBotError('Model info not set. Ensure initialize() was called.');
        }
        if (!this.modelPath) {
            throw new TJBotError('Model path not set. Ensure model is downloaded and initialize() was called.');
        }
        if (!sherpa) {
            throw new TJBotError('Sherpa-ONNX module not loaded. Ensure initialize() was called.');
        }
        const modelFile = this.modelPath;
        const modelDir = path.dirname(modelFile);
        const vitsDataDir = this.resolveVitsDataDir(modelDir);
        winston.debug(`${EMO} using TTS model file: ${modelFile} (vitsDataDir: ${vitsDataDir})`);
        this.ttsEngine = this.createOfflineTTS(modelFile, vitsDataDir);
    }
    /**
     * Synthesize text to WAV audio using sherpa-onnx.
     * Voice is configured at engine initialization time via config.
     *
     * @param text - Text to synthesize
     * @returns WAV audio buffer
     * @throws Error if not initialized or synthesis fails
     */
    async synthesize(text) {
        if (!sherpa) {
            throw new TJBotError('Sherpa-ONNX TTS service not initialized. Call initialize() first.');
        }
        if (!this.ttsEngine) {
            throw new TJBotError('TTS engine not initialized. Call initialize() first.');
        }
        this.validateText(text);
        winston.verbose(`${EMO} Synthesizing speech with Sherpa-ONNX TTS (model=${this.config.model})`);
        // Perform synthesis - pass parameters as object
        const audio = this.ttsEngine.generate({
            text,
            sid: 0,
            speed: 1.0,
        });
        // Convert audio data to WAV buffer
        const wavBuffer = this.audioToWav(audio.samples, audio.sampleRate);
        winston.debug(`${EMO} Sherpa-ONNX TTS synthesis complete: ${wavBuffer.length} bytes`);
        return wavBuffer;
    }
    /**
     * Resolve the data directory for VITS models. Some models include
     * a separate "espeak-ng-data" folder with necessary data files.
     * If that folder exists, return its path. Otherwise, return
     * the base model directory.
     * @returns Path to the data directory to be used for VITS synthesis
     */
    resolveVitsDataDir(modelDir) {
        const espeakNgDataDir = path.join(modelDir, 'espeak-ng-data');
        return fs.existsSync(espeakNgDataDir) ? espeakNgDataDir : modelDir;
    }
    /**
     * Setup synthesizer based on model configuration. Creates the OfflineTts instance with the appropriate config.
     * @param modelFile The full path to the model file
     * @param vitsDataDir The directory containing VITS data files (may be the same as modelDir or a subdirectory)
     * @returns An instance of OfflineTts configured with the specified model
     */
    createOfflineTTS(modelFile, vitsDataDir) {
        if (!sherpa) {
            throw new TJBotError('Sherpa-ONNX module not loaded. Ensure initialize() was called.');
        }
        // Suppress sherpa-onnx console output
        const originalLog = console.log;
        const originalError = console.error;
        console.log = () => { };
        console.error = () => { };
        const tokensPath = path.join(path.dirname(modelFile), 'tokens.txt');
        if (!fs.existsSync(tokensPath)) {
            throw new TJBotError(`Tokens file not found for model ${modelFile} at expected path: ${tokensPath}`);
        }
        let ttsEngine;
        try {
            // Use the camelCase config expected by sherpa-onnx-node bindings
            const offlineTtsConfig = {
                model: {
                    vits: {
                        model: modelFile,
                        tokens: tokensPath,
                        dataDir: vitsDataDir,
                        noiseScale: 0.667,
                        noiseScaleW: 0.8,
                        lengthScale: 1.0,
                    },
                    numThreads: 1,
                    provider: 'cpu',
                    debug: 0,
                },
                maxNumSentences: 1,
            };
            ttsEngine = new sherpa.OfflineTts(offlineTtsConfig);
        }
        finally {
            console.log = originalLog;
            console.error = originalError;
        }
        return ttsEngine;
    }
    /**
     * Convert PCM samples to WAV format.
     * Creates a proper WAV file with header and audio data.
     *
     * @param samples - PCM audio samples (typically as Float32Array)
     * @param sampleRate - Sample rate in Hz (e.g., 22050)
     * @returns WAV file as Buffer
     */
    audioToWav(samples, sampleRate) {
        // Convert samples to 16-bit PCM
        const pcm16 = this.float32ToPcm16(samples);
        // Create WAV header
        const channels = 1;
        const bytesPerSample = 2;
        const byteRate = sampleRate * channels * bytesPerSample;
        const blockAlign = channels * bytesPerSample;
        const header = Buffer.alloc(44);
        // "RIFF" chunk descriptor
        header.write('RIFF', 0, 4, 'ascii');
        header.writeUInt32LE(36 + pcm16.length, 4);
        header.write('WAVE', 8, 4, 'ascii');
        // "fmt " subchunk
        header.write('fmt ', 12, 4, 'ascii');
        header.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
        header.writeUInt16LE(1, 20); // AudioFormat (1 for PCM)
        header.writeUInt16LE(channels, 22); // NumChannels
        header.writeUInt32LE(sampleRate, 24); // SampleRate
        header.writeUInt32LE(byteRate, 28); // ByteRate
        header.writeUInt16LE(blockAlign, 32); // BlockAlign
        header.writeUInt16LE(16, 34); // BitsPerSample
        // "data" subchunk
        const dataHeader = Buffer.alloc(8);
        dataHeader.write('data', 0, 4, 'ascii');
        dataHeader.writeUInt32LE(pcm16.length, 4);
        return Buffer.concat([header, dataHeader, pcm16]);
    }
    /**
     * Convert Float32 PCM samples to 16-bit PCM.
     *
     * @param float32Samples - Float32 audio samples (range -1.0 to 1.0)
     * @returns 16-bit PCM samples as Buffer
     */
    float32ToPcm16(float32Samples) {
        const output = new Int16Array(float32Samples.length);
        for (let i = 0; i < float32Samples.length; i++) {
            const sample = Math.max(-1, Math.min(1, float32Samples[i]));
            output[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
        }
        return Buffer.from(output.buffer);
    }
}
//# sourceMappingURL=sherpa-onnx-tts.js.map