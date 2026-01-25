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
import path from 'path';
import fs from 'fs';
import winston from 'winston';
import { STTEngine } from '../stt-engine.js';
import { TJBotError, SherpaModelManager } from '../../utils/index.js';
// Lazy require sherpa-onnx to avoid hard dependency issues
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let sherpa;
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
    constructor(config) {
        super(config);
    }
    async initialize() {
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
            // Front-load model selection and download during initialization
            const model = this.validateModel();
            const modelInfo = this.getModelInfo(model.key);
            const modelDir = await manager.ensureSTTModelDownloaded(modelInfo.key, modelInfo.url);
            this.modelKey = model.key;
            this.modelPaths = this.buildModelPaths(model.key, modelDir);
            // Download VAD model if needed for offline recognition
            const vadConfig = this.getVadConfig();
            if (modelInfo.kind.startsWith('offline') && vadConfig.enabled) {
                this.vadPath = await manager.ensureVADModelDownloaded();
            }
            winston.info('🗣️ Sherpa-ONNX STT engine initialized');
        }
        catch (error) {
            winston.error('Failed to initialize Sherpa-ONNX STT:', error);
            throw new TJBotError('Failed to initialize Sherpa-ONNX STT engine', { cause: error });
        }
    }
    async transcribe(micStream, options) {
        this.ensureStream(micStream);
        if (!sherpa) {
            throw new TJBotError('Sherpa-ONNX STT service not initialized. Call initialize() first.');
        }
        if (!this.modelKey || !this.modelPaths) {
            throw new TJBotError('Model not initialized. Ensure initialize() was called.');
        }
        const listenConfig = options.listenConfig ?? {};
        const useVad = this.shouldUseVad(listenConfig, this.modelKey);
        winston.debug(`🎤 Transcribing with sherpa-onnx: model=${this.modelKey}, vad=${useVad}`);
        // Use pre-downloaded model paths from initialize()
        await this.setupRecognizer(this.modelKey, this.modelPaths, this.vadPath);
        const inputRate = listenConfig.microphoneRate ?? 16000;
        const modelInfo = this.getModelInfo(this.modelKey);
        // Route to appropriate transcription method based on model type
        if (modelInfo.kind === 'streaming' || modelInfo.kind === 'streaming-zipformer') {
            return await this.transcribeStreaming(micStream, inputRate, options);
        }
        else {
            return await this.transcribeOffline(micStream, inputRate, useVad, options);
        }
    }
    /**
     * Validate model configuration and resolve to model key
     * Accepts either short key (e.g., 'whisper-base') or full folder name
     */
    validateModel() {
        const modelInput = this.config?.model;
        if (!modelInput) {
            throw new TJBotError('STT model not specified. Provide model in listen config.');
        }
        const manager = SherpaModelManager.getInstance();
        const metadata = manager.getSTTModelMetadata();
        // Check if it's already a valid key
        if (metadata.some((m) => m.key === modelInput)) {
            return { key: modelInput };
        }
        // Try to find by folder name
        const byFolder = metadata.find((m) => m.folder === modelInput);
        if (byFolder) {
            return { key: byFolder.key };
        }
        // Return as-is and let getModelInfo throw a proper error
        return { key: modelInput };
    }
    /**
     * Get VAD configuration from config
     */
    getVadConfig() {
        const localConfig = this.config.backend?.local;
        const vadConfig = (localConfig?.vad ?? {});
        return {
            enabled: vadConfig.enabled ?? true,
        };
    }
    /**
     * Determine if VAD should be used
     */
    shouldUseVad(listenConfig, modelKey) {
        const localConfig = (listenConfig.backend?.local ?? {});
        const vadConfig = (localConfig.vad ?? {});
        const vadEnabled = vadConfig.enabled ?? true;
        const modelInfo = this.getModelInfo(modelKey);
        const isOffline = modelInfo.kind.startsWith('offline');
        return isOffline && vadEnabled;
    }
    /**
     * Setup recognizer and VAD based on model configuration
     */
    async setupRecognizer(modelKey, modelPaths, vadPath) {
        const modelInfo = this.getModelInfo(modelKey);
        // Create recognizer once if not already created (model is constant after initialize())
        if (!this.recognizer) {
            if (modelInfo.kind === 'streaming') {
                this.recognizer = this.createOnlineRecognizer(modelPaths);
            }
            else if (modelInfo.kind === 'streaming-zipformer') {
                this.recognizer = this.createZipformerRecognizer(modelPaths);
            }
            else if (modelInfo.kind === 'offline-whisper') {
                this.recognizer = this.createWhisperRecognizer(modelPaths);
            }
            else {
                this.recognizer = this.createOfflineRecognizer(modelPaths);
            }
            winston.debug(`🗣️ Created recognizer for model: ${modelKey} (${modelInfo.kind})`);
        }
        // Setup VAD if needed
        if (vadPath && !this.vad) {
            this.vad = this.createSileroVad(vadPath);
            winston.debug('🗣️ Created Silero VAD instance');
        }
    }
    /**
     * Create online recognizer for streaming Paraformer models
     */
    createOnlineRecognizer(modelPaths) {
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
    createZipformerRecognizer(modelPaths) {
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
    createOfflineRecognizer(modelPaths) {
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
        return new sherpa.OfflineRecognizer(config);
    }
    /**
     * Create Whisper offline recognizer
     */
    createWhisperRecognizer(modelPaths) {
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
        }
        catch (error) {
            winston.error('🗣️ Failed to create Whisper recognizer:', error);
            throw new TJBotError(`Failed to create Whisper recognizer: ${error}`, { cause: error });
        }
    }
    /**
     * Create Silero VAD instance
     */
    createSileroVad(modelPath) {
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
    async transcribeStreaming(micStream, sampleRate, options) {
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
            micStream.on('data', (chunk) => {
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
                }
                catch (error) {
                    cleanup();
                    reject(new TJBotError('Streaming transcription failed', { cause: error }));
                }
            });
            micStream.on('end', () => {
                cleanup();
                resolve(finalText || lastText);
            });
            micStream.on('error', (error) => {
                cleanup();
                reject(new TJBotError('Microphone stream error', { cause: error }));
            });
        });
    }
    /**
     * Transcribe using offline recognition with optional VAD
     */
    async transcribeOffline(micStream, sampleRate, useVad, options) {
        if (useVad && this.vad) {
            return await this.transcribeOfflineWithVad(micStream, sampleRate, options);
        }
        else {
            return await this.transcribeOfflineEnergy(micStream, sampleRate, options);
        }
    }
    /**
     * Transcribe offline with Silero VAD
     */
    async transcribeOfflineWithVad(micStream, sampleRate, options) {
        return new Promise((resolve, reject) => {
            const bufferSizeInSeconds = 30;
            const buffer = new sherpa.CircularBuffer(bufferSizeInSeconds * this.vad.config.sampleRate);
            const transcripts = [];
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
            micStream.on('data', (chunk) => {
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
                }
                catch (error) {
                    cleanup();
                    reject(new TJBotError('Offline VAD transcription failed', { cause: error }));
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
            micStream.on('error', (error) => {
                cleanup();
                reject(new TJBotError('Microphone stream error', { cause: error }));
            });
        });
    }
    /**
     * Transcribe offline with simple energy-based silence detection
     */
    async transcribeOfflineEnergy(micStream, sampleRate, options) {
        return new Promise((resolve, reject) => {
            const speechChunks = [];
            let silenceMs = 0;
            const silenceLimitMs = 700;
            const rmsThreshold = 1e-4;
            const transcripts = [];
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
            micStream.on('data', (chunk) => {
                try {
                    const samples = this.bufferToFloat32LE(chunk);
                    const rms = this.getRMS(samples);
                    const durationMs = (samples.length / sampleRate) * 1000;
                    if (rms > rmsThreshold) {
                        speechChunks.push(samples);
                        silenceMs = 0;
                    }
                    else {
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
                }
                catch (error) {
                    cleanup();
                    reject(new TJBotError('Offline energy transcription failed', { cause: error }));
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
            micStream.on('error', (error) => {
                cleanup();
                reject(new TJBotError('Microphone stream error', { cause: error }));
            });
        });
    }
    /**
     * Get model info by key
     */
    getModelInfo(key) {
        const manager = SherpaModelManager.getInstance();
        const metadata = manager.getSTTModelMetadata();
        const info = metadata.find((m) => m.key === key);
        if (!info) {
            throw new TJBotError(`Unknown model key: ${key}`);
        }
        return info;
    }
    /**
     * Build model file paths based on model key
     */
    buildModelPaths(key, baseDir) {
        if (key === 'moonshine' || key === 'moonshine-base') {
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
    bufferToFloat32LE(buf) {
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
    getRMS(samples) {
        let sum = 0;
        for (let i = 0; i < samples.length; i++) {
            sum += samples[i] * samples[i];
        }
        return Math.sqrt(sum / samples.length);
    }
}
//# sourceMappingURL=sherpa-onnx.js.map