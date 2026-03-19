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
import { LEDCommonAnode, LEDNeopixelSPI } from '../led/index.js';
import { LGPIOServoController } from '../servo/index.js';
import { Hardware } from '../utils/index.js';
import { RPiBaseHardwareDriver } from './rpi-driver.js';
class RPi5Driver extends RPiBaseHardwareDriver {
    commonAnodeLed;
    neopixelLed;
    servo;
    constructor() {
        super();
        winston.debug(`${LogEmoji.RPI} initializing RPi5 hardware driver`);
    }
    setupLEDCommonAnode(config) {
        const redPin = config?.redPin ?? 19;
        const greenPin = config?.greenPin ?? 13;
        const bluePin = config?.bluePin ?? 12;
        winston.verbose(`${LogEmoji.LED} initializing Common Anode LED on RED PIN ${redPin}, GREEN PIN ${greenPin}, and BLUE PIN ${bluePin}`);
        this.commonAnodeLed = new LEDCommonAnode(redPin, greenPin, bluePin);
        this.initializedHardware.add(Hardware.LED);
    }
    setupLEDNeopixel(config) {
        const spiInterface = config?.spiInterface ?? '/dev/spidev0.0';
        const useGRBFormat = config?.useGRBFormat ?? false;
        winston.verbose(`${LogEmoji.LED} initializing NeoPixel LED on SPI ${spiInterface}`);
        this.neopixelLed = new LEDNeopixelSPI(spiInterface, useGRBFormat);
        this.initializedHardware.add(Hardware.LED);
    }
    setupServo(config) {
        const pin = config.servoPin ?? 18;
        const chipNumber = 0; // GPIO chip 0 (standard Raspberry Pi configuration)
        this.servo = new LGPIOServoController(chipNumber, pin);
        this.initializedHardware.add(Hardware.SERVO);
    }
    renderLEDCommonAnode(rgbColor) {
        if (this.commonAnodeLed) {
            this.commonAnodeLed.render(rgbColor);
        }
        else {
            winston.warn(`${LogEmoji.LED} attempted to render on an uninitialized Common Anode LED`);
        }
    }
    async renderLEDNeopixel(hexColor) {
        if (this.neopixelLed) {
            await this.neopixelLed.render(hexColor);
        }
        else {
            winston.warn(`${LogEmoji.LED} attempted to render on an uninitialized Neopixel LED`);
        }
    }
    renderServoPosition(position) {
        if (this.servo) {
            // Convert ServoPosition (500-2300 microseconds) to pulse width in milliseconds
            // ServoPosition uses pigpio servo pulse format: 500-2500 microseconds
            // LGPIOServoController expects pulse width: 0.5-2.5 milliseconds
            const pulseMs = position / 1000;
            winston.verbose(`${LogEmoji.SERVO} setting servo position to ${position} μs (${pulseMs} ms)`);
            this.servo.setPulseWidth(pulseMs);
        }
        else {
            winston.warn(`${LogEmoji.SERVO} attempted to render on an uninitialized servo`);
        }
    }
}
export default RPi5Driver;
//# sourceMappingURL=rpi5-driver.js.map