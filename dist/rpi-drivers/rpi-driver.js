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
import { CameraController } from '../camera/index.js';
import { MicrophoneController } from '../microphone/index.js';
import { SpeakerController } from '../speaker/index.js';
import { STTController } from '../stt/stt.js';
import { TTSController } from '../tts/tts.js';
import { Capability, convertHexToRgbColor, Hardware, isCommandAvailable, TJBotError } from '../utils/index.js';
import { VisionController } from '../vision/vision.js';
export class RPiHardwareDriver {
}
export class RPiBaseHardwareDriver extends RPiHardwareDriver {
    // initialized hardware
    initializedHardware;
    // controllers for hardware components
    cameraController;
    microphoneController;
    speakerController;
    // controllers for STT, TTS, CV
    sttController;
    ttsController;
    visionController;
    // cached configuration for listen
    listenConfig = {};
    // cached configuration for shine
    shineConfig = {};
    // cached configuration for see
    seeConfig = {};
    // cached configuration for speak
    speakConfig = {};
    constructor() {
        super();
        this.initializedHardware = new Set();
    }
    getHardware() {
        return new Set(this.initializedHardware);
    }
    hasHardware(hardware) {
        return this.initializedHardware.has(hardware);
    }
    hasCapability(capability) {
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
    setupCamera(config) {
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
    async setupLED(config) {
        this.shineConfig = config;
        if (config.hasCommonAnodeLED) {
            this.setupLEDCommonAnode(config.commonanode ?? {});
        }
        if (config.hasNeopixelLED) {
            await this.setupLEDNeopixel(config.neopixel ?? {});
        }
    }
    setupMicrophone(config) {
        this.microphoneController = new MicrophoneController();
        this.listenConfig = config;
        const rate = config.microphoneRate ?? 44100;
        const channels = config.microphoneChannels ?? 2;
        const device = config.device ?? '';
        this.microphoneController.initialize(rate, channels, device);
        this.initializedHardware.add(Hardware.MICROPHONE);
    }
    setupSpeaker(config) {
        this.speakerController = new SpeakerController();
        // Validate that aplay is available
        if (!isCommandAvailable('aplay')) {
            throw new TJBotError('TJBot requires the aplay command for audio playback. ' +
                'Install it with: sudo apt-get install alsa-utils');
        }
        const device = config.device ?? '';
        // Cache the full config for later use in speak()
        this.speakConfig = config;
        this.speakerController.initialize(device);
        this.speakerController.setAudioLifecycleCallbacks(() => this.pauseMic(), () => this.resumeMic());
        this.initializedHardware.add(Hardware.SPEAKER);
    }
    async cleanup() {
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
    async initializeSTTEngine() {
        if (this.microphoneController === undefined) {
            throw new TJBotError('Microphone controllernot initialized. Make sure to call setupMicrophone() before initializing the STT engine.');
        }
        this.sttController = new STTController(this.microphoneController);
        await this.sttController.initialize(this.listenConfig);
    }
    async initializeTTSEngine() {
        if (this.speakerController === undefined) {
            throw new TJBotError('Speaker controllernot initialized. Make sure to call setupSpeaker() before initializing the TTS engine.');
        }
        this.ttsController = new TTSController(this.speakerController);
        await this.ttsController.initialize(this.speakConfig);
    }
    async initializeVisionEngine() {
        this.visionController = new VisionController();
        await this.visionController.initialize(this.seeConfig);
    }
    startMic() {
        if (this.microphoneController === undefined) {
            throw new TJBotError('Microphone controllernot initialized. Make sure to call setupMicrophone() before using the microphone.');
        }
        this.microphoneController.start();
    }
    pauseMic() {
        if (this.microphoneController === undefined) {
            return;
        }
        this.microphoneController.pause();
    }
    resumeMic() {
        if (this.microphoneController === undefined) {
            return;
        }
        this.microphoneController.resume();
    }
    stopMic() {
        if (this.microphoneController === undefined) {
            throw new TJBotError('Microphone controllernot initialized. Make sure to call setupMicrophone() before using the microphone.');
        }
        this.microphoneController.stop();
    }
    getMicInputStream() {
        if (this.microphoneController === undefined) {
            throw new TJBotError('Microphone controller not initialized. Make sure to call setupMicrophone() before using the microphone.');
        }
        return this.microphoneController.getInputStream();
    }
    async listenForTranscript(options) {
        if (this.sttController === undefined) {
            throw new TJBotError('STT controller not initialized. Make sure to call setupMicrophone() before listening.');
        }
        const transcript = await this.sttController.transcribe({
            onPartialResult: options?.onPartialResult,
            onFinalResult: options?.onFinalResult,
            abortSignal: options?.abortSignal,
        });
        return transcript.trim();
    }
    async capturePhoto(atPath) {
        if (this.cameraController === undefined) {
            throw new TJBotError('Camera controller not initialized. Make sure to call setupCamera() before using the camera.');
        }
        return this.cameraController.capturePhoto(atPath);
    }
    async capturePhotoBuffer() {
        if (this.cameraController === undefined) {
            throw new TJBotError('Camera controller not initialized. Make sure to call setupCamera() before using the camera.');
        }
        return this.cameraController.capturePhotoBuffer();
    }
    async detectObjects(image) {
        if (this.visionController === undefined) {
            throw new TJBotError('Vision controller is not initialized. Make sure to call setupCamera() before using Vision.');
        }
        return this.visionController.detectObjects(image);
    }
    async classifyImage(image) {
        if (this.visionController === undefined) {
            throw new TJBotError('Vision controller is not initialized. Make sure to call setupCamera() before using Vision.');
        }
        return this.visionController.classifyImage(image);
    }
    async describeImage(image) {
        if (this.visionController === undefined) {
            throw new TJBotError('Vision controller is not initialized. Make sure to call setupCamera() before using Vision.');
        }
        return this.visionController.describeImage(image);
    }
    async detectFaces(image) {
        if (this.visionController === undefined) {
            throw new TJBotError('Vision controller is not initialized. Make sure to call setupCamera() before using Vision.');
        }
        return this.visionController.detectFaces(image);
    }
    async renderLED(hexColor) {
        if (this.shineConfig.hasCommonAnodeLED) {
            const rgb = convertHexToRgbColor(hexColor);
            this.renderLEDCommonAnode(rgb);
        }
        if (this.shineConfig.hasNeopixelLED) {
            await this.renderLEDNeopixel(hexColor);
        }
    }
    async playAudio(audioPath) {
        if (this.speakerController === undefined) {
            throw new TJBotError('Speaker controller not initialized. Make sure to call setupSpeaker() before playing audio.');
        }
        return this.speakerController.playAudio(audioPath);
    }
    async speak(message) {
        if (this.ttsController === undefined) {
            throw new TJBotError('TTS controller not initialized. Make sure to call setupSpeaker() before speaking.');
        }
        return this.ttsController.speak(message);
    }
}
//# sourceMappingURL=rpi-driver.js.map