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
import winston from 'winston';

import { Transform } from 'stream';
import { CameraController } from '../camera/index.js';
import { ListenConfig, SeeConfig, ShineConfig, SpeakConfig, WaveConfig } from '../config/index.js';
import { MicrophoneController } from '../microphone/index.js';
import { ServoPosition } from '../servo/index.js';
import { SpeakerController } from '../speaker/index.js';
import { STTController } from '../stt/stt.js';
import { TTSController } from '../tts/tts.js';
import { Capability, convertHexToRgbColor, Hardware, isCommandAvailable, TJBotError } from '../utils/index.js';
import { ImageClassificationResult, ImageSegmentationResult, ObjectDetectionResult } from '../vision/index.js';
import { VisionController } from '../vision/vision.js';

export abstract class RPiHardwareDriver {
    // capability checks
    abstract hasHardware(hardware: Hardware): boolean;
    abstract hasCapability(capability: Capability): boolean;

    // hardware setup
    abstract setupCamera(config: SeeConfig): void;
    abstract setupLEDCommonAnode(config: ShineConfig['commonanode']): void;
    abstract setupLEDNeopixel(config: ShineConfig['neopixel']): void;
    abstract setupMicrophone(config: ListenConfig): void;
    abstract setupServo(config: WaveConfig): void;
    abstract setupSpeaker(config: SpeakConfig): void;

    // LISTEN
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

    // SEE
    abstract capturePhoto(atPath?: string): Promise<string>;
    abstract detectObjects(image: Buffer | string): Promise<ObjectDetectionResult[]>;
    abstract classifyImage(image: Buffer | string): Promise<ImageClassificationResult[]>;
    abstract segmentImage(image: Buffer | string): Promise<ImageSegmentationResult>;

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

    // cached configuration for speak
    protected speakConfig: SpeakConfig = {};
    // cached configuration for listen
    protected listenConfig: ListenConfig = {};
    // cached configuration for see
    protected seeConfig: SeeConfig = {};

    constructor() {
        super();
        this.initializedHardware = new Set();
    }

    hasHardware(hardware: Hardware): boolean {
        return this.initializedHardware.has(hardware);
    }

    hasCapability(capability: Capability): boolean {
        switch (capability) {
            case Capability.LISTEN:
                return this.hasHardware(Hardware.MICROPHONE);
            case Capability.LOOK:
                return this.hasHardware(Hardware.CAMERA);
            case Capability.SHINE:
                return this.hasHardware(Hardware.LED_COMMON_ANODE) || this.hasHardware(Hardware.LED_NEOPIXEL);
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
        const width = config.cameraResolution?.[0] ?? 1920;
        const height = config.cameraResolution?.[1] ?? 1080;
        const verticalFlip = config.verticalFlip ?? false;
        const horizontalFlip = config.horizontalFlip ?? false;
        this.cameraController.initialize([width, height], verticalFlip, horizontalFlip);
        this.visionController = new VisionController(config);
        this.initializedHardware.add(Hardware.CAMERA);
    }

    setupMicrophone(config: ListenConfig) {
        this.microphoneController = new MicrophoneController();
        this.listenConfig = config;
        const rate = config.microphoneRate ?? 44100;
        const channels = config.microphoneChannels ?? 2;
        const device = config.device ?? '';
        this.microphoneController.initialize(rate, channels, device);
        this.sttController = new STTController(this.microphoneController, config);
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
        this.ttsController = new TTSController(this.speakerController);
        this.initializedHardware.add(Hardware.SPEAKER);
    }

    startMic(): void {
        if (!this.microphoneController) {
            throw new TJBotError(
                'Microphone not initialized. Make sure to call setupMicrophone() before using the microphone.'
            );
        }
        this.microphoneController.start();
    }

    pauseMic(): void {
        if (!this.microphoneController) {
            return;
        }
        this.microphoneController.pause();
    }

    resumeMic(): void {
        if (!this.microphoneController) {
            return;
        }
        this.microphoneController.resume();
    }

    stopMic(): void {
        if (!this.microphoneController) {
            throw new TJBotError(
                'Microphone not initialized. Make sure to call setupMicrophone() before using the microphone.'
            );
        }
        this.microphoneController.stop();
    }

    getMicInputStream(): Transform {
        if (!this.microphoneController) {
            throw new TJBotError(
                'Microphone not initialized. Make sure to call setupMicrophone() before using the microphone.'
            );
        }
        return this.microphoneController.getInputStream();
    }

    connectMicStreamToSTTStream(sttStream: RecognizeStream): RecognizeStream {
        if (!this.microphoneController) {
            throw new TJBotError(
                'Microphone not initialized. Make sure to call setupMicrophone() before using the microphone.'
            );
        }
        return this.microphoneController.connectToSTT(sttStream);
    }

    async listenForTranscript(options?: {
        onPartialResult?: (text: string) => void;
        onFinalResult?: (text: string) => void;
        abortSignal?: AbortSignal;
    }): Promise<string> {
        if (!this.sttController) {
            throw new TJBotError(
                'STT controller not initialized. Make sure to call setupMicrophone() before listening.'
            );
        }
        const transcript = await this.sttController.transcribe({
            onPartialResult: options?.onPartialResult,
            onFinalResult: options?.onFinalResult,
            abortSignal: options?.abortSignal,
        });
        winston.verbose(`👂 TJBot heard: "${transcript.trim()}"`);
        return transcript.trim();
    }

    async capturePhoto(atPath?: string): Promise<string> {
        if (!this.cameraController) {
            throw new TJBotError('Camera not initialized. Make sure to call setupCamera() before using the camera.');
        }
        return this.cameraController.capturePhoto(atPath);
    }

    async detectObjects(image: Buffer | string): Promise<ObjectDetectionResult[]> {
        if (!this.visionController)
            throw new TJBotError(
                'Vision controller is not initialized. Make sure to call setupCamera() before using Vision.'
            );
        return this.visionController.detectObjects(image);
    }

    async classifyImage(image: Buffer | string): Promise<ImageClassificationResult[]> {
        if (!this.visionController)
            throw new TJBotError(
                'Vision controller is not initialized. Make sure to call setupCamera() before using Vision.'
            );
        return this.visionController.classifyImage(image);
    }

    async segmentImage(image: Buffer | string): Promise<ImageSegmentationResult> {
        if (!this.visionController)
            throw new TJBotError(
                'Vision controller is not initialized. Make sure to call setupCamera() before using Vision.'
            );
        return this.visionController.segmentImage(image);
    }

    async renderLED(hexColor: string): Promise<void> {
        if (this.hasHardware(Hardware.LED_COMMON_ANODE)) {
            const rgb: [number, number, number] = convertHexToRgbColor(hexColor);
            this.renderLEDCommonAnode(rgb);
        }
        if (this.hasHardware(Hardware.LED_NEOPIXEL)) {
            await this.renderLEDNeopixel(hexColor);
        }
    }

    async playAudio(audioPath: string): Promise<void> {
        if (!this.speakerController) {
            throw new TJBotError('Speaker not initialized. Make sure to call setupSpeaker() before playing audio.');
        }
        return this.speakerController.playAudio(audioPath);
    }

    async speak(message: string): Promise<void> {
        if (!this.ttsController) {
            throw new TJBotError('TTS controller not initialized. Make sure to call setupSpeaker() before speaking.');
        }
        return this.ttsController.speak(message, this.speakConfig);
    }
}
