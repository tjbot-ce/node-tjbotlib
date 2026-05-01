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
import { LogEmoji } from '../utils/logging.js';

import { ShineConfig, WaveConfig } from '../config/index.js';
import { LEDCommonAnode, LEDNeopixel } from '../led/index.js';
import { LGPIOServoController, ServoPosition } from '../servo/index.js';
import { Hardware } from '../utils/index.js';
import { RPiBaseHardwareDriver } from './rpi-driver.js';

class RPi4Driver extends RPiBaseHardwareDriver {
    private commonAnodeLed: LEDCommonAnode | undefined;
    private neopixelLed: LEDNeopixel | undefined;
    private useGRBFormat: boolean;
    private servo: LGPIOServoController | undefined;

    constructor() {
        super();
        winston.debug(`${LogEmoji.RPI} initializing RPi4 hardware driver`);
        this.useGRBFormat = true;
    }

    setupLEDCommonAnode(config: ShineConfig['commonanode']): void {
        const redPin: number = config?.redPin ?? 19;
        const greenPin: number = config?.greenPin ?? 13;
        const bluePin: number = config?.bluePin ?? 12;
        winston.verbose(
            `${LogEmoji.LED} initializing Common Anode LED on RED PIN ${redPin}, GREEN PIN ${greenPin}, and BLUE PIN ${bluePin}`
        );
        this.commonAnodeLed = new LEDCommonAnode(redPin, greenPin, bluePin);
        this.initializedHardware.add(Hardware.LED);
    }

    setupLEDNeopixel(config: ShineConfig['neopixel']): void {
        const pin: number = config?.gpioPin ?? 18;
        winston.verbose(`${LogEmoji.LED} initializing NeoPixel LED on pin ${pin}`);
        this.neopixelLed = new LEDNeopixel(pin);
        this.useGRBFormat = config?.useGRBFormat ?? true;
        this.initializedHardware.add(Hardware.LED);
    }

    setupServo(config: WaveConfig): void {
        const pin: number = config.servoPin ?? 18;
        winston.verbose(`${LogEmoji.SERVO} initializing ${Hardware.SERVO} on PIN ${pin}`);
        this.servo = new LGPIOServoController(0, pin);
        this.initializedHardware.add(Hardware.SERVO);
    }

    renderLEDCommonAnode(rgbColor: [number, number, number]): void {
        if (this.commonAnodeLed) {
            this.commonAnodeLed.render(rgbColor);
        } else {
            winston.warn(`${LogEmoji.LED} attempted to render on an uninitialized Common Anode LED`);
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
            winston.warn(`${LogEmoji.LED} attempted to render on an uninitialized Neopixel LED`);
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
            winston.warn(`${LogEmoji.SERVO} attempted to render on an uninitialized servo`);
        }
    }
}

export default RPi4Driver;
