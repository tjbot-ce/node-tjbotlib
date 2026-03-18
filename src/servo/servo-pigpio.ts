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
import { ServoPosition } from './servo-constants.js';
import { LogEmoji } from '../utils/logging.js';
import winston from 'winston';

const EMO = LogEmoji.SERVO;

const require = createRequire(import.meta.url);

interface PigpioServo {
    servoWrite(position: number): void;
    digitalWrite(level: number): void;
}

interface PigpioGpioClass {
    OUTPUT: number;
    new (pin: number, options: { mode: number }): PigpioServo;
}

let pigpioGpioClass: PigpioGpioClass | undefined;

function getPigpioGpioClass(): PigpioGpioClass {
    if (!pigpioGpioClass) {
        pigpioGpioClass = (require('pigpio') as { Gpio: PigpioGpioClass }).Gpio;
    }
    return pigpioGpioClass;
}

/**
 * Servo controller using pigpio GPIO library
 * Used on Raspberry Pi 3 and 4
 */
export class PiGPIOServoController {
    private servo: PigpioServo | undefined;

    constructor(pin: number) {
        const Gpio = getPigpioGpioClass();
        this.servo = new Gpio(pin, { mode: Gpio.OUTPUT });
        winston.debug(`${EMO} Initialized PiGPIOServoController on pin ${pin}`);
    }

    /**
     * Set the servo to a specific position
     * @param position Servo position in microseconds (500-2500 for standard servos)
     */
    setPosition(position: ServoPosition): void {
        if (this.servo) {
            this.servo.servoWrite(position);
        }
    }

    /**
     * Get the servo instance (for direct access if needed)
     */
    getServo(): PigpioServo | undefined {
        return this.servo;
    }

    /**
     * Clean up resources
     */
    cleanup(): void {
        if (this.servo) {
            this.servo.digitalWrite(0);
        }
    }
}
