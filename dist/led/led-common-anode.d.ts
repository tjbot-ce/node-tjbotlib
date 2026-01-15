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
import { Gpio } from 'pigpio';
/**
 * LED controller for Common Anode LEDs using GPIO pins with PWM
 */
export declare class LEDCommonAnode {
    redPin: Gpio;
    greenPin: Gpio;
    bluePin: Gpio;
    constructor(red: number, green: number, blue: number);
    /**
     * Render the LED to a specific RGB color.
     * Common Anode LEDs are inverted - 0 is ON, 255 is OFF
     * @param rgbColor RGB color as [red, green, blue] where each is 0-255
     */
    render(rgbColor: [number, number, number]): void;
    /**
     * Clean up resources
     */
    cleanup(): void;
}
