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
import { Hardware } from '../utils/index.js';
import { RPiBaseHardwareDriver } from './rpi-driver.js';
import { LEDCommonAnode, LEDNeopixel } from '../led/index.js';
import { PiGPIOServoController } from '../servo/index.js';
class RPi4Driver extends RPiBaseHardwareDriver {
    constructor() {
        super();
        winston.debug('🥧 initializing RPi4 hardware driver');
        this.useGRBFormat = false;
    }
    setupLEDCommonAnode(config) {
        const redPin = config?.redPin ?? 19;
        const greenPin = config?.greenPin ?? 13;
        const bluePin = config?.bluePin ?? 12;
        winston.verbose(`💡 initializing ${Hardware.LED_COMMON_ANODE} on RED PIN ${redPin}, GREEN PIN ${greenPin}, and BLUE PIN ${bluePin}`);
        this.commonAnodeLed = new LEDCommonAnode(redPin, greenPin, bluePin);
        this.initializedHardware.add(Hardware.LED_COMMON_ANODE);
    }
    setupLEDNeopixel(config) {
        const pin = config?.gpioPin ?? 21;
        winston.verbose(`💡 initializing ${Hardware.LED_NEOPIXEL} on pin ${pin}`);
        this.neopixelLed = new LEDNeopixel(pin);
        this.useGRBFormat = config?.useGRBFormat ?? false;
        this.initializedHardware.add(Hardware.LED_NEOPIXEL);
    }
    setupServo(config) {
        const pin = config.servoPin ?? 18;
        winston.verbose(`🦾 initializing ${Hardware.SERVO} on PIN ${pin}`);
        this.servo = new PiGPIOServoController(pin);
        this.initializedHardware.add(Hardware.SERVO);
    }
    renderLEDCommonAnode(rgbColor) {
        if (this.commonAnodeLed) {
            this.commonAnodeLed.render(rgbColor);
        }
        else {
            winston.warn('attempted to render on an uninitialized Common Anode LED');
        }
    }
    async renderLEDNeopixel(hexColor) {
        if (this.neopixelLed) {
            const c = hexColor;
            if (this.useGRBFormat) {
                const grbStr = `0x${c[3]}${c[4]}${c[1]}${c[2]}${c[5]}${c[6]}`;
                const grb = parseInt(grbStr, 16);
                this.neopixelLed.render(grb);
            }
            else {
                const rgbStr = `0x${c[1]}${c[2]}${c[3]}${c[4]}${c[5]}${c[6]}`;
                const rgb = parseInt(rgbStr, 16);
                this.neopixelLed.render(rgb);
            }
        }
        else {
            winston.warn('attempted to render on an uninitialized Neopixel LED');
        }
    }
    renderServoPosition(position) {
        if (this.servo) {
            this.servo.setPosition(position);
        }
        else {
            winston.warn('attempted to render on an uninitialized servo');
        }
    }
}
export default RPi4Driver;
//# sourceMappingURL=rpi4-driver.js.map