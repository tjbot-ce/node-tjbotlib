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
import { LEDCommonAnode, LEDNeopixel } from '../led/index.js';
import { LGPIOServoController } from '../servo/index.js';
import { Hardware } from '../utils/index.js';
import { LogEmoji } from '../utils/logging.js';
import { RPiBaseHardwareDriver } from './rpi-driver.js';
class RPi3Driver extends RPiBaseHardwareDriver {
    commonAnodeLed;
    neopixelLed;
    useGRBFormat;
    servo;
    userHasBeenWarned = {};
    constructor() {
        super();
        this.useGRBFormat = true;
    }
    setupLEDCommonAnode(config) {
        const redPin = config?.redPin ?? 19;
        const greenPin = config?.greenPin ?? 13;
        const bluePin = config?.bluePin ?? 12;
        this.commonAnodeLed = new LEDCommonAnode(redPin, greenPin, bluePin);
        this.initializedHardware.add(Hardware.LED);
    }
    async setupLEDNeopixel(config) {
        const pin = config?.gpioPin ?? 18;
        this.neopixelLed = new LEDNeopixel(pin);
        await this.neopixelLed.initialize();
        this.useGRBFormat = config?.useGRBFormat ?? true;
        this.initializedHardware.add(Hardware.LED);
    }
    setupServo(config) {
        const pin = config.servoPin ?? 18;
        this.servo = new LGPIOServoController(0, pin);
        this.initializedHardware.add(Hardware.SERVO);
    }
    renderLEDCommonAnode(rgbColor) {
        if (this.commonAnodeLed) {
            this.commonAnodeLed.render(rgbColor);
        }
        else {
            winston.warn(`${LogEmoji.LED} Attempted to render on an uninitialized Common Anode LED`);
        }
    }
    async renderLEDNeopixel(hexColor) {
        if (this.neopixelLed) {
            const c = hexColor.startsWith('#') ? hexColor.slice(1) : hexColor;
            if (c.length !== 6) {
                winston.warn(`${LogEmoji.LED} Invalid NeoPixel color '${hexColor}'`);
                return;
            }
            if (this.useGRBFormat) {
                const grbStr = `0x${c[2]}${c[3]}${c[0]}${c[1]}${c[4]}${c[5]}`;
                const grb = parseInt(grbStr, 16);
                await this.neopixelLed.render(grb);
            }
            else {
                const rgbStr = `0x${c}`;
                const rgb = parseInt(rgbStr, 16);
                await this.neopixelLed.render(rgb);
            }
        }
        else {
            winston.warn(`${LogEmoji.LED} Attempted to render on an uninitialized Neopixel LED`);
        }
    }
    async cleanup() {
        if (this.neopixelLed) {
            await this.neopixelLed.cleanup();
        }
        await super.cleanup();
    }
    renderServoPosition(position) {
        if (this.servo) {
            this.servo.setPosition(position);
        }
        else {
            winston.warn(`${LogEmoji.SERVO} Attempted to render on an uninitialized servo`);
        }
    }
    warnIfUsingLocalAI(aiType) {
        if (this.userHasBeenWarned[aiType]) {
            return;
        }
        switch (aiType) {
            case 'stt':
                if (this.listenConfig.backend?.type === 'local') {
                    winston.warn(`${LogEmoji.STT} Using local STT on Raspberry Pi 3 may have poor performance. Consider using a cloud-based backend for better results.`);
                }
                break;
            case 'tts':
                if (this.speakConfig.backend?.type === 'local') {
                    winston.warn(`${LogEmoji.TTS} Using local TTS on Raspberry Pi 3 may have poor performance. Consider using a cloud-based backend for better results.`);
                }
                break;
            case 'vision':
                if (this.seeConfig.backend?.type === 'local') {
                    winston.warn(`${LogEmoji.VISION} Using local Vision on Raspberry Pi 3 may have poor performance. Consider using a cloud-based backend for better results.`);
                }
                break;
        }
        this.userHasBeenWarned[aiType] = true;
    }
    async listenForTranscript() {
        this.warnIfUsingLocalAI('stt');
        return super.listenForTranscript();
    }
    async speak(message) {
        this.warnIfUsingLocalAI('tts');
        return super.speak(message);
    }
    async detectObjects(image) {
        this.warnIfUsingLocalAI('vision');
        return super.detectObjects(image);
    }
    async classifyImage(image) {
        this.warnIfUsingLocalAI('vision');
        return super.classifyImage(image);
    }
    async describeImage(image) {
        this.warnIfUsingLocalAI('vision');
        return super.describeImage(image);
    }
    async detectFaces(image) {
        this.warnIfUsingLocalAI('vision');
        return super.detectFaces(image);
    }
}
export default RPi3Driver;
//# sourceMappingURL=rpi3-driver.js.map