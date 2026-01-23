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
import winston from 'winston';
import { TJBotError } from '../utils/errors.js';
/**
 * LED controller for SPI-based NeoPixel LEDs (Raspberry Pi 5)
 * This is based on pi5neo.py:
 * https://github.com/vanshksingh/Pi5Neo/blob/main/pi5neo/pi5neo.py
 */
export class LEDNeopixelSPI {
    constructor(spiInterface, useGRB = false) {
        const i = spiInterface || '/dev/spidev0.0';
        this.spi = SPI.initialize(i);
        this.spi.clockSpeed(LEDNeopixelSPI.FREQ);
        this.useGRBFormat = useGRB;
    }
    static bitMask(byte, index) {
        return (byte & (1 << (7 - index))) !== 0;
    }
    static byteToBitstream(byte) {
        // Initialize with low bits
        const bitstream = Array(8).fill(LEDNeopixelSPI.LOW);
        for (let i = 0; i < 8; i++) {
            if (LEDNeopixelSPI.bitMask(byte, i)) {
                // Set high bits for '1'
                bitstream[i] = LEDNeopixelSPI.HIGH;
            }
        }
        return bitstream;
    }
    static rgbToSpiBitstream(red, green, blue, useGRB) {
        const red_bits = LEDNeopixelSPI.byteToBitstream(red);
        const green_bits = LEDNeopixelSPI.byteToBitstream(green);
        const blue_bits = LEDNeopixelSPI.byteToBitstream(blue);
        const bitstream = useGRB
            ? Buffer.from(green_bits.concat(red_bits).concat(blue_bits))
            : Buffer.from(red_bits.concat(green_bits).concat(blue_bits));
        return bitstream;
    }
    /**
     * Render the LED to a specified color.
     * @param color The color to render, specified as a string of hexadecimal digits
     * with no leading '0x' or '#' in RRGGBB format.
     * @returns A promise that resolves when the SPI transfer completes.
     */
    async render(color) {
        // Debug output for color value
        winston.debug(`LEDNeopixelSPI.render called with color: ${color}`);
        try {
            winston.debug(`LEDNeopixelSPI.render typeof color: ${typeof color} value: ${color}`);
            const c = parseInt(color, 16);
            const r = (c & 0xff0000) >> 16;
            const g = (c & 0x00ff00) >> 8;
            const b = (c & 0x0000ff) >> 0;
            const bitstream = LEDNeopixelSPI.rgbToSpiBitstream(r, g, b, this.useGRBFormat);
            // Transfer data via SPI to update the LED
            // Wait for the transfer to complete before returning
            winston.debug('LEDNeopixelSPI.render about to call spi.transfer');
            await new Promise((resolve, reject) => {
                this.spi.transfer(bitstream, (err) => {
                    if (err) {
                        winston.error('SPI transfer error:', err);
                        reject(new TJBotError('SPI transfer failed', { cause: err }));
                    }
                    else {
                        winston.debug('LEDNeopixelSPI.render spi.transfer success');
                        resolve();
                    }
                });
            });
            winston.debug('LEDNeopixelSPI.render completed normally');
        }
        catch (e) {
            winston.error('Exception in LEDNeopixelSPI.render:', e);
            // Print stack trace if available
            if (e instanceof Error && e.stack) {
                winston.error(e.stack);
            }
            throw e;
        }
    }
    /**
     * Clean up resources
     */
    cleanup() {
        // SPI cleanup is handled by the library
    }
}
LEDNeopixelSPI.HIGH = 0xf8; // possibles: F0, F8, FC
LEDNeopixelSPI.LOW = 0xc0; // possibles: C0
LEDNeopixelSPI.FREQ = 6400000; // possibles: 3200000, 6400000; pi5neo uses: spi_speed_khz (800) * 1024 * 8  = 6553600
//# sourceMappingURL=led-neopixel-spi.js.map