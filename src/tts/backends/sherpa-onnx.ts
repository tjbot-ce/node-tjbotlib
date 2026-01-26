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
import { TJBotError, SherpaModelManager } from '../../utils/index.js';
import type { TTSBackendLocalConfig } from '../../config/config-types.js';

// Lazy require sherpa-onnx to avoid hard dependency issues
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let sherpa: any;

/**
 * Sherpa-ONNX Local Text-to-Speech Engine
 *
 * Offline speech synthesis using Sherpa-ONNX library with Piper voices.
 * Models are automatically downloaded and cached in ~/.tjbot/models/sherpa-tts/
 * @public
 */
export class SherpaONNXTTSEngine extends TTSEngine {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private ttsEngine: any;
    private modelPath: string | undefined;

    constructor(config?: TTSBackendLocalConfig) {
        super(config);
    }

    /**
     * Initialize the sherpa-onnx TTS engine.
     * Pre-downloads the configured model.
     */
    async initialize(): Promise<void> {
        try {
            // Load model metadata from YAML
            const manager = SherpaModelManager.getInstance();
            manager.loadMetadata();

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
            const model = this.validateModel();
            this.modelPath = await manager.ensureTTSModelDownloaded(model.name, model.modelUrl);
            winston.info('🗣️ Sherpa-ONNX TTS engine initialized');
        } catch (error) {
            winston.error('Failed to initialize Sherpa-ONNX TTS:', error);
            throw new TJBotError('Failed to initialize Sherpa-ONNX TTS engine', { cause: error as Error });
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
    async synthesize(text: string): Promise<Buffer> {
        this.validateText(text);

        if (!sherpa) {
            throw new TJBotError('Sherpa-ONNX TTS service not initialized. Call initialize() first.');
        }

        try {
            // Validate and get model configuration
            const model = this.validateModel();
            winston.debug(`💬 Synthesizing with sherpa-onnx: model=${model.name}`);

            // Model is already downloaded in initialize(); use the cached path
            if (!this.modelPath) {
                throw new TJBotError('Model path not set. Ensure initialize() was called.');
            }

            // Create TTS engine instance if we don't have one
            if (!this.ttsEngine) {
                winston.info(`💬 Loading TTS model: ${model.name}`);

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
                console.log = () => {};
                console.error = () => {};

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
                } finally {
                    console.log = originalLog;
                    console.error = originalError;
                }
                winston.info('💬 TTS model loaded successfully');
            }

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
        } catch (error) {
            winston.error('Sherpa-ONNX TTS synthesis failed:', error);
            throw error;
        }
    }

    /**
     * Validate that model and modelUrl are configured.
     * @returns Object with model name and URL
     * @throws Error if model or modelUrl is not configured
     */
    private validateModel(): { name: string; modelUrl: string } {
        const model = this.config.model as string;
        const modelUrl = this.config.modelUrl as string;

        if (!model || !modelUrl) {
            throw new TJBotError(
                'Model not configured for local TTS. ' +
                    'Please set speak.backend.local.model and speak.backend.local.modelUrl in your tjbot.toml config.'
            );
        }

        return { name: model, modelUrl };
    }

    /**
     * Convert PCM samples to WAV format.
     * Creates a proper WAV file with header and audio data.
     *
     * @param samples - PCM audio samples (typically as Float32Array)
     * @param sampleRate - Sample rate in Hz (e.g., 22050)
     * @returns WAV file as Buffer
     */
    private audioToWav(samples: Float32Array | number[], sampleRate: number): Buffer {
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
    private float32ToPcm16(float32Samples: Float32Array | number[]): Buffer {
        const output = new Int16Array(float32Samples.length);

        for (let i = 0; i < float32Samples.length; i++) {
            const sample = Math.max(-1, Math.min(1, float32Samples[i]));
            output[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
        }

        return Buffer.from(output.buffer);
    }
}
