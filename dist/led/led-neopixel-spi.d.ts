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
import SPI from 'pi-spi';
/**
 * LED controller for SPI-based NeoPixel LEDs (Raspberry Pi 5)
 * This is based on pi5neo.py:
 * https://github.com/vanshksingh/Pi5Neo/blob/main/pi5neo/pi5neo.py
 */
export declare class LEDNeopixelSPI {
    spi: SPI.SPI;
    useGRBFormat: boolean;
    static readonly HIGH: number;
    static readonly LOW: number;
    static readonly FREQ: number;
    constructor(spiInterface: string, useGRB?: boolean);
    static bitMask(byte: number, index: number): boolean;
    static byteToBitstream(byte: number): number[];
    static rgbToSpiBitstream(red: number, green: number, blue: number, useGRB: boolean): Buffer;
    /**
     * Render the LED to a specified color.
     * @param color The color to render, specified as a string of hexadecimal digits
     * with no leading '0x' or '#' in RRGGBB format.
     * @returns A promise that resolves when the SPI transfer completes.
     */
    render(color: string): Promise<void>;
    /**
     * Clean up resources
     */
    cleanup(): void;
}
