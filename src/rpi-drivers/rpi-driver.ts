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

import { Transform } from 'stream';
import { CameraController } from '../camera/index.js';
import { ListenConfig, SeeConfig, ShineConfig, SpeakConfig, WaveConfig } from '../config/index.js';
import { MicrophoneController } from '../microphone/index.js';
import { ServoPosition } from '../servo/index.js';
import { SpeakerController } from '../speaker/index.js';
import { STTController } from '../stt/stt.js';
import { TTSController } from '../tts/tts.js';
import { Capability, convertHexToRgbColor, Hardware, isCommandAvailable, TJBotError } from '../utils/index.js';
import {
    FaceDetectionMetadata,
    ImageClassificationResult,
    ImageDescriptionResult,
    ObjectDetectionResult,
} from '../vision/index.js';
import { VisionController } from '../vision/vision.js';

export abstract class RPiHardwareDriver {
    // capability checks
    abstract getHardware(): Set<Hardware>;
    abstract hasHardware(hardware: Hardware): boolean;
    abstract hasCapability(capability: Capability): boolean;

    // hardware setup & cleanup
    abstract setupCamera(config: SeeConfig): void;
    abstract setupLED(config: ShineConfig): Promise<void>;
    abstract setupLEDCommonAnode(config: ShineConfig['commonanode']): void;
    abstract setupLEDNeopixel(config: ShineConfig['neopixel']): Promise<void>;
    abstract setupMicrophone(config: ListenConfig): void;
    abstract setupServo(config: WaveConfig): void;
    abstract setupSpeaker(config: SpeakConfig): void;
    abstract cleanup(): Promise<void>;

    // AI engines
    abstract initializeSTTEngine(): Promise<void>;
    abstract initializeTTSEngine(): Promise<void>;
    abstract initializeVisionEngine(): Promise<void>;

    // LISTEN
    abstract startMic(): void;
    abstract pauseMic(): void;
    abstract resumeMic(): void;
    abstract stopMic(): void;
    abstract getMicInputStream(): Transform;
    abstract listenForTranscript(options?: {
        onPartialResult?: (text: string) => void;
        onFinalResult?: (text: string) => void;
        abortSignal?: AbortSignal;
    }): Promise<string>;

    // SEE
    abstract capturePhoto(atPath?: string): Promise<string>;
    abstract capturePhotoBuffer(): Promise<Buffer>;
    abstract detectObjects(image: Buffer | string): Promise<ObjectDetectionResult[]>;
    abstract classifyImage(image: Buffer | string): Promise<ImageClassificationResult[]>;
    abstract detectFaces(
        image: Buffer | string
    ): Promise<{ isFaceDetected: boolean; metadata: FaceDetectionMetadata[] }>;
    abstract describeImage(image: Buffer | string): Promise<ImageDescriptionResult>;

    // SHINE
    abstract renderLED(hexColor: string): Promise<void>;
    abstract renderLEDCommonAnode(rgbColor: [number, number, number]): void;
    abstract renderLEDNeopixel(hexColor: string): Promise<void>;

    // SPEAK
    abstract playAudio(audioPath: string): Promise<void>;
    abstract speak(message: string): Promise<void>;

    // WAVE
    abstract renderServoPosition(position: ServoPosition): void;
}

export abstract class RPiBaseHardwareDriver extends RPiHardwareDriver {
    // initialized hardware
    initializedHardware: Set<Hardware>;

    // controllers for hardware components
    protected cameraController?: CameraController;
    protected microphoneController?: MicrophoneController;
    protected speakerController?: SpeakerController;

    // controllers for STT, TTS, CV
    protected sttController?: STTController;
    protected ttsController?: TTSController;
    protected visionController?: VisionController;

    // cached configuration for listen
    protected listenConfig: ListenConfig = {};
    // cached configuration for shine
    protected shineConfig: ShineConfig = {};
    // cached configuration for see
    protected seeConfig: SeeConfig = {};
    // cached configuration for speak
    protected speakConfig: SpeakConfig = {};

    constructor() {
        super();
        this.initializedHardware = new Set();
    }

    getHardware(): Set<Hardware> {
        return new Set(this.initializedHardware);
    }

    hasHardware(hardware: Hardware): boolean {
        return this.initializedHardware.has(hardware);
    }

    hasCapability(capability: Capability): boolean {
        switch (capability) {
            case Capability.LISTEN:
                return this.hasHardware(Hardware.MICROPHONE);
            case Capability.SEE:
                return this.hasHardware(Hardware.CAMERA);
            case Capability.SHINE:
                return this.hasHardware(Hardware.LED);
            case Capability.SPEAK:
                return this.hasHardware(Hardware.SPEAKER);
            case Capability.WAVE:
                return this.hasHardware(Hardware.SERVO);
            default:
                return false;
        }
    }

    setupCamera(config: SeeConfig): void {
        this.cameraController = new CameraController();
        this.seeConfig = config;
        const width = config.cameraResolution?.[0] ?? 1920;
        const height = config.cameraResolution?.[1] ?? 1080;
        const verticalFlip = config.verticalFlip ?? false;
        const horizontalFlip = config.horizontalFlip ?? false;
        const captureTimeout = config.captureTimeout ?? 500;
        const zeroShutterLag = config.zeroShutterLag ?? false;
        this.cameraController.initialize([width, height], verticalFlip, horizontalFlip, captureTimeout, zeroShutterLag);
        this.initializedHardware.add(Hardware.CAMERA);
    }

    async setupLED(config: ShineConfig): Promise<void> {
        this.shineConfig = config;

        if (config.hasCommonAnodeLED) {
            this.setupLEDCommonAnode(config.commonanode ?? {});
        }
        if (config.hasNeopixelLED) {
            await this.setupLEDNeopixel(config.neopixel ?? {});
        }
    }

    setupMicrophone(config: ListenConfig) {
        this.microphoneController = new MicrophoneController();
        this.listenConfig = config;
        const rate = config.microphoneRate ?? 44100;
        const channels = config.microphoneChannels ?? 2;
        const device = config.device ?? '';
        this.microphoneController.initialize(rate, channels, device);
        this.initializedHardware.add(Hardware.MICROPHONE);
    }

    setupSpeaker(config: SpeakConfig): void {
        this.speakerController = new SpeakerController();
        // Validate that aplay is available
        if (!isCommandAvailable('aplay')) {
            throw new TJBotError(
                'TJBot requires the aplay command for audio playback. ' +
                    'Install it with: sudo apt-get install alsa-utils'
            );
        }

        const device = config.device ?? '';
        // Cache the full config for later use in speak()
        this.speakConfig = config;
        this.speakerController.initialize(device);
        this.speakerController.setAudioLifecycleCallbacks(
            () => this.pauseMic(),
            () => this.resumeMic()
        );
        this.initializedHardware.add(Hardware.SPEAKER);
    }

    async cleanup(): Promise<void> {
        // Clean up controllers
        if (this.cameraController) {
            await this.cameraController.cleanup?.();
        }

        if (this.microphoneController) {
            await this.microphoneController.cleanup?.();
        }

        if (this.speakerController) {
            await this.speakerController.cleanup?.();
        }

        if (this.sttController) {
            await this.sttController.cleanup?.();
        }

        if (this.ttsController) {
            await this.ttsController.cleanup?.();
        }

        if (this.visionController) {
            await this.visionController.cleanup?.();
        }

        // Clear hardware state
        this.initializedHardware.clear();
        this.cameraController = undefined;
        this.microphoneController = undefined;
        this.speakerController = undefined;
        this.sttController = undefined;
        this.ttsController = undefined;
        this.visionController = undefined;
    }

    async initializeSTTEngine(): Promise<void> {
        if (this.microphoneController === undefined) {
            throw new TJBotError(
                'Microphone controllernot initialized. Make sure to call setupMicrophone() before initializing the STT engine.'
            );
        }

        this.sttController = new STTController(this.microphoneController);
        await this.sttController.initialize(this.listenConfig);
    }

    async initializeTTSEngine(): Promise<void> {
        if (this.speakerController === undefined) {
            throw new TJBotError(
                'Speaker controllernot initialized. Make sure to call setupSpeaker() before initializing the TTS engine.'
            );
        }
        this.ttsController = new TTSController(this.speakerController);
        await this.ttsController.initialize(this.speakConfig);
    }

    async initializeVisionEngine(): Promise<void> {
        this.visionController = new VisionController();
        await this.visionController.initialize(this.seeConfig);
    }

    startMic(): void {
        if (this.microphoneController === undefined) {
            throw new TJBotError(
                'Microphone controllernot initialized. Make sure to call setupMicrophone() before using the microphone.'
            );
        }
        this.microphoneController.start();
    }

    pauseMic(): void {
        if (this.microphoneController === undefined) {
            return;
        }
        this.microphoneController.pause();
    }

    resumeMic(): void {
        if (this.microphoneController === undefined) {
            return;
        }
        this.microphoneController.resume();
    }

    stopMic(): void {
        if (this.microphoneController === undefined) {
            throw new TJBotError(
                'Microphone controllernot initialized. Make sure to call setupMicrophone() before using the microphone.'
            );
        }
        this.microphoneController.stop();
    }

    getMicInputStream(): Transform {
        if (this.microphoneController === undefined) {
            throw new TJBotError(
                'Microphone controller not initialized. Make sure to call setupMicrophone() before using the microphone.'
            );
        }
        return this.microphoneController.getInputStream();
    }

    async listenForTranscript(options?: {
        onPartialResult?: (text: string) => void;
        onFinalResult?: (text: string) => void;
        abortSignal?: AbortSignal;
    }): Promise<string> {
        if (this.sttController === undefined) {
            throw new TJBotError(
                'STT controller not initialized. Make sure to call setupMicrophone() before listening.'
            );
        }
        const transcript = await this.sttController.transcribe({
            onPartialResult: options?.onPartialResult,
            onFinalResult: options?.onFinalResult,
            abortSignal: options?.abortSignal,
        });
        return transcript.trim();
    }

    async capturePhoto(atPath?: string): Promise<string> {
        if (this.cameraController === undefined) {
            throw new TJBotError(
                'Camera controller not initialized. Make sure to call setupCamera() before using the camera.'
            );
        }
        return this.cameraController.capturePhoto(atPath);
    }

    async capturePhotoBuffer(): Promise<Buffer> {
        if (this.cameraController === undefined) {
            throw new TJBotError(
                'Camera controller not initialized. Make sure to call setupCamera() before using the camera.'
            );
        }
        return this.cameraController.capturePhotoBuffer();
    }

    async detectObjects(image: Buffer | string): Promise<ObjectDetectionResult[]> {
        if (this.visionController === undefined) {
            throw new TJBotError(
                'Vision controller is not initialized. Make sure to call setupCamera() before using Vision.'
            );
        }
        return this.visionController.detectObjects(image);
    }

    async classifyImage(image: Buffer | string): Promise<ImageClassificationResult[]> {
        if (this.visionController === undefined) {
            throw new TJBotError(
                'Vision controller is not initialized. Make sure to call setupCamera() before using Vision.'
            );
        }
        return this.visionController.classifyImage(image);
    }

    async describeImage(image: Buffer | string): Promise<ImageDescriptionResult> {
        if (this.visionController === undefined) {
            throw new TJBotError(
                'Vision controller is not initialized. Make sure to call setupCamera() before using Vision.'
            );
        }
        return this.visionController.describeImage(image);
    }

    async detectFaces(image: Buffer | string): Promise<{ isFaceDetected: boolean; metadata: FaceDetectionMetadata[] }> {
        if (this.visionController === undefined) {
            throw new TJBotError(
                'Vision controller is not initialized. Make sure to call setupCamera() before using Vision.'
            );
        }
        return this.visionController.detectFaces(image);
    }

    async renderLED(hexColor: string): Promise<void> {
        if (this.shineConfig.hasCommonAnodeLED) {
            const rgb: [number, number, number] = convertHexToRgbColor(hexColor);
            this.renderLEDCommonAnode(rgb);
        }
        if (this.shineConfig.hasNeopixelLED) {
            await this.renderLEDNeopixel(hexColor);
        }
    }

    async playAudio(audioPath: string): Promise<void> {
        if (this.speakerController === undefined) {
            throw new TJBotError(
                'Speaker controller not initialized. Make sure to call setupSpeaker() before playing audio.'
            );
        }
        return this.speakerController.playAudio(audioPath);
    }

    async speak(message: string): Promise<void> {
        if (this.ttsController === undefined) {
            throw new TJBotError('TTS controller not initialized. Make sure to call setupSpeaker() before speaking.');
        }
        return this.ttsController.speak(message);
    }
}
