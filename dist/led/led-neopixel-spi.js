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
import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import SPI from 'pi-spi';
import winston from 'winston';
import { TJBotError } from '../utils/errors.js';
import { LogEmoji } from '../utils/logging.js';
const EMO = LogEmoji.LED;
/**
 * LED controller for SPI-based NeoPixel LEDs (Raspberry Pi 5)
 * This is based on pi5neo.py:
 * https://github.com/vanshksingh/Pi5Neo/blob/main/pi5neo/pi5neo.py
 */
export class LEDNeopixelSPI {
    spi;
    useGRBFormat;
    isPrimed;
    static HIGH = 0xf8; // possibles: F0, F8, FC
    static LOW = 0xc0; // possibles: C0
    static FREQ = 6400000;
    static RESET_BYTES = 100;
    static FRAME_REPEATS = 2;
    static PRIME_OFF_FRAMES = 6;
    static INTER_FRAME_DELAY_MS = 1;
    static PRIME_DELAY_MS = 2;
    static isSPIEnabledFromConfig(configPath) {
        if (!existsSync(configPath)) {
            return null;
        }
        try {
            const config = readFileSync(configPath, 'utf8');
            return /^\s*dtparam\s*=\s*spi\s*=\s*on\s*$/m.test(config);
        }
        catch {
            return null;
        }
    }
    static assertSPIEnabled(spiInterface) {
        const firmwareConfig = '/boot/firmware/config.txt';
        const legacyConfig = '/boot/config.txt';
        const fwEnabled = LEDNeopixelSPI.isSPIEnabledFromConfig(firmwareConfig);
        const legacyEnabled = LEDNeopixelSPI.isSPIEnabledFromConfig(legacyConfig);
        // If either known config explicitly enables SPI, accept.
        if (fwEnabled === true || legacyEnabled === true) {
            return;
        }
        // If a matching spidev node exists, SPI is effectively available.
        if (existsSync(spiInterface)) {
            return;
        }
        throw new TJBotError(`SPI appears to be disabled or unavailable (missing ${spiInterface}). ` +
            'To enable SPI, edit /boot/firmware/config.txt and set dtparam=spi=on, then reboot your Raspberry Pi.');
    }
    static isSPIEnabledInFirmwareConfig() {
        try {
            const config = readFileSync('/boot/firmware/config.txt', 'utf8');
            return /^\s*dtparam\s*=\s*spi\s*=\s*on\s*$/m.test(config);
        }
        catch {
            return true;
        }
    }
    static isGpio10MuxedForSPI() {
        try {
            const output = execSync('pinctrl get 10', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
            const lower = output.toLowerCase();
            if (lower.includes('= none')) {
                return false;
            }
            if (lower.includes('spi')) {
                return true;
            }
            // On Raspberry Pi 5, SPI0 MOSI on GPIO10 is often ALT3 (shown as a3).
            if (lower.includes(' a3 ') || lower.includes(' a3|') || lower.includes(' a3\t') || lower.includes(': a3')) {
                return true;
            }
            return true;
        }
        catch {
            return true;
        }
    }
    static assertSPIPreconditions(spiInterface) {
        LEDNeopixelSPI.assertSPIEnabled(spiInterface);
        if (!LEDNeopixelSPI.isSPIEnabledInFirmwareConfig()) {
            throw new TJBotError('SPI appears disabled in /boot/firmware/config.txt (dtparam=spi=on not set). ' +
                'Enable SPI in /boot/firmware/config.txt, reboot, then retry.');
        }
        if (!LEDNeopixelSPI.isGpio10MuxedForSPI()) {
            throw new TJBotError('GPIO10 is not currently muxed for SPI (pinctrl reports none). ' +
                'Enable SPI in /boot/firmware/config.txt (dtparam=spi=on), reboot, then retry.');
        }
    }
    constructor(spiInterface, useGRB = false) {
        const i = spiInterface || '/dev/spidev0.0';
        LEDNeopixelSPI.assertSPIPreconditions(i);
        this.spi = SPI.initialize(i);
        this.spi.clockSpeed(LEDNeopixelSPI.FREQ);
        this.spi.dataMode(0);
        this.spi.bitOrder(SPI.order.MSB_FIRST);
        this.useGRBFormat = useGRB;
        this.isPrimed = false;
        winston.verbose(`${EMO} Initialized NeoPixel SPI LED on interface ${i} with GRB format: ${useGRB}`);
    }
    static sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
    async primeLink() {
        winston.debug(`${EMO} Priming NeoPixel SPI link with OFF frames`);
        const offFrame = this.buildFramedBitstream('000000');
        for (let i = 0; i < LEDNeopixelSPI.PRIME_OFF_FRAMES; i++) {
            await this.transferFrame(offFrame);
            await LEDNeopixelSPI.sleep(LEDNeopixelSPI.PRIME_DELAY_MS);
        }
        winston.debug(`${EMO} NeoPixel SPI link prime complete`);
    }
    async transferFrame(bitstream) {
        for (let i = 0; i < LEDNeopixelSPI.FRAME_REPEATS; i++) {
            await new Promise((resolve, reject) => {
                this.spi.transfer(bitstream, (err) => {
                    if (err) {
                        winston.error(`${EMO} SPI transfer error:`, err);
                        reject(new TJBotError('SPI transfer failed', { cause: err }));
                    }
                    else {
                        winston.debug(`${EMO} LEDNeopixelSPI.render spi.transfer success`);
                        resolve();
                    }
                });
            });
            await LEDNeopixelSPI.sleep(LEDNeopixelSPI.INTER_FRAME_DELAY_MS);
        }
    }
    buildFramedBitstream(color) {
        const c = parseInt(color, 16);
        const r = (c & 0xff0000) >> 16;
        const g = (c & 0x00ff00) >> 8;
        const b = c & 0x0000ff;
        const colorFrame = LEDNeopixelSPI.rgbToSpiBitstream(r, g, b, this.useGRBFormat);
        const resetBuf = Buffer.alloc(LEDNeopixelSPI.RESET_BYTES, 0x00);
        return Buffer.concat([resetBuf, colorFrame, resetBuf]);
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
        winston.verbose(`${EMO} Rendering LED with color: ${color}`);
        try {
            if (!this.isPrimed) {
                await this.primeLink();
                this.isPrimed = true;
            }
            const bitstream = this.buildFramedBitstream(color);
            // Transfer data via SPI to update the LED
            // Wait for the transfer to complete before returning
            winston.debug(`${EMO} LEDNeopixelSPI.render about to call spi.transfer`);
            await this.transferFrame(bitstream);
            winston.debug(`${EMO} LEDNeopixelSPI.render completed normally`);
        }
        catch (e) {
            winston.error(`${EMO} Exception in LEDNeopixelSPI.render:`, e);
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
        winston.debug(`${EMO} LEDNeopixelSPI cleanup (no-op)`);
    }
}
//# sourceMappingURL=led-neopixel-spi.js.map