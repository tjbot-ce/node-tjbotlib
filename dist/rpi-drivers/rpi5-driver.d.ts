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
import { ServoPosition } from '../servo/index.js';
import { RPiBaseHardwareDriver } from './rpi-driver.js';
import { ShineConfig, WaveConfig } from '../config/index.js';
declare class RPi5Driver extends RPiBaseHardwareDriver {
    private commonAnodeLed;
    private neopixelLed;
    private servo;
    constructor();
    setupLEDCommonAnode(config: ShineConfig['commonanode']): void;
    setupLEDNeopixel(config: ShineConfig['neopixel']): void;
    setupServo(config: WaveConfig): void;
    renderLEDCommonAnode(rgbColor: [number, number, number]): void;
    renderLEDNeopixel(hexColor: string): Promise<void>;
    renderServoPosition(position: ServoPosition): void;
}
export default RPi5Driver;
