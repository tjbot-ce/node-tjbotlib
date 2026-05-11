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

import { ShineConfig, WaveConfig } from '../config/index.js';
import { LEDCommonAnode, LEDNeopixel } from '../led/index.js';
import { LGPIOServoController, ServoPosition } from '../servo/index.js';
import { Hardware } from '../utils/index.js';
import { LogEmoji } from '../utils/logging.js';
import { RPiBaseHardwareDriver } from './rpi-driver.js';
import {
    FaceDetectionMetadata,
    ImageClassificationResult,
    ImageDescriptionResult,
    ObjectDetectionResult,
} from '../vision/index.js';

class RPi3Driver extends RPiBaseHardwareDriver {
    private commonAnodeLed: LEDCommonAnode | undefined;
    private neopixelLed: LEDNeopixel | undefined;
    private useGRBFormat: boolean;
    private servo: LGPIOServoController | undefined;
    private userHasBeenWarned: { [key: string]: boolean } = {};

    constructor() {
        super();
        this.useGRBFormat = true;
    }

    setupLEDCommonAnode(config: ShineConfig['commonanode']): void {
        const redPin: number = config?.redPin ?? 19;
        const greenPin: number = config?.greenPin ?? 13;
        const bluePin: number = config?.bluePin ?? 12;
        this.commonAnodeLed = new LEDCommonAnode(redPin, greenPin, bluePin);
        this.initializedHardware.add(Hardware.LED);
    }

    async setupLEDNeopixel(config: ShineConfig['neopixel']): Promise<void> {
        const pin: number = config?.gpioPin ?? 18;
        this.neopixelLed = new LEDNeopixel(pin);
        await this.neopixelLed.initialize();
        this.useGRBFormat = config?.useGRBFormat ?? true;
        this.initializedHardware.add(Hardware.LED);
    }

    setupServo(config: WaveConfig): void {
        const pin: number = config.servoPin ?? 18;
        this.servo = new LGPIOServoController(0, pin);
        this.initializedHardware.add(Hardware.SERVO);
    }

    renderLEDCommonAnode(rgbColor: [number, number, number]): void {
        if (this.commonAnodeLed) {
            this.commonAnodeLed.render(rgbColor);
        } else {
            winston.warn(`${LogEmoji.LED} Attempted to render on an uninitialized Common Anode LED`);
        }
    }

    async renderLEDNeopixel(hexColor: string): Promise<void> {
        if (this.neopixelLed) {
            const c: string = hexColor.startsWith('#') ? hexColor.slice(1) : hexColor;

            if (c.length !== 6) {
                winston.warn(`${LogEmoji.LED} Invalid NeoPixel color '${hexColor}'`);
                return;
            }

            if (this.useGRBFormat) {
                const grbStr: string = `0x${c[2]}${c[3]}${c[0]}${c[1]}${c[4]}${c[5]}`;
                const grb: number = parseInt(grbStr, 16);
                await this.neopixelLed.render(grb);
            } else {
                const rgbStr: string = `0x${c}`;
                const rgb: number = parseInt(rgbStr, 16);
                await this.neopixelLed.render(rgb);
            }
        } else {
            winston.warn(`${LogEmoji.LED} Attempted to render on an uninitialized Neopixel LED`);
        }
    }

    async cleanup(): Promise<void> {
        if (this.neopixelLed) {
            await this.neopixelLed.cleanup();
        }
        await super.cleanup();
    }

    renderServoPosition(position: ServoPosition): void {
        if (this.servo) {
            this.servo.setPosition(position);
        } else {
            winston.warn(`${LogEmoji.SERVO} Attempted to render on an uninitialized servo`);
        }
    }

    private warnIfUsingLocalAI(aiType: 'stt' | 'tts' | 'vision'): void {
        if (this.userHasBeenWarned[aiType]) {
            return;
        }

        switch (aiType) {
            case 'stt':
                if (this.listenConfig.backend?.type === 'local') {
                    winston.warn(
                        `${LogEmoji.STT} Using local STT on Raspberry Pi 3 may have poor performance. Consider using a cloud-based backend for better results.`
                    );
                }
                break;
            case 'tts':
                if (this.speakConfig.backend?.type === 'local') {
                    winston.warn(
                        `${LogEmoji.TTS} Using local TTS on Raspberry Pi 3 may have poor performance. Consider using a cloud-based backend for better results.`
                    );
                }
                break;
            case 'vision':
                if (this.seeConfig.backend?.type === 'local') {
                    winston.warn(
                        `${LogEmoji.VISION} Using local Vision on Raspberry Pi 3 may have poor performance. Consider using a cloud-based backend for better results.`
                    );
                }
                break;
        }

        this.userHasBeenWarned[aiType] = true;
    }

    async listenForTranscript(): Promise<string> {
        this.warnIfUsingLocalAI('stt');
        return super.listenForTranscript();
    }

    async speak(message: string): Promise<void> {
        this.warnIfUsingLocalAI('tts');
        return super.speak(message);
    }

    async detectObjects(image: Buffer | string): Promise<ObjectDetectionResult[]> {
        this.warnIfUsingLocalAI('vision');
        return super.detectObjects(image);
    }

    async classifyImage(image: Buffer | string): Promise<ImageClassificationResult[]> {
        this.warnIfUsingLocalAI('vision');
        return super.classifyImage(image);
    }

    async describeImage(image: Buffer | string): Promise<ImageDescriptionResult> {
        this.warnIfUsingLocalAI('vision');
        return super.describeImage(image);
    }

    async detectFaces(image: Buffer | string): Promise<{ isFaceDetected: boolean; metadata: FaceDetectionMetadata[] }> {
        this.warnIfUsingLocalAI('vision');
        return super.detectFaces(image);
    }
}

export default RPi3Driver;
