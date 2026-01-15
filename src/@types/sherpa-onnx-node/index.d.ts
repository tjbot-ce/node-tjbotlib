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

declare module 'sherpa-onnx-node' {
    export interface FeatConfig {
        sampleRate: number;
        featureDim: number;
    }

    export interface ParaformerModelConfig {
        encoder: string;
        decoder: string;
    }

    export interface TransducerModelConfig {
        encoder: string;
        decoder: string;
        joiner: string;
    }

    export interface MoonshineModelConfig {
        preprocessor: string;
        encoder: string;
        uncachedDecoder: string;
        cachedDecoder: string;
    }

    export interface WhisperModelConfig {
        encoder: string;
        decoder: string;
    }

    export interface ModelConfig {
        paraformer?: ParaformerModelConfig;
        transducer?: TransducerModelConfig;
        moonshine?: MoonshineModelConfig;
        whisper?: WhisperModelConfig;
        tokens: string;
        numThreads: number;
        provider: string;
        debug: number;
    }

    export interface OnlineRecognizerConfig {
        featConfig: FeatConfig;
        modelConfig: ModelConfig;
        decodingMethod: string;
        maxActivePaths: number;
        enableEndpoint: boolean;
        rule1MinTrailingSilence: number;
        rule2MinTrailingSilence: number;
        rule3MinUtteranceLength: number;
    }

    export interface OfflineRecognizerConfig {
        featConfig: FeatConfig;
        modelConfig: ModelConfig;
        decodingMethod: string;
    }

    export interface RecognitionResult {
        text: string;
    }

    export interface OnlineStream {
        acceptWaveform(input: { sampleRate: number; samples: Float32Array }): void;
    }

    export interface OfflineStream {
        acceptWaveform(input: { sampleRate: number; samples: Float32Array }): void;
    }

    export class OnlineRecognizer {
        constructor(config: OnlineRecognizerConfig);
        config: OnlineRecognizerConfig;
        createStream(): OnlineStream;
        isReady(stream: OnlineStream): boolean;
        decode(stream: OnlineStream): void;
        getResult(stream: OnlineStream): RecognitionResult;
        isEndpoint(stream: OnlineStream): boolean;
        reset(stream: OnlineStream): void;
    }

    export class OfflineRecognizer {
        constructor(config: OfflineRecognizerConfig);
        config: OfflineRecognizerConfig;
        createStream(): OfflineStream;
        decode(stream: OfflineStream): void;
        getResult(stream: OfflineStream): RecognitionResult;
    }

    export interface SileroVadConfig {
        model: string;
        threshold: number;
        minSpeechDuration: number;
        minSilenceDuration: number;
        windowSize: number;
    }

    export interface VadConfig {
        sileroVad: SileroVadConfig;
        sampleRate: number;
        debug: boolean;
        numThreads: number;
    }

    export interface VadSegment {
        samples: Float32Array;
        start: number;
    }

    export class Vad {
        constructor(config: VadConfig, bufferSizeInSeconds: number);
        config: VadConfig;
        acceptWaveform(samples: Float32Array): void;
        isEmpty(): boolean;
        front(): VadSegment;
        pop(): void;
    }

    export class CircularBuffer {
        constructor(capacity: number);
        push(samples: Float32Array): void;
        size(): number;
        get(start: number, length: number): Float32Array;
        pop(length: number): void;
        head(): number;
    }

    export interface OfflineTtsConfig {
        model: {
            vits: {
                model: string;
                lexicon?: string;
                tokens?: string;
            };
            numThreads: number;
            debug: number;
            provider: string;
        };
        maxNumSentences?: number;
        ruleFsts?: string;
        ruleFars?: string;
    }

    export class OfflineTts {
        constructor(config: OfflineTtsConfig);
        generate(
            text: string,
            sid?: number,
            speed?: number
        ): {
            samples: Float32Array;
            sampleRate: number;
        };
    }

    export function readWave(filename: string): {
        samples: Float32Array;
        sampleRate: number;
    };

    export function writeWave(filename: string, samples: Float32Array, sampleRate: number): void;

    export class Display {
        constructor(maxWordPerLine: number);
        print(idx: number, text: string): void;
    }

    export interface SpokenLanguageIdentificationConfig {
        whisper: {
            encoder: string;
            decoder: string;
        };
        numThreads: number;
        debug: number;
        provider: string;
    }

    export class SpokenLanguageIdentification {
        constructor(config: SpokenLanguageIdentificationConfig);
        createStream(): unknown;
        compute(stream: unknown): string;
    }

    export interface SpeakerEmbeddingExtractorConfig {
        model: string;
        numThreads: number;
        debug: number;
        provider: string;
    }

    export class SpeakerEmbeddingExtractor {
        constructor(config: SpeakerEmbeddingExtractorConfig);
        createStream(): unknown;
        compute(stream: unknown): Float32Array;
        dim(): number;
    }

    export class SpeakerEmbeddingManager {
        constructor(dim: number);
        add(name: string, embedding: Float32Array): boolean;
        remove(name: string): boolean;
        search(embedding: Float32Array, threshold: number): string;
        verify(name: string, embedding: Float32Array, threshold: number): boolean;
        contains(name: string): boolean;
        getAllSpeakers(): string[];
        numSpeakers(): number;
    }

    export interface AudioTaggingConfig {
        model: {
            ced: string;
        };
        numThreads: number;
        debug: number;
        provider: string;
        labels: string;
    }

    export class AudioTagging {
        constructor(config: AudioTaggingConfig);
        createStream(): unknown;
        compute(stream: unknown, topK: number): Array<{ name: string; prob: number }>;
    }

    export interface OfflinePunctuationConfig {
        model: {
            ctTransformer: string;
        };
        numThreads: number;
        debug: number;
        provider: string;
    }

    export class OfflinePunctuation {
        constructor(config: OfflinePunctuationConfig);
        addPunct(text: string): string;
    }

    export interface OnlinePunctuationConfig {
        model: {
            ctTransformer: string;
        };
        numThreads: number;
        debug: number;
        provider: string;
    }

    export class OnlinePunctuation {
        constructor(config: OnlinePunctuationConfig);
        createStream(): unknown;
        addPunct(stream: unknown, text: string): string;
    }

    export interface KeywordSpotterConfig {
        featConfig: FeatConfig;
        modelConfig: {
            transducer: TransducerModelConfig;
            tokens: string;
            numThreads: number;
            provider: string;
            debug: number;
        };
        maxActivePaths: number;
        keywords: string;
    }

    export class KeywordSpotter {
        constructor(config: KeywordSpotterConfig);
        createStream(): unknown;
        isReady(stream: unknown): boolean;
        decode(stream: unknown): void;
        getResult(stream: unknown): { keyword: string };
    }

    export interface OfflineSpeakerDiarizationConfig {
        segmentation: {
            pyannote: {
                model: string;
            };
        };
        embedding: {
            model: string;
        };
        clustering: {
            numClusters: number;
            threshold: number;
        };
        minDurationOn: number;
        minDurationOff: number;
        numThreads: number;
        debug: number;
        provider: string;
    }

    export class OfflineSpeakerDiarization {
        constructor(config: OfflineSpeakerDiarizationConfig);
        process(
            samples: Float32Array,
            sampleRate: number
        ): Array<{
            start: number;
            end: number;
            speaker: number;
        }>;
    }

    export interface OfflineSpeechDenoiserConfig {
        model: string;
        numThreads: number;
        debug: number;
        provider: string;
    }

    export class OfflineSpeechDenoiser {
        constructor(config: OfflineSpeechDenoiserConfig);
        process(samples: Float32Array, sampleRate: number): Float32Array;
    }

    export const version: string;
    export const gitSha1: string;
    export const gitDate: string;
}
