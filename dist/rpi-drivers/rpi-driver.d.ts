/**
 * Copyright 2025 IBM Corp. All Rights Reserved.
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
import RecognizeStream from 'ibm-watson/lib/recognize-stream.js';
import { Transform } from 'stream';
import { CameraController } from '../camera/index.js';
import { ListenConfig, SeeConfig, ShineConfig, SpeakConfig, WaveConfig } from '../config/index.js';
import { MicrophoneController } from '../microphone/index.js';
import { ServoPosition } from '../servo/index.js';
import { SpeakerController } from '../speaker/index.js';
import { STTController } from '../stt/stt.js';
import { TTSController } from '../tts/tts.js';
import { Capability, Hardware } from '../utils/index.js';
import { ImageClassificationResult, ObjectDetectionResult, FaceDetectionResult, ImageDescriptionResult } from '../vision/index.js';
import { VisionController } from '../vision/vision.js';
export declare abstract class RPiHardwareDriver {
    abstract hasHardware(hardware: Hardware): boolean;
    abstract hasCapability(capability: Capability): boolean;
    abstract setupCamera(config: SeeConfig): void;
    abstract setupLEDCommonAnode(config: ShineConfig['commonanode']): void;
    abstract setupLEDNeopixel(config: ShineConfig['neopixel']): void;
    abstract setupMicrophone(config: ListenConfig): void;
    abstract setupServo(config: WaveConfig): void;
    abstract setupSpeaker(config: SpeakConfig): void;
    abstract cleanup(): Promise<void>;
    abstract initializeSTTEngine(): Promise<void>;
    abstract initializeTTSEngine(): Promise<void>;
    abstract initializeVisionEngine(): Promise<void>;
    abstract startMic(): void;
    abstract pauseMic(): void;
    abstract resumeMic(): void;
    abstract stopMic(): void;
    abstract getMicInputStream(): Transform;
    abstract connectMicStreamToSTTStream(sttStream: RecognizeStream): RecognizeStream;
    abstract listenForTranscript(options?: {
        onPartialResult?: (text: string) => void;
        onFinalResult?: (text: string) => void;
        abortSignal?: AbortSignal;
    }): Promise<string>;
    abstract capturePhoto(atPath?: string): Promise<string>;
    abstract detectObjects(image: Buffer | string): Promise<ObjectDetectionResult[]>;
    abstract classifyImage(image: Buffer | string): Promise<ImageClassificationResult[]>;
    abstract detectFaces(image: Buffer | string): Promise<FaceDetectionResult[]>;
    abstract describeImage(image: Buffer | string): Promise<ImageDescriptionResult>;
    abstract renderLED(hexColor: string): Promise<void>;
    abstract renderLEDCommonAnode(rgbColor: [number, number, number]): void;
    abstract renderLEDNeopixel(hexColor: string): Promise<void>;
    abstract playAudio(audioPath: string): Promise<void>;
    abstract speak(message: string): Promise<void>;
    abstract renderServoPosition(position: ServoPosition): void;
}
export declare abstract class RPiBaseHardwareDriver extends RPiHardwareDriver {
    initializedHardware: Set<Hardware>;
    protected cameraController?: CameraController;
    protected microphoneController?: MicrophoneController;
    protected speakerController?: SpeakerController;
    protected sttController?: STTController;
    protected ttsController?: TTSController;
    protected visionController?: VisionController;
    protected speakConfig: SpeakConfig;
    protected listenConfig: ListenConfig;
    protected seeConfig: SeeConfig;
    constructor();
    hasHardware(hardware: Hardware): boolean;
    hasCapability(capability: Capability): boolean;
    setupCamera(config: SeeConfig): void;
    setupMicrophone(config: ListenConfig): void;
    setupSpeaker(config: SpeakConfig): void;
    startMic(): void;
    pauseMic(): void;
    resumeMic(): void;
    stopMic(): void;
    getMicInputStream(): Transform;
    connectMicStreamToSTTStream(sttStream: RecognizeStream): RecognizeStream;
    listenForTranscript(options?: {
        onPartialResult?: (text: string) => void;
        onFinalResult?: (text: string) => void;
        abortSignal?: AbortSignal;
    }): Promise<string>;
    capturePhoto(atPath?: string): Promise<string>;
    detectObjects(image: Buffer | string): Promise<ObjectDetectionResult[]>;
    classifyImage(image: Buffer | string): Promise<ImageClassificationResult[]>;
    describeImage(image: Buffer | string): Promise<ImageDescriptionResult>;
    detectFaces(image: Buffer | string): Promise<FaceDetectionResult[]>;
    renderLED(hexColor: string): Promise<void>;
    playAudio(audioPath: string): Promise<void>;
    speak(message: string): Promise<void>;
    cleanup(): Promise<void>;
    initializeSTTEngine(): Promise<void>;
    initializeTTSEngine(): Promise<void>;
    initializeVisionEngine(): Promise<void>;
}
