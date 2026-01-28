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
import { TTSEngine } from '../tts-engine.js';
import { TJBotError, ModelManager } from '../../utils/index.js';
// Lazy require sherpa-onnx to avoid hard dependency issues
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let sherpa;
/**
 * Sherpa-ONNX Local Text-to-Speech Engine
 *
 * Offline speech synthesis using Sherpa-ONNX library with Piper voices.
 * Models are automatically downloaded and cached in ~/.tjbot/models/sherpa-tts/
 * @public
 */
export class SherpaONNXTTSEngine extends TTSEngine {
    constructor(config) {
        super(config);
        this.manager = ModelManager.getInstance();
    }
    /**
     * Initialize the sherpa-onnx TTS engine.
     * Pre-downloads the configured model.
     */
    async initialize() {
        try {
            // Set environment variables to reduce noisy logging
            if (!process.env.SHERPA_ONNX_LOG_LEVEL) {
                process.env.SHERPA_ONNX_LOG_LEVEL = 'OFF';
            }
            // Lazy load sherpa-onnx
            if (!sherpa) {
                const module = await import('sherpa-onnx-node');
                // CommonJS module imported as ES module has exports in .default
                sherpa = module.default || module;
                winston.debug('Successfully loaded sherpa-onnx-node module');
            }
            // Front-load model download during initialization
            winston.info(`💬 Loading TTS model: ${this.config.model}`);
            this.modelPath = await this.ensureModelIsDownloaded();
            // Load the TTS engine
            await this.setupTTSEngine();
            winston.info('🗣️ Sherpa-ONNX TTS engine initialized');
        }
        catch (error) {
            winston.error('Failed to initialize Sherpa-ONNX TTS:', error);
            throw new TJBotError('Failed to initialize Sherpa-ONNX TTS engine', { cause: error });
        }
    }
    /**
     * Ensure the TTS model is downloaded and return its local path.
     * @returns Path to the TTS model file.
     * @throws {TJBotError} if model download fails
     */
    async ensureModelIsDownloaded() {
        try {
            const model = await this.manager.loadModel(this.config.model);
            const cacheDir = this.manager.getTTSModelCacheDir();
            return path.join(cacheDir, model.folder, model.required[0]);
        }
        catch (error) {
            throw new TJBotError('Failed to load TTS model path', { cause: error });
        }
    }
    async setupTTSEngine() {
        if (!this.modelPath) {
            throw new TJBotError('Model path not set. Ensure initialize() was called.');
        }
        // Determine the correct dataDir path (should be espeak-ng-data subdirectory if it exists)
        const espeakDataDir = path.join(path.dirname(this.modelPath), 'espeak-ng-data');
        const dataDir = fs.existsSync(espeakDataDir) ? espeakDataDir : path.dirname(this.modelPath);
        // Get the actual .onnx file - it's in the same directory as the modelPath
        const modelDir = path.dirname(this.modelPath);
        const files = fs.readdirSync(modelDir).filter((f) => f.endsWith('.onnx'));
        if (files.length === 0) {
            throw new TJBotError(`No .onnx file found in model directory: ${modelDir}`);
        }
        const modelFile = path.join(modelDir, files[0]);
        winston.debug(`💬 Found model file: ${modelFile}`);
        // Suppress sherpa-onnx console output
        const originalLog = console.log;
        const originalError = console.error;
        console.log = () => { };
        console.error = () => { };
        try {
            // Use the camelCase config expected by sherpa-onnx-node bindings
            const offlineTtsConfig = {
                model: {
                    vits: {
                        model: modelFile,
                        tokens: path.join(modelDir, 'tokens.txt'),
                        dataDir,
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
            this.ttsEngine = new sherpa.OfflineTts(offlineTtsConfig);
        }
        finally {
            console.log = originalLog;
            console.error = originalError;
        }
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
        if (!this.modelPath) {
            throw new TJBotError('Model path not set. Ensure initialize() was called.');
        }
        if (!this.ttsEngine) {
            throw new TJBotError('TTS engine not initialized. Call initialize() first.');
        }
        try {
            winston.debug(`💬 Synthesizing with sherpa-onnx: model=${this.config.model}`);
            this.validateText(text);
            // Perform synthesis
            const audio = this.ttsEngine.generate({
                text,
                sid: 0,
                speed: 1.0,
            });
            // Convert audio data to WAV buffer
            const wavBuffer = this.audioToWav(audio.samples, audio.sampleRate);
            winston.debug(`🔈 Sherpa-ONNX synthesis complete: ${wavBuffer.length} bytes`);
            return wavBuffer;
        }
        catch (error) {
            winston.error('Sherpa-ONNX TTS synthesis failed:', error);
            throw error;
        }
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
//# sourceMappingURL=sherpa-onnx.js.map