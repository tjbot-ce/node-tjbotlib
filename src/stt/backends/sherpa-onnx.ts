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
import type { CircularBuffer } from 'sherpa-onnx-node';
import winston from 'winston';
import type { STTBackendLocalConfig, VADConfig } from '../../config/config-types.js';
import type { STTModelMetadata, VADModelMetadata } from '../../utils/index.js';
import { ModelRegistry, TJBotError } from '../../utils/index.js';
import { STTEngine, STTRequestOptions } from '../stt-engine.js';

// Lazy require sherpa-onnx to avoid hard dependency issues
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let sherpa: any;

interface STTModelPaths {
    encoder: string;
    decoder?: string;
    joiner?: string;
    preprocessor?: string;
    uncachedDecoder?: string;
    cachedDecoder?: string;
    tokens: string;
}

/**
 * Sherpa-ONNX Speech-to-Text Engine
 *
 * Enhanced local speech recognition using Sherpa-ONNX library with support for:
 * - Multiple model types (Moonshine, Whisper, Zipformer, Paraformer)
 * - Streaming and offline recognition modes
 * - Voice Activity Detection (VAD) for better endpointing
 * - Automatic model download and caching
 *
 * @public
 */
export class SherpaONNXSTTEngine extends STTEngine {
    private manager: ModelRegistry = ModelRegistry.getInstance();
    private modelInfo?: STTModelMetadata;
    private modelPaths?: STTModelPaths;
    private vadPath?: string;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private recognizer?: any;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private vad: any;

    constructor(config?: STTBackendLocalConfig) {
        super(config);
    }

    async initialize(): Promise<void> {
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

            // Load STT model from registry
            const modelName = this.config.model as string;
            winston.info(`🎤 Loading STT model: ${modelName}`);
            this.modelInfo = await this.manager.loadModel<STTModelMetadata>(modelName);
            this.modelPaths = await this.ensureModelIsDownloaded();

            // Download VAD model if needed for offline recognition
            const vadConfig = this.config.vad as VADConfig;

            if (vadConfig && this.modelInfo) {
                if (this.modelInfo.type.startsWith('offline') && vadConfig.enabled) {
                    const vadModelName = vadConfig.model as string;
                    winston.info(`🎤 Loading VAD model: ${vadModelName}`);
                    const vadInfo = await this.manager.loadModel<VADModelMetadata>(vadModelName);
                    this.vadPath = path.join(vadInfo.folder, vadModelName);
                }
            }

            // Create the TTS recognizer and VAD as needed
            await this.setupRecognizer();

            winston.info('🗣️ Sherpa-ONNX STT engine initialized');
        } catch (error) {
            winston.error('Failed to initialize Sherpa-ONNX STT:', error);
            throw new TJBotError('Failed to initialize Sherpa-ONNX STT engine', { cause: error as Error });
        }
    }

    /**
     * Ensure the STT model is downloaded and return its local path.
     * @returns Path to the STT model files.
     * @throws {TJBotError} if model download fails
     */
    private async ensureModelIsDownloaded(): Promise<STTModelPaths> {
        if (!this.modelInfo) {
            throw new TJBotError('Model info not set. Ensure initialize() was called.');
        }

        try {
            // Get the full absolute path to the model cache directory
            const modelCacheDir = this.manager.getSTTModelCacheDir();
            const modelDir = path.join(modelCacheDir, this.modelInfo.folder);

            // Build model paths relative to the actual cache directory
            const paths = this.buildModelPaths(this.modelInfo.key, modelDir);
            return paths;
        } catch (error) {
            throw new TJBotError('Failed to load STT model path', { cause: error as Error });
        }
    }

    async transcribe(micStream: NodeJS.ReadableStream, options: STTRequestOptions): Promise<string> {
        if (!sherpa) {
            throw new TJBotError('Sherpa-ONNX STT service not initialized. Call initialize() first.');
        }

        if (!this.modelInfo) {
            throw new TJBotError('Model info not set. Ensure initialize() was called.');
        }

        if (!this.modelPaths) {
            throw new TJBotError('Model paths not set. Ensure initialize() was called.');
        }

        try {
            winston.debug(`🎤 Transcribing with sherpa-onnx: model=${this.config.model}`);

            this.ensureStream(micStream);
            const inputRate = (this.config.microphoneRate as number) ?? 16000;

            // Route to appropriate transcription method based on model type
            if (this.modelInfo.kind === 'streaming' || this.modelInfo.kind === 'streaming-zipformer') {
                return await this.transcribeStreaming(micStream, inputRate, options);
            } else {
                const useVad = this.shouldUseVad();
                return await this.transcribeOffline(micStream, inputRate, useVad, options);
            }
        } catch (error) {
            throw new TJBotError('Transcription failed', { cause: error as Error });
        }
    }

    /**
     * Determine if VAD should be used
     */
    private shouldUseVad(): boolean {
        if (!this.modelInfo) {
            throw new TJBotError('Model info not set. Ensure initialize() was called.');
        }

        const vadConfig = this.config.vad as VADConfig;
        const vadEnabled = vadConfig.enabled ?? true;
        const isOffline = this.modelInfo.kind.startsWith('offline');
        return isOffline && vadEnabled;
    }

    /**
     * Setup recognizer and VAD based on model configuration
     */
    private async setupRecognizer(): Promise<void> {
        if (!this.modelInfo) {
            throw new TJBotError('Model info not set. Ensure initialize() was called.');
        }

        if (!this.modelPaths) {
            throw new TJBotError('Model paths not set. Ensure initialize() was called.');
        }

        // Create recognizer once if not already created (model is constant after initialize())
        if (!this.recognizer) {
            if (this.modelInfo.kind === 'streaming') {
                this.recognizer = this.createOnlineRecognizer(this.modelPaths);
            } else if (this.modelInfo.kind === 'streaming-zipformer') {
                this.recognizer = this.createZipformerRecognizer(this.modelPaths);
            } else if (this.modelInfo.kind === 'offline-whisper') {
                this.recognizer = this.createWhisperRecognizer(this.modelPaths);
            } else {
                this.recognizer = this.createOfflineRecognizer(this.modelPaths);
            }
            winston.debug(`🗣️ Created recognizer for model: ${this.modelInfo.key} (${this.modelInfo.kind})`);
        }

        // Setup VAD if needed
        if (this.vadPath && !this.vad) {
            this.vad = this.createSileroVad(this.vadPath);
            winston.debug('🗣️ Created Silero VAD instance');
        }
    }

    /**
     * Create online recognizer for streaming Paraformer models
     */
    private createOnlineRecognizer(modelPaths: STTModelPaths): unknown {
        const config = {
            featConfig: { sampleRate: 16000, featureDim: 80 },
            modelConfig: {
                paraformer: {
                    encoder: modelPaths.encoder,
                    decoder: modelPaths.decoder,
                },
                tokens: modelPaths.tokens,
                numThreads: 2,
                provider: 'cpu',
                debug: 0,
            },
            decodingMethod: 'greedy_search',
            maxActivePaths: 4,
            enableEndpoint: true,
            rule1MinTrailingSilence: 2.4,
            rule2MinTrailingSilence: 1.2,
            rule3MinUtteranceLength: 1.2,
        };
        return new sherpa.OnlineRecognizer(config);
    }

    /**
     * Create Zipformer recognizer for streaming transducer models
     */
    private createZipformerRecognizer(modelPaths: STTModelPaths): unknown {
        const config = {
            featConfig: { sampleRate: 16000, featureDim: 80 },
            modelConfig: {
                transducer: {
                    encoder: modelPaths.encoder,
                    decoder: modelPaths.decoder,
                    joiner: modelPaths.joiner,
                },
                tokens: modelPaths.tokens,
                numThreads: 2,
                provider: 'cpu',
                debug: 0,
            },
            decodingMethod: 'greedy_search',
            maxActivePaths: 4,
            enableEndpoint: true,
            rule1MinTrailingSilence: 2.4,
            rule2MinTrailingSilence: 1.2,
            rule3MinUtteranceLength: 1.2,
        };
        return new sherpa.OnlineRecognizer(config);
    }

    /**
     * Create offline recognizer for Moonshine models
     */
    private createOfflineRecognizer(modelPaths: STTModelPaths): unknown {
        // Verify model files exist
        winston.debug('🗣️ Moonshine model paths:');
        winston.debug(
            `  preprocessor: ${modelPaths.preprocessor} (exists: ${fs.existsSync(modelPaths.preprocessor ?? '')})`
        );
        winston.debug(`  encoder: ${modelPaths.encoder} (exists: ${fs.existsSync(modelPaths.encoder)})`);
        winston.debug(
            `  uncachedDecoder: ${modelPaths.uncachedDecoder} (exists: ${fs.existsSync(modelPaths.uncachedDecoder ?? '')})`
        );
        winston.debug(
            `  cachedDecoder: ${modelPaths.cachedDecoder} (exists: ${fs.existsSync(modelPaths.cachedDecoder ?? '')})`
        );
        winston.debug(`  tokens: ${modelPaths.tokens} (exists: ${fs.existsSync(modelPaths.tokens)})`);

        const config = {
            featConfig: { sampleRate: 16000, featureDim: 80 },
            modelConfig: {
                moonshine: {
                    preprocessor: modelPaths.preprocessor,
                    encoder: modelPaths.encoder,
                    uncachedDecoder: modelPaths.uncachedDecoder,
                    cachedDecoder: modelPaths.cachedDecoder,
                },
                tokens: modelPaths.tokens,
                numThreads: 2,
                provider: 'cpu',
                debug: 0,
            },
            decodingMethod: 'greedy_search',
        };

        winston.debug('🗣️ Creating Moonshine recognizer with config:', JSON.stringify(config, null, 2));

        try {
            const recognizer = new sherpa.OfflineRecognizer(config);
            winston.debug('🗣️ Moonshine recognizer created successfully');
            return recognizer;
        } catch (error) {
            winston.error('🗣️ Failed to create Moonshine recognizer:', error);
            throw new TJBotError(`Failed to create Moonshine recognizer: ${error}`, { cause: error as Error });
        }
    }

    /**
     * Create Whisper offline recognizer
     */
    private createWhisperRecognizer(modelPaths: STTModelPaths): unknown {
        // Verify model files exist
        winston.debug('🗣️ Whisper model paths:');
        winston.debug(`  encoder: ${modelPaths.encoder} (exists: ${fs.existsSync(modelPaths.encoder)})`);
        winston.debug(`  decoder: ${modelPaths.decoder} (exists: ${fs.existsSync(modelPaths.decoder ?? '')})`);
        winston.debug(`  tokens: ${modelPaths.tokens} (exists: ${fs.existsSync(modelPaths.tokens)})`);

        const config = {
            featConfig: { sampleRate: 16000, featureDim: 80 },
            modelConfig: {
                whisper: {
                    encoder: modelPaths.encoder,
                    decoder: modelPaths.decoder,
                },
                tokens: modelPaths.tokens,
                numThreads: 2,
                provider: 'cpu',
                debug: 0,
            },
            decodingMethod: 'greedy_search',
        };

        winston.debug('🗣️ Creating Whisper recognizer with config:', JSON.stringify(config, null, 2));

        try {
            const recognizer = new sherpa.OfflineRecognizer(config);
            winston.debug('🗣️ Whisper recognizer created successfully');
            return recognizer;
        } catch (error) {
            winston.error('🗣️ Failed to create Whisper recognizer:', error);
            throw new TJBotError(`Failed to create Whisper recognizer: ${error}`, { cause: error as Error });
        }
    }

    /**
     * Create Silero VAD instance
     */
    private createSileroVad(modelPath: string): unknown {
        const config = {
            sileroVad: {
                model: modelPath,
                threshold: 0.5,
                minSpeechDuration: 0.25,
                minSilenceDuration: 0.5,
                windowSize: 512,
            },
            sampleRate: 16000,
            debug: false,
            numThreads: 1,
        };
        const bufferSizeInSeconds = 60;
        return new sherpa.Vad(config, bufferSizeInSeconds);
    }

    /**
     * Transcribe using streaming recognition
     */
    private async transcribeStreaming(
        micStream: NodeJS.ReadableStream,
        sampleRate: number,
        options: STTRequestOptions
    ): Promise<string> {
        return new Promise((resolve, reject) => {
            const stream = this.recognizer.createStream();
            let lastText = '';
            let finalText = '';

            const cleanup = () => {
                micStream.removeAllListeners();
            };

            // Handle abort signal
            if (options.abortSignal) {
                options.abortSignal.addEventListener('abort', () => {
                    cleanup();
                    resolve(finalText || lastText);
                });
            }

            micStream.on('data', (chunk: Buffer) => {
                try {
                    const samples = this.bufferToFloat32LE(chunk);
                    stream.acceptWaveform({ sampleRate, samples });

                    while (this.recognizer.isReady(stream)) {
                        this.recognizer.decode(stream);
                    }

                    const isEndpoint = this.recognizer.isEndpoint(stream);
                    let text = this.recognizer.getResult(stream).text.trim().toLowerCase();

                    if (isEndpoint) {
                        // Add tail padding for better recognition
                        const tailPadding = new Float32Array(sampleRate * 1.5);
                        stream.acceptWaveform({
                            samples: tailPadding,
                            sampleRate,
                        });

                        while (this.recognizer.isReady(stream)) {
                            this.recognizer.decode(stream);
                        }
                        text = this.recognizer.getResult(stream).text.trim().toLowerCase();
                    }

                    if (text && text !== lastText) {
                        lastText = text;

                        if (options.onPartialResult) {
                            options.onPartialResult(text);
                        }

                        if (isEndpoint) {
                            finalText = text;
                            if (options.onFinalResult) {
                                options.onFinalResult(text);
                            }
                        }
                    }

                    if (isEndpoint) {
                        this.recognizer.reset(stream);
                        cleanup();
                        resolve(finalText);
                    }
                } catch (error) {
                    cleanup();
                    reject(new TJBotError('Streaming transcription failed', { cause: error as Error }));
                }
            });

            micStream.on('end', () => {
                cleanup();
                resolve(finalText || lastText);
            });

            micStream.on('error', (error: Error) => {
                cleanup();
                reject(new TJBotError('Microphone stream error', { cause: error }));
            });
        });
    }

    /**
     * Transcribe using offline recognition with optional VAD
     */
    private async transcribeOffline(
        micStream: NodeJS.ReadableStream,
        sampleRate: number,
        useVad: boolean,
        options: STTRequestOptions
    ): Promise<string> {
        if (useVad && this.vad) {
            return await this.transcribeOfflineWithVad(micStream, sampleRate, options);
        } else {
            return await this.transcribeOfflineEnergy(micStream, sampleRate, options);
        }
    }

    /**
     * Transcribe offline with Silero VAD
     */
    private async transcribeOfflineWithVad(
        micStream: NodeJS.ReadableStream,
        sampleRate: number,
        options: STTRequestOptions
    ): Promise<string> {
        return new Promise((resolve, reject) => {
            const bufferSizeInSeconds = 30;
            const buffer = new sherpa.CircularBuffer(
                bufferSizeInSeconds * this.vad.config.sampleRate
            ) as CircularBuffer;
            const transcripts: string[] = [];

            const cleanup = () => {
                micStream.removeAllListeners();
            };

            // Handle abort signal
            if (options.abortSignal) {
                options.abortSignal.addEventListener('abort', () => {
                    cleanup();
                    resolve(transcripts.join(' '));
                });
            }

            micStream.on('data', (chunk: Buffer) => {
                try {
                    const samples = this.bufferToFloat32LE(chunk);
                    buffer.push(samples);

                    const windowSize = this.vad.config.sileroVad.windowSize;
                    while (buffer.size() > windowSize) {
                        const windowSamples = buffer.get(buffer.head(), windowSize);
                        buffer.pop(windowSize);
                        this.vad.acceptWaveform(windowSamples);
                    }

                    while (!this.vad.isEmpty()) {
                        const segment = this.vad.front();
                        this.vad.pop();

                        const stream = this.recognizer.createStream();
                        stream.acceptWaveform({
                            samples: segment.samples,
                            sampleRate,
                        });
                        this.recognizer.decode(stream);

                        const result = this.recognizer.getResult(stream);
                        const text = result.text.trim().toLowerCase();

                        if (text) {
                            transcripts.push(text);

                            if (options.onPartialResult) {
                                options.onPartialResult(text);
                            }
                        }
                    }
                } catch (error) {
                    cleanup();
                    reject(new TJBotError('Offline VAD transcription failed', { cause: error as Error }));
                }
            });

            micStream.on('end', () => {
                cleanup();
                const finalText = transcripts.join(' ');
                if (options.onFinalResult) {
                    options.onFinalResult(finalText);
                }
                resolve(finalText);
            });

            micStream.on('error', (error: Error) => {
                cleanup();
                reject(new TJBotError('Microphone stream error', { cause: error }));
            });
        });
    }

    /**
     * Transcribe offline with simple energy-based silence detection
     */
    private async transcribeOfflineEnergy(
        micStream: NodeJS.ReadableStream,
        sampleRate: number,
        options: STTRequestOptions
    ): Promise<string> {
        return new Promise((resolve, reject) => {
            const speechChunks: Float32Array[] = [];
            let silenceMs = 0;
            const silenceLimitMs = 700;
            const rmsThreshold = 1e-4;
            const transcripts: string[] = [];

            const cleanup = () => {
                micStream.removeAllListeners();
            };

            // Handle abort signal
            if (options.abortSignal) {
                options.abortSignal.addEventListener('abort', () => {
                    cleanup();
                    resolve(transcripts.join(' '));
                });
            }

            micStream.on('data', (chunk: Buffer) => {
                try {
                    const samples = this.bufferToFloat32LE(chunk);
                    const rms = this.getRMS(samples);
                    const durationMs = (samples.length / sampleRate) * 1000;

                    if (rms > rmsThreshold) {
                        speechChunks.push(samples);
                        silenceMs = 0;
                    } else {
                        silenceMs += durationMs;
                    }

                    if (speechChunks.length > 0 && silenceMs >= silenceLimitMs) {
                        // Combine speech chunks
                        const total = speechChunks.reduce((acc, arr) => acc + arr.length, 0);
                        const combined = new Float32Array(total);
                        let offset = 0;
                        for (const arr of speechChunks) {
                            combined.set(arr, offset);
                            offset += arr.length;
                        }

                        const stream = this.recognizer.createStream();
                        stream.acceptWaveform({ samples: combined, sampleRate });
                        this.recognizer.decode(stream);

                        const result = this.recognizer.getResult(stream);
                        const text = result.text.trim().toLowerCase();

                        if (text) {
                            transcripts.push(text);

                            if (options.onPartialResult) {
                                options.onPartialResult(text);
                            }
                        }

                        speechChunks.length = 0;
                        silenceMs = 0;
                    }
                } catch (error) {
                    cleanup();
                    reject(new TJBotError('Offline energy transcription failed', { cause: error as Error }));
                }
            });

            micStream.on('end', () => {
                cleanup();
                const finalText = transcripts.join(' ');
                if (options.onFinalResult) {
                    options.onFinalResult(finalText);
                }
                resolve(finalText);
            });

            micStream.on('error', (error: Error) => {
                cleanup();
                reject(new TJBotError('Microphone stream error', { cause: error }));
            });
        });
    }

    /**
     * Build model file paths based on model key
     */
    private buildModelPaths(key: string, baseDir: string): STTModelPaths {
        // Moonshine models (both tiny and base)
        if (key.startsWith('moonshine')) {
            return {
                preprocessor: path.join(baseDir, 'preprocess.onnx'),
                encoder: path.join(baseDir, 'encode.int8.onnx'),
                uncachedDecoder: path.join(baseDir, 'uncached_decode.int8.onnx'),
                cachedDecoder: path.join(baseDir, 'cached_decode.int8.onnx'),
                tokens: path.join(baseDir, 'tokens.txt'),
            };
        }

        if (key === 'whisper-tiny') {
            return {
                encoder: path.join(baseDir, 'tiny.en-encoder.int8.onnx'),
                decoder: path.join(baseDir, 'tiny.en-decoder.int8.onnx'),
                tokens: path.join(baseDir, 'tiny.en-tokens.txt'),
            };
        }

        if (key === 'whisper-base') {
            return {
                encoder: path.join(baseDir, 'base.en-encoder.int8.onnx'),
                decoder: path.join(baseDir, 'base.en-decoder.int8.onnx'),
                tokens: path.join(baseDir, 'base.en-tokens.txt'),
            };
        }

        if (key === 'zipformer-en') {
            return {
                encoder: path.join(baseDir, 'encoder-epoch-99-avg-1-chunk-16-left-128.int8.onnx'),
                decoder: path.join(baseDir, 'decoder-epoch-99-avg-1-chunk-16-left-128.onnx'),
                joiner: path.join(baseDir, 'joiner-epoch-99-avg-1-chunk-16-left-128.int8.onnx'),
                tokens: path.join(baseDir, 'tokens.txt'),
            };
        }

        // Paraformer
        return {
            encoder: path.join(baseDir, 'encoder.int8.onnx'),
            decoder: path.join(baseDir, 'decoder.int8.onnx'),
            tokens: path.join(baseDir, 'tokens.txt'),
        };
    }

    /**
     * Convert Int16 PCM buffer to Float32 samples
     */
    private bufferToFloat32LE(buf: Buffer): Float32Array {
        const len = buf.length / 2;
        const out = new Float32Array(len);
        for (let i = 0; i < len; ++i) {
            out[i] = buf.readInt16LE(i * 2) / 32768;
        }
        return out;
    }

    /**
     * Calculate RMS (Root Mean Square) of audio samples
     */
    private getRMS(samples: Float32Array): number {
        let sum = 0;
        for (let i = 0; i < samples.length; i++) {
            sum += samples[i] * samples[i];
        }
        return Math.sqrt(sum / samples.length);
    }
}
