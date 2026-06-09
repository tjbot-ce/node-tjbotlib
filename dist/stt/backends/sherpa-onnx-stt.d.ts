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
import { STTEngine, STTRequestOptions } from '../stt-engine.js';
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
export declare class SherpaONNXSTTEngine extends STTEngine {
    private registry;
    private modelInfo?;
    private modelPaths?;
    private vadPath?;
    private vad?;
    private recognizer?;
    initialize(): Promise<void>;
    transcribe(micStream: NodeJS.ReadableStream, options: STTRequestOptions): Promise<string>;
    /**
     * Determine if VAD should be used
     */
    private shouldUseVad;
    /**
     * Setup recognizer and VAD based on model configuration
     */
    private setupRecognizer;
    /**
     * Get the paths for all of the model files for a given model key.
     * @param key The model key (e.g. "moonshine-tiny", "whisper-tiny", "zipformer-en", "paraformer-en")
     * @param baseDir The folder in which the model exists.
     * @returns An STTModelPaths object containing the paths to the model files.
     */
    private pathsForModelKey;
    /**
     * Extract and validate required paths for Paraformer online recognizer.
     * @throws {TJBotError} if required paths are missing
     */
    private validateParaformerPaths;
    /**
     * Extract and validate required paths for Zipformer online recognizer.
     * @throws {TJBotError} if required paths are missing
     */
    private validateZipformerPaths;
    /**
     * Extract and validate required paths for Moonshine offline recognizer.
     * @throws {TJBotError} if required paths are missing
     */
    private validateMoonshinePaths;
    /**
     * Extract and validate required paths for Whisper offline recognizer.
     * @throws {TJBotError} if required paths are missing
     */
    private validateWhisperPaths;
    /**
     * Create online recognizer for streaming Paraformer models
     */
    private createOnlineRecognizer;
    /**
     * Create Zipformer recognizer for streaming transducer models
     */
    private createZipformerRecognizer;
    /**
     * Create offline recognizer for Moonshine models
     */
    private createOfflineRecognizer;
    /**
     * Create Whisper offline recognizer
     */
    private createWhisperRecognizer;
    /**
     * Create Silero VAD instance
     */
    private createSileroVad;
    /**
     * Transcribe using streaming recognition
     */
    private transcribeStreaming;
    /**
     * Transcribe using offline recognition with optional VAD
     */
    private transcribeOffline;
    /**
     * Transcribe offline with Silero VAD
     */
    private transcribeOfflineWithVad;
    /**
     * Transcribe offline with simple energy-based silence detection
     */
    private transcribeOfflineEnergy;
    /**
     * Convert Int16 PCM buffer to Float32 samples
     */
    private bufferToFloat32LE;
    /**
     * Calculate RMS (Root Mean Square) of audio samples
     */
    private getRMS;
}
//# sourceMappingURL=sherpa-onnx-stt.d.ts.map