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
import winston from 'winston';
import { LogEmoji } from '../utils/logging.js';
const EMO = LogEmoji.LED;
const require = createRequire(import.meta.url);
let pigpioGpioClass;
function getPigpioGpioClass() {
    if (!pigpioGpioClass) {
        pigpioGpioClass = require('pigpio').Gpio;
    }
    return pigpioGpioClass;
}
/**
 * LED controller for Common Anode LEDs using GPIO pins with PWM
 */
export class LEDCommonAnode {
    redPin;
    greenPin;
    bluePin;
    constructor(red, green, blue) {
        const Gpio = getPigpioGpioClass();
        this.redPin = new Gpio(red, { mode: Gpio.OUTPUT });
        this.greenPin = new Gpio(green, { mode: Gpio.OUTPUT });
        this.bluePin = new Gpio(blue, { mode: Gpio.OUTPUT });
        winston.verbose(`${EMO} Initialized LEDCommonAnode on pins R:${red} G:${green} B:${blue}`);
    }
    /**
     * Render the LED to a specific RGB color.
     * Common Anode LEDs are inverted - 0 is ON, 255 is OFF
     * @param rgbColor RGB color as [red, green, blue] where each is 0-255
     */
    render(rgbColor) {
        winston.debug(`${EMO} rendering Common Anode LED with color RGB(${rgbColor[0]}, ${rgbColor[1]}, ${rgbColor[2]})`);
        this.redPin.pwmWrite(rgbColor[0] === null ? 255 : 255 - rgbColor[0]);
        this.greenPin.pwmWrite(rgbColor[1] === null ? 255 : 255 - rgbColor[1]);
        this.bluePin.pwmWrite(rgbColor[2] === null ? 255 : 255 - rgbColor[2]);
    }
    /**
     * Clean up resources
     */
    cleanup() {
        winston.debug(`${EMO} LEDCommonAnode cleanup`);
        this.redPin.digitalWrite(0);
        this.greenPin.digitalWrite(0);
        this.bluePin.digitalWrite(0);
    }
}
//# sourceMappingURL=led-common-anode.js.map