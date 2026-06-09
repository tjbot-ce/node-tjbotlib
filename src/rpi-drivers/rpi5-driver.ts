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

import { getLogger } from '../utils/logging.js';

import { ShineConfig, WaveConfig } from '../config/index.js';
import { LEDCommonAnode, LEDNeopixelSPI } from '../led/index.js';
import { LGPIOServoController, ServoPosition } from '../servo/index.js';
import { Hardware } from '../utils/index.js';
import { RPiBaseHardwareDriver } from './rpi-driver.js';

const logger = getLogger(import.meta.url);

class RPi5Driver extends RPiBaseHardwareDriver {
    private commonAnodeLed: LEDCommonAnode | undefined;
    private neopixelLed: LEDNeopixelSPI | undefined;
    private servo: LGPIOServoController | undefined;

    constructor() {
        super();
        logger.debug('initializing RPi5 hardware driver');
    }

    setupLEDCommonAnode(config: ShineConfig['commonanode']): void {
        const redPin: number = config?.redPin ?? 19;
        const greenPin: number = config?.greenPin ?? 13;
        const bluePin: number = config?.bluePin ?? 12;
        logger.verbose(
            `initializing Common Anode LED on RED PIN ${redPin}, GREEN PIN ${greenPin}, and BLUE PIN ${bluePin}`
        );
        this.commonAnodeLed = new LEDCommonAnode(redPin, greenPin, bluePin);
        this.initializedHardware.add(Hardware.LED);
    }

    async setupLEDNeopixel(config: ShineConfig['neopixel']): Promise<void> {
        const spiInterface: string = config?.spiInterface ?? '/dev/spidev0.0';
        const useGRBFormat: boolean = config?.useGRBFormat ?? false;
        logger.verbose(`initializing NeoPixel LED on SPI ${spiInterface}`);
        this.neopixelLed = new LEDNeopixelSPI(spiInterface, useGRBFormat);
        this.initializedHardware.add(Hardware.LED);
    }

    setupServo(config: WaveConfig): void {
        const pin: number = config.servoPin ?? 18;
        const chipNumber: number = 0; // GPIO chip 0 (standard Raspberry Pi configuration)
        this.servo = new LGPIOServoController(chipNumber, pin);
        this.initializedHardware.add(Hardware.SERVO);
    }

    renderLEDCommonAnode(rgbColor: [number, number, number]): void {
        if (this.commonAnodeLed) {
            this.commonAnodeLed.render(rgbColor);
        } else {
            logger.warn('attempted to render on an uninitialized Common Anode LED');
        }
    }

    async renderLEDNeopixel(hexColor: string): Promise<void> {
        if (this.neopixelLed) {
            await this.neopixelLed.render(hexColor);
        } else {
            logger.warn('attempted to render on an uninitialized Neopixel LED');
        }
    }

    renderServoPosition(position: ServoPosition): void {
        if (this.servo) {
            this.servo.setPosition(position);
        } else {
            logger.warn('attempted to render on an uninitialized servo');
        }
    }
}

export default RPi5Driver;
