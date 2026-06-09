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
import { TJBotError } from '../utils/errors.js';
import { getLogger } from '../utils/logging.js';

const logger = getLogger(import.meta.url);

/**
 * LED controller for SPI-based NeoPixel LEDs (Raspberry Pi 5)
 * This is based on pi5neo.py:
 * https://github.com/vanshksingh/Pi5Neo/blob/main/pi5neo/pi5neo.py
 */
export class LEDNeopixelSPI {
    spi: SPI.SPI;
    useGRBFormat: boolean;
    private isPrimed: boolean;

    private static readonly HIGH: number = 0xf8; // possibles: F0, F8, FC
    private static readonly LOW: number = 0xc0; // possibles: C0
    private static readonly FREQ: number = 6400000;
    private static readonly RESET_BYTES: number = 100;
    private static readonly FRAME_REPEATS: number = 2;
    private static readonly PRIME_OFF_FRAMES: number = 6;
    private static readonly INTER_FRAME_DELAY_MS: number = 1;
    private static readonly PRIME_DELAY_MS: number = 2;

    private static isSPIEnabledFromConfig(configPath: string): boolean | null {
        if (!existsSync(configPath)) {
            return null;
        }

        try {
            const config = readFileSync(configPath, 'utf8');
            return /^\s*dtparam\s*=\s*spi\s*=\s*on\s*$/m.test(config);
        } catch {
            return null;
        }
    }

    private static assertSPIEnabled(spiInterface: string): void {
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

        throw new TJBotError(
            `SPI appears to be disabled or unavailable (missing ${spiInterface}). ` +
                'To enable SPI, edit /boot/firmware/config.txt and set dtparam=spi=on, then reboot your Raspberry Pi.'
        );
    }

    private static isSPIEnabledInFirmwareConfig(): boolean {
        try {
            const config = readFileSync('/boot/firmware/config.txt', 'utf8');
            return /^\s*dtparam\s*=\s*spi\s*=\s*on\s*$/m.test(config);
        } catch {
            return true;
        }
    }

    private static isGpio10MuxedForSPI(): boolean {
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
        } catch {
            return true;
        }
    }

    private static assertSPIPreconditions(spiInterface: string): void {
        LEDNeopixelSPI.assertSPIEnabled(spiInterface);

        if (!LEDNeopixelSPI.isSPIEnabledInFirmwareConfig()) {
            throw new TJBotError(
                'SPI appears disabled in /boot/firmware/config.txt (dtparam=spi=on not set). ' +
                    'Enable SPI in /boot/firmware/config.txt, reboot, then retry.'
            );
        }

        if (!LEDNeopixelSPI.isGpio10MuxedForSPI()) {
            throw new TJBotError(
                'GPIO10 is not currently muxed for SPI (pinctrl reports none). ' +
                    'Enable SPI in /boot/firmware/config.txt (dtparam=spi=on), reboot, then retry.'
            );
        }
    }

    constructor(spiInterface: string, useGRB: boolean = false) {
        const i = spiInterface || '/dev/spidev0.0';
        LEDNeopixelSPI.assertSPIPreconditions(i);
        this.spi = SPI.initialize(i);
        this.spi.clockSpeed(LEDNeopixelSPI.FREQ);
        (this.spi as SPI.SPI & { dataMode: (mode: number) => void }).dataMode(0);
        (this.spi as SPI.SPI & { bitOrder: (order: unknown) => void }).bitOrder(SPI.order.MSB_FIRST);
        this.useGRBFormat = useGRB;
        this.isPrimed = false;

        logger.verbose(`Initialized NeoPixel SPI LED on interface ${i} with GRB format: ${useGRB}`);
    }

    private static sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    private async primeLink(): Promise<void> {
        logger.debug('Priming NeoPixel SPI link with OFF frames');
        const offFrame = this.buildFramedBitstream('000000');
        for (let i = 0; i < LEDNeopixelSPI.PRIME_OFF_FRAMES; i++) {
            await this.transferFrame(offFrame);
            await LEDNeopixelSPI.sleep(LEDNeopixelSPI.PRIME_DELAY_MS);
        }
        logger.debug('NeoPixel SPI link prime complete');
    }

    private async transferFrame(bitstream: Buffer): Promise<void> {
        for (let i = 0; i < LEDNeopixelSPI.FRAME_REPEATS; i++) {
            await new Promise<void>((resolve, reject) => {
                this.spi.transfer(bitstream, (err) => {
                    if (err) {
                        logger.error('SPI transfer error:', err);
                        reject(new TJBotError('SPI transfer failed', { cause: err }));
                    } else {
                        logger.debug('LEDNeopixelSPI.render spi.transfer success');
                        resolve();
                    }
                });
            });
            await LEDNeopixelSPI.sleep(LEDNeopixelSPI.INTER_FRAME_DELAY_MS);
        }
    }

    private buildFramedBitstream(color: string): Buffer {
        const c = parseInt(color, 16);
        const r = (c & 0xff0000) >> 16;
        const g = (c & 0x00ff00) >> 8;
        const b = c & 0x0000ff;

        const colorFrame = LEDNeopixelSPI.rgbToSpiBitstream(r, g, b, this.useGRBFormat);
        const resetBuf = Buffer.alloc(LEDNeopixelSPI.RESET_BYTES, 0x00);
        return Buffer.concat([resetBuf, colorFrame, resetBuf]);
    }

    static bitMask(byte: number, index: number): boolean {
        return (byte & (1 << (7 - index))) !== 0;
    }

    static byteToBitstream(byte: number): number[] {
        // Initialize with low bits
        const bitstream: number[] = Array(8).fill(LEDNeopixelSPI.LOW);
        for (let i = 0; i < 8; i++) {
            if (LEDNeopixelSPI.bitMask(byte, i)) {
                // Set high bits for '1'
                bitstream[i] = LEDNeopixelSPI.HIGH;
            }
        }
        return bitstream;
    }

    static rgbToSpiBitstream(red: number, green: number, blue: number, useGRB: boolean): Buffer {
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
    async render(color: string): Promise<void> {
        logger.debug(`Rendering NeoPixel LED (SPI) with color: ${color}`);

        try {
            if (!this.isPrimed) {
                await this.primeLink();
                this.isPrimed = true;
            }

            const bitstream = this.buildFramedBitstream(color);

            // Transfer data via SPI to update the LED
            // Wait for the transfer to complete before returning
            logger.debug('LEDNeopixelSPI.render about to call spi.transfer');
            await this.transferFrame(bitstream);
            logger.debug('LEDNeopixelSPI.render completed normally');
        } catch (e) {
            logger.error('Exception in LEDNeopixelSPI.render:', e);
            // Print stack trace if available
            if (e instanceof Error && e.stack) {
                logger.error(e.stack);
            }
            throw e;
        }
    }

    /**
     * Clean up resources
     */
    cleanup(): void {
        logger.debug('LEDNeopixelSPI cleanup (no-op)');
    }
}
