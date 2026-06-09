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

import { createRequire } from 'module';
import { getLogger } from '../utils/logging.js';

const logger = getLogger(import.meta.url);

const require = createRequire(import.meta.url);
const lgpio = require('lgpio') as {
    gpiochipOpen: (chipNumber: number) => number;
    gpioClaimOutput: (handle: number, pin: number, flags?: number, level?: boolean) => void;
    txPwm: (
        handle: number,
        pin: number,
        frequency: number,
        dutyCycle: number,
        offset?: number,
        cycles?: number
    ) => number;
    gpioFree: (handle: number, pin: number) => void;
    gpiochipClose: (handle: number) => void;
};

const GPIO_CHIP = 0;
const LED_PWM_FREQUENCY = 800;

/**
 * LED controller for Common Anode LEDs using GPIO pins with PWM
 */
export class LEDCommonAnode {
    private chipHandle: number;
    private redPin: number;
    private greenPin: number;
    private bluePin: number;

    constructor(red: number, green: number, blue: number) {
        this.chipHandle = lgpio.gpiochipOpen(GPIO_CHIP);
        this.redPin = red;
        this.greenPin = green;
        this.bluePin = blue;

        lgpio.gpioClaimOutput(this.chipHandle, this.redPin);
        lgpio.gpioClaimOutput(this.chipHandle, this.greenPin);
        lgpio.gpioClaimOutput(this.chipHandle, this.bluePin);

        this.writePin(this.redPin, 0);
        this.writePin(this.greenPin, 0);
        this.writePin(this.bluePin, 0);

        logger.verbose(`Initialized LEDCommonAnode on pins R:${red} G:${green} B:${blue}`);
    }

    private writePin(pin: number, brightness: number): void {
        const clampedBrightness = Math.max(0, Math.min(255, brightness));
        const highDutyCycle = ((255 - clampedBrightness) / 255) * 100;
        lgpio.txPwm(this.chipHandle, pin, LED_PWM_FREQUENCY, highDutyCycle, 0, 0);
    }

    /**
     * Render the LED to a specific RGB color.
     * Common Anode LEDs are inverted - 0 is ON, 255 is OFF
     * @param rgbColor RGB color as [red, green, blue] where each is 0-255
     */
    render(rgbColor: [number, number, number]): void {
        logger.debug(`rendering Common Anode LED with color RGB(${rgbColor[0]}, ${rgbColor[1]}, ${rgbColor[2]})`);
        this.writePin(this.redPin, rgbColor[0]);
        this.writePin(this.greenPin, rgbColor[1]);
        this.writePin(this.bluePin, rgbColor[2]);
    }

    /**
     * Clean up resources
     */
    cleanup(): void {
        logger.debug('LEDCommonAnode cleanup');
        try {
            this.writePin(this.redPin, 0);
            this.writePin(this.greenPin, 0);
            this.writePin(this.bluePin, 0);
            lgpio.gpioFree(this.chipHandle, this.redPin);
            lgpio.gpioFree(this.chipHandle, this.greenPin);
            lgpio.gpioFree(this.chipHandle, this.bluePin);
        } finally {
            lgpio.gpiochipClose(this.chipHandle);
        }
    }
}
