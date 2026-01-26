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
import winston from 'winston';
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
    constructor() {
        super();
        // cached configuration for speak
        this.speakConfig = {};
        // cached configuration for listen
        this.listenConfig = {};
        // cached configuration for see
        this.seeConfig = {};
        this.initializedHardware = new Set();
    }
    hasHardware(hardware) {
        return this.initializedHardware.has(hardware);
    }
    hasCapability(capability) {
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
    setupCamera(config) {
        this.cameraController = new CameraController();
        const width = config.cameraResolution?.[0] ?? 1920;
        const height = config.cameraResolution?.[1] ?? 1080;
        const verticalFlip = config.verticalFlip ?? false;
        const horizontalFlip = config.horizontalFlip ?? false;
        this.cameraController.initialize([width, height], verticalFlip, horizontalFlip);
        this.visionController = new VisionController(config);
        this.initializedHardware.add(Hardware.CAMERA);
    }
    setupMicrophone(config) {
        this.microphoneController = new MicrophoneController();
        this.listenConfig = config;
        const rate = config.microphoneRate ?? 44100;
        const channels = config.microphoneChannels ?? 2;
        const device = config.device ?? '';
        this.microphoneController.initialize(rate, channels, device);
        this.sttController = new STTController(this.microphoneController, config);
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
        this.ttsController = new TTSController(this.speakerController);
        this.initializedHardware.add(Hardware.SPEAKER);
    }
    startMic() {
        if (!this.microphoneController) {
            throw new TJBotError('Microphone not initialized. Make sure to call setupMicrophone() before using the microphone.');
        }
        this.microphoneController.start();
    }
    pauseMic() {
        if (!this.microphoneController) {
            return;
        }
        this.microphoneController.pause();
    }
    resumeMic() {
        if (!this.microphoneController) {
            return;
        }
        this.microphoneController.resume();
    }
    stopMic() {
        if (!this.microphoneController) {
            throw new TJBotError('Microphone not initialized. Make sure to call setupMicrophone() before using the microphone.');
        }
        this.microphoneController.stop();
    }
    getMicInputStream() {
        if (!this.microphoneController) {
            throw new TJBotError('Microphone not initialized. Make sure to call setupMicrophone() before using the microphone.');
        }
        return this.microphoneController.getInputStream();
    }
    connectMicStreamToSTTStream(sttStream) {
        if (!this.microphoneController) {
            throw new TJBotError('Microphone not initialized. Make sure to call setupMicrophone() before using the microphone.');
        }
        return this.microphoneController.connectToSTT(sttStream);
    }
    async listenForTranscript(options) {
        if (!this.sttController) {
            throw new TJBotError('STT controller not initialized. Make sure to call setupMicrophone() before listening.');
        }
        const transcript = await this.sttController.transcribe({
            onPartialResult: options?.onPartialResult,
            onFinalResult: options?.onFinalResult,
            abortSignal: options?.abortSignal,
        });
        winston.verbose(`👂 TJBot heard: "${transcript.trim()}"`);
        return transcript.trim();
    }
    async capturePhoto(atPath) {
        if (!this.cameraController) {
            throw new TJBotError('Camera not initialized. Make sure to call setupCamera() before using the camera.');
        }
        return this.cameraController.capturePhoto(atPath);
    }
    async detectObjects(image) {
        if (!this.visionController)
            throw new TJBotError('Vision controller is not initialized. Make sure to call setupCamera() before using Vision.');
        return this.visionController.detectObjects(image);
    }
    async classifyImage(image) {
        if (!this.visionController)
            throw new TJBotError('Vision controller is not initialized. Make sure to call setupCamera() before using Vision.');
        return this.visionController.classifyImage(image);
    }
    async segmentImage(image) {
        if (!this.visionController)
            throw new TJBotError('Vision controller is not initialized. Make sure to call setupCamera() before using Vision.');
        return this.visionController.segmentImage(image);
    }
    async renderLED(hexColor) {
        if (this.hasHardware(Hardware.LED_COMMON_ANODE)) {
            const rgb = convertHexToRgbColor(hexColor);
            this.renderLEDCommonAnode(rgb);
        }
        if (this.hasHardware(Hardware.LED_NEOPIXEL)) {
            await this.renderLEDNeopixel(hexColor);
        }
    }
    async playAudio(audioPath) {
        if (!this.speakerController) {
            throw new TJBotError('Speaker not initialized. Make sure to call setupSpeaker() before playing audio.');
        }
        return this.speakerController.playAudio(audioPath);
    }
    async speak(message) {
        if (!this.ttsController) {
            throw new TJBotError('TTS controller not initialized. Make sure to call setupSpeaker() before speaking.');
        }
        return this.ttsController.speak(message, this.speakConfig);
    }
}
//# sourceMappingURL=rpi-driver.js.map