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
import winston from 'winston';
import { ModelRegistry, TJBotError } from '../../utils/index.js';
import { LogEmoji } from '../../utils/logging.js';
import { STTEngine } from '../stt-engine.js';
const EMO = LogEmoji.STT;
// Lazy require sherpa-onnx to avoid hard dependency issues
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
    registry = ModelRegistry.getInstance();
    modelInfo;
    modelPaths;
    vadPath;
    vad;
    recognizer;
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
        // Load STT model from registry
        const modelName = config.model;
        winston.info(`${EMO} Loading STT model: ${modelName}`);
        this.modelInfo = await this.registry.loadModel(modelName);
        const modelCacheDir = this.registry.getModelCacheDirForType('stt');
        const modelDir = path.join(modelCacheDir, this.modelInfo.folder);
        this.modelPaths = this.pathsForModelKey(this.modelInfo.key, modelDir);
        // Download VAD model if needed for offline recognition
        const vadConfig = this.config.vad;
        if (vadConfig && this.modelInfo) {
            if (this.modelInfo.kind.startsWith('offline') && vadConfig.enabled) {
                const vadModelName = vadConfig.model;
                winston.info(`${EMO} Loading VAD model: ${vadModelName}`);
                const vadInfo = await this.registry.loadModel(vadModelName);
                const vadCacheDir = this.registry.getModelCacheDirForType('vad');
                this.vadPath = path.join(vadCacheDir, vadInfo.folder, vadInfo.required[0]);
            }
        }
        // Create the STT recognizer and VAD as needed
        await this.setupRecognizer();
        winston.info(`${EMO} Sherpa-ONNX STT engine initialized`);
    }
    async transcribe(micStream, options) {
        if (!sherpa || !this.recognizer) {
            throw new TJBotError('Sherpa-ONNX STT service not initialized. Call initialize() first.');
        }
        if (!this.modelInfo) {
            throw new TJBotError('Model info not set. Ensure initialize() was called.');
        }
        try {
            this.ensureStream(micStream);
            const inputRate = this.config.microphoneRate ?? 16000;
            // Route to appropriate transcription method based on model type
            if (this.modelInfo.kind === 'streaming' || this.modelInfo.kind === 'streaming-zipformer') {
                return await this.transcribeStreaming(micStream, inputRate, options);
            }
            else {
                const useVad = this.shouldUseVad();
                return await this.transcribeOffline(micStream, inputRate, useVad, options);
            }
        }
        catch (error) {
            throw new TJBotError('Transcription failed', { cause: error });
        }
    }
    /**
     * Determine if VAD should be used
     */
    shouldUseVad() {
        if (!this.modelInfo) {
            throw new TJBotError('Model info not set. Ensure initialize() was called.');
        }
        const vadConfig = this.config.vad;
        const vadEnabled = vadConfig.enabled ?? true;
        const isOffline = this.modelInfo.kind.startsWith('offline');
        return isOffline && vadEnabled;
    }
    /**
     * Setup recognizer and VAD based on model configuration
     */
    async setupRecognizer() {
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
            }
            else if (this.modelInfo.kind === 'streaming-zipformer') {
                this.recognizer = this.createZipformerRecognizer(this.modelPaths);
            }
            else if (this.modelInfo.kind === 'offline-whisper') {
                this.recognizer = this.createWhisperRecognizer(this.modelPaths);
            }
            else {
                this.recognizer = this.createOfflineRecognizer(this.modelPaths);
            }
            winston.debug(`${EMO} created recognizer for model: ${this.modelInfo.key} (${this.modelInfo.kind})`);
        }
        // Setup VAD if needed
        if (this.vadPath && !this.vad) {
            this.vad = this.createSileroVad(this.vadPath);
            winston.debug(`${EMO} created Silero VAD instance`);
        }
    }
    /**
     * Get the paths for all of the model files for a given model key.
     * @param key The model key (e.g. "moonshine-tiny", "whisper-tiny", "zipformer-en", "paraformer-en")
     * @param baseDir The folder in which the model exists.
     * @returns An STTModelPaths object containing the paths to the model files.
     */
    pathsForModelKey(key, baseDir) {
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
        if (key === 'paraformer-en') {
            return {
                encoder: path.join(baseDir, 'encoder.int8.onnx'),
                decoder: path.join(baseDir, 'decoder.int8.onnx'),
                tokens: path.join(baseDir, 'tokens.txt'),
            };
        }
        throw new TJBotError(`Unsupported model key: ${key}`);
    }
    /**
     * Extract and validate required paths for Paraformer online recognizer.
     * @throws {TJBotError} if required paths are missing
     */
    validateParaformerPaths(modelPaths) {
        if (!modelPaths.decoder) {
            throw new TJBotError('Paraformer model requires decoder path');
        }
        return {
            encoder: modelPaths.encoder,
            decoder: modelPaths.decoder,
        };
    }
    /**
     * Extract and validate required paths for Zipformer online recognizer.
     * @throws {TJBotError} if required paths are missing
     */
    validateZipformerPaths(modelPaths) {
        if (!modelPaths.decoder) {
            throw new TJBotError('Zipformer model requires decoder path');
        }
        if (!modelPaths.joiner) {
            throw new TJBotError('Zipformer model requires joiner path');
        }
        return {
            encoder: modelPaths.encoder,
            decoder: modelPaths.decoder,
            joiner: modelPaths.joiner,
        };
    }
    /**
     * Extract and validate required paths for Moonshine offline recognizer.
     * @throws {TJBotError} if required paths are missing
     */
    validateMoonshinePaths(modelPaths) {
        if (!modelPaths.preprocessor) {
            throw new TJBotError('Moonshine model requires preprocessor path');
        }
        if (!modelPaths.uncachedDecoder) {
            throw new TJBotError('Moonshine model requires uncachedDecoder path');
        }
        if (!modelPaths.cachedDecoder) {
            throw new TJBotError('Moonshine model requires cachedDecoder path');
        }
        return {
            preprocessor: modelPaths.preprocessor,
            encoder: modelPaths.encoder,
            uncachedDecoder: modelPaths.uncachedDecoder,
            cachedDecoder: modelPaths.cachedDecoder,
        };
    }
    /**
     * Extract and validate required paths for Whisper offline recognizer.
     * @throws {TJBotError} if required paths are missing
     */
    validateWhisperPaths(modelPaths) {
        if (!modelPaths.decoder) {
            throw new TJBotError('Whisper model requires decoder path');
        }
        return {
            encoder: modelPaths.encoder,
            decoder: modelPaths.decoder,
        };
    }
    /**
     * Create online recognizer for streaming Paraformer models
     */
    createOnlineRecognizer(modelPaths) {
        if (!sherpa) {
            throw new TJBotError('Sherpa-ONNX not initialized');
        }
        const paths = this.validateParaformerPaths(modelPaths);
        const config = {
            featConfig: { sampleRate: 16000, featureDim: 80 },
            modelConfig: {
                paraformer: {
                    encoder: paths.encoder,
                    decoder: paths.decoder,
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
        if (!sherpa) {
            throw new TJBotError('Sherpa-ONNX not initialized');
        }
        const paths = this.validateZipformerPaths(modelPaths);
        const config = {
            featConfig: { sampleRate: 16000, featureDim: 80 },
            modelConfig: {
                transducer: {
                    encoder: paths.encoder,
                    decoder: paths.decoder,
                    joiner: paths.joiner,
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
        if (!sherpa) {
            throw new TJBotError('Sherpa-ONNX not initialized');
        }
        // Verify model files exist
        const paths = this.validateMoonshinePaths(modelPaths);
        const config = {
            featConfig: { sampleRate: 16000, featureDim: 80 },
            modelConfig: {
                moonshine: {
                    preprocessor: paths.preprocessor,
                    encoder: paths.encoder,
                    uncachedDecoder: paths.uncachedDecoder,
                    cachedDecoder: paths.cachedDecoder,
                },
                tokens: modelPaths.tokens,
                numThreads: 2,
                provider: 'cpu',
                debug: 0,
            },
            decodingMethod: 'greedy_search',
        };
        winston.debug(`${EMO} creating Moonshine recognizer with config:`, JSON.stringify(config, null, 2));
        try {
            const recognizer = new sherpa.OfflineRecognizer(config);
            return recognizer;
        }
        catch (error) {
            winston.error(`${EMO} Failed to create Moonshine recognizer:`, error);
            throw new TJBotError(`Failed to create Moonshine recognizer: ${error}`, { cause: error });
        }
    }
    /**
     * Create Whisper offline recognizer
     */
    createWhisperRecognizer(modelPaths) {
        if (!sherpa) {
            throw new TJBotError('Sherpa-ONNX not initialized');
        }
        // Verify model files exist
        const paths = this.validateWhisperPaths(modelPaths);
        const config = {
            featConfig: { sampleRate: 16000, featureDim: 80 },
            modelConfig: {
                whisper: {
                    encoder: paths.encoder,
                    decoder: paths.decoder,
                },
                tokens: modelPaths.tokens,
                numThreads: 2,
                provider: 'cpu',
                debug: 0,
            },
            decodingMethod: 'greedy_search',
        };
        winston.debug(`${EMO} creating Whisper recognizer with config:`, JSON.stringify(config, null, 2));
        try {
            const recognizer = new sherpa.OfflineRecognizer(config);
            winston.debug(`${EMO} Whisper recognizer created successfully`);
            return recognizer;
        }
        catch (error) {
            winston.error(`${EMO} Failed to create Whisper recognizer:`, error);
            throw new TJBotError(`Failed to create Whisper recognizer: ${error}`, { cause: error });
        }
    }
    /**
     * Create Silero VAD instance
     */
    createSileroVad(modelPath) {
        if (!sherpa) {
            throw new TJBotError('Sherpa-ONNX not initialized');
        }
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
        winston.debug(`${EMO} creating Silero VAD with config:`, JSON.stringify(config, null, 2));
        return new sherpa.Vad(config, bufferSizeInSeconds);
    }
    /**
     * Transcribe using streaming recognition
     */
    async transcribeStreaming(micStream, sampleRate, options) {
        if (!this.recognizer) {
            throw new TJBotError('Recognizer not initialized. Ensure initialize() was called.');
        }
        return new Promise((resolve, reject) => {
            // For streaming (online) recognizers, narrow type to OnlineRecognizer
            const recognizer = this.recognizer;
            const stream = recognizer.createStream();
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
                    while (recognizer.isReady(stream)) {
                        recognizer.decode(stream);
                    }
                    const isEndpoint = recognizer.isEndpoint(stream);
                    let text = recognizer.getResult(stream).text.trim().toLowerCase();
                    if (isEndpoint) {
                        // Add tail padding for better recognition
                        const tailPadding = new Float32Array(sampleRate * 1.5);
                        stream.acceptWaveform({
                            samples: tailPadding,
                            sampleRate,
                        });
                        while (recognizer.isReady(stream)) {
                            recognizer.decode(stream);
                        }
                        text = recognizer.getResult(stream).text.trim().toLowerCase();
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
                        recognizer.reset(stream);
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
        if (useVad && this.vadPath) {
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
        if (!this.recognizer) {
            throw new TJBotError('Recognizer not initialized');
        }
        if (!this.vadPath) {
            throw new TJBotError('VAD model path not initialized');
        }
        if (!sherpa) {
            throw new TJBotError('Sherpa-ONNX not initialized');
        }
        // Narrow types for use in Promise callbacks
        const recognizer = this.recognizer;
        const vad = this.createSileroVad(this.vadPath);
        const module = sherpa;
        return new Promise((resolve, reject) => {
            const bufferSizeInSeconds = 30;
            const buffer = new module.CircularBuffer(bufferSizeInSeconds * vad.config.sampleRate);
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
                    const windowSize = vad.config.sileroVad.windowSize;
                    while (buffer.size() > windowSize) {
                        const windowSamples = buffer.get(buffer.head(), windowSize);
                        buffer.pop(windowSize);
                        vad.acceptWaveform(windowSamples);
                    }
                    while (!vad.isEmpty()) {
                        const segment = vad.front();
                        vad.pop();
                        const stream = recognizer.createStream();
                        stream.acceptWaveform({
                            samples: segment.samples,
                            sampleRate,
                        });
                        recognizer.decode(stream);
                        const result = recognizer.getResult(stream);
                        const text = result.text.trim().toLowerCase();
                        if (text) {
                            transcripts.push(text);
                            if (options.onPartialResult) {
                                options.onPartialResult(text);
                            }
                            // Resolve after first complete utterance (single-shot behavior)
                            cleanup();
                            if (options.onFinalResult) {
                                options.onFinalResult(text);
                            }
                            resolve(text);
                            return;
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
        if (!this.recognizer) {
            throw new TJBotError('Recognizer not initialized');
        }
        return new Promise((resolve, reject) => {
            // Narrow recognizer to OfflineRecognizer for offline methods
            const recognizer = this.recognizer;
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
                        const stream = recognizer.createStream();
                        stream.acceptWaveform({ samples: combined, sampleRate });
                        recognizer.decode(stream);
                        const result = recognizer.getResult(stream);
                        const text = result.text.trim().toLowerCase();
                        if (text) {
                            transcripts.push(text);
                            if (options.onPartialResult) {
                                options.onPartialResult(text);
                            }
                            // Resolve after first complete utterance (single-shot behavior)
                            cleanup();
                            if (options.onFinalResult) {
                                options.onFinalResult(text);
                            }
                            resolve(text);
                            return;
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
//# sourceMappingURL=sherpa-onnx-stt.js.map