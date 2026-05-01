#!/usr/bin/env node

/**
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

/**
 * Minimal direct NeoPixel SPI test for Raspberry Pi 5.
 *
 * This bypasses TJBot and writes to the SPI bus directly using pi-spi.
 *
 * Usage:
 *   node scripts/test-neopixel-spi.js [spiDevice] [rgb|grb|diag|hold <RRGGBB>]
 *
 * Examples:
 *   node scripts/test-neopixel-spi.js
 *   node scripts/test-neopixel-spi.js /dev/spidev0.0 grb
 *   node scripts/test-neopixel-spi.js /dev/spidev0.0 diag
 *   node scripts/test-neopixel-spi.js /dev/spidev0.0 hold FF0000
 */

import SPI from 'pi-spi';
import { existsSync, readFileSync } from 'fs';
import { execSync } from 'child_process';

const HIGH = 0xf8;
const LOW = 0xc0;
const FREQ = 6553600;

const defaultSpiDevice = '/dev/spidev0.0';
const spiDevice = process.argv[2] ?? defaultSpiDevice;
const colorOrderArg = (process.argv[3] ?? 'rgb').toLowerCase();
const useGRB = colorOrderArg === 'grb';

if (colorOrderArg !== 'rgb' && colorOrderArg !== 'grb' && colorOrderArg !== 'diag' && colorOrderArg !== 'hold') {
    console.error(`Invalid argument: ${colorOrderArg}. Use 'rgb', 'grb', 'diag', or 'hold <RRGGBB>'.`);
    process.exit(1);
}

if (!existsSync(spiDevice)) {
    console.error(`SPI device not found: ${spiDevice}`);
    console.error('Check /dev/spidev* for available SPI devices.');
    process.exit(1);
}

function isSpiEnabledInConfig() {
    try {
        const config = readFileSync('/boot/firmware/config.txt', 'utf8');
        return /^\s*dtparam\s*=\s*spi\s*=\s*on\s*$/m.test(config);
    } catch {
        return true;
    }
}

function isGpio10MuxedForSpi() {
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

function bitMask(byte, index) {
    return (byte & (1 << (7 - index))) !== 0;
}

function byteToBitstream(byte) {
    const bitstream = Array(8).fill(LOW);
    for (let i = 0; i < 8; i += 1) {
        if (bitMask(byte, i)) {
            bitstream[i] = HIGH;
        }
    }
    return bitstream;
}

function rgbToSpiBitstream(red, green, blue, grbOrder) {
    const redBits = byteToBitstream(red);
    const greenBits = byteToBitstream(green);
    const blueBits = byteToBitstream(blue);

    if (grbOrder) {
        return Buffer.from([...greenBits, ...redBits, ...blueBits]);
    }
    return Buffer.from([...redBits, ...greenBits, ...blueBits]);
}

function hexToRgb(hex) {
    const value = Number.parseInt(hex.replace('#', ''), 16);
    return {
        r: (value >> 16) & 0xff,
        g: (value >> 8) & 0xff,
        b: value & 0xff,
    };
}

function transfer(spi, bitstream) {
    return new Promise((resolve, reject) => {
        console.log(`  → transferring ${bitstream.length} bytes (color data)`);
        spi.transfer(bitstream, (err) => {
            if (err) {
                console.error(`  ✗ transfer error: ${err.message}`);
                reject(err);
                return;
            }
            console.log('  ✓ transfer complete');
            resolve();
        });
    });
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function render(spi, hexColor) {
    const { r, g, b } = hexToRgb(hexColor);
    const colorBuf = rgbToSpiBitstream(r, g, b, useGRB);
    // Append reset/latch pulse as part of the SAME SPI transfer.
    // A second separate transfer causes a brief MOSI-HIGH idle gap between
    // the two calls, which the WS2812B interprets as the start of a new bit.
    // By combining into one buffer we guarantee a clean LOW after the color data.
    // WS2812 latches on ≥50µs LOW; 50 zero bytes at 6.5536 MHz ≈ 61µs LOW.
    const resetBuf = Buffer.alloc(50, 0x00);
    const combined = Buffer.concat([colorBuf, resetBuf]);
    await transfer(spi, combined);
    // 1 ms is more than enough settling time (latch threshold is 50 µs).
    await sleep(1);
}

// Diagnostic mode: sends pure R, G, B one at a time, 3 seconds each.
// Run with: node test-neopixel-spi.js [device] diag
// Then note what color the LED shows for each channel sent.
async function runDiagnostic(spi) {
    console.log('\n=== COLOR ORDER DIAGNOSTIC ===');
    console.log('The LED will display each channel in isolation for 3 seconds.');
    console.log('Note what color you actually see for each step.\n');

    const channels = [
        ['Channel R only (sending FF0000)', 'FF0000'],
        ['Channel G only (sending 00FF00)', '00FF00'],
        ['Channel B only (sending 0000FF)', '0000FF'],
    ];

    for (const [label, hex] of channels) {
        console.log(`→ ${label}`);
        await render(spi, hex);
        await sleep(3000);
    }

    console.log('\nLED off.');
    await render(spi, '000000');

    console.log('\nResults guide:');
    console.log('  If R=red,   G=green, B=blue  → use rgb  (no swap needed)');
    console.log('  If R=green, G=red,   B=blue  → use grb  (standard WS2812B)');
    console.log('  If R=blue,  G=green, B=red   → use bgr');
    console.log('  If R=blue,  G=red,   B=green → use brg');
    console.log('  If R=red,   G=blue,  B=green → use rbg');
    console.log('  If R=green, G=blue,  B=red   → use gbr');
    console.log('\nThen rerun with the correct order, e.g.:');
    console.log(`  node scripts/test-neopixel-spi.js ${spiDevice} grb\n`);
}

// Hold mode: renders a single color for 10 seconds so you can inspect the LED directly.
// Run with: node test-neopixel-spi.js [device] hold RRGGBB
async function runHold(spi, hexColor) {
    const label = hexColor || '000000';
    const order = useGRB ? 'grb' : 'rgb';
    console.log(`\nHolding color #${label} for 10 seconds (color order: ${order}).`);
    console.log('Look directly at the LED chip.\n');
    await render(spi, label);
    await sleep(10000);
    console.log('LED off.');
    await render(spi, '000000');
}

async function main() {
    const modeArg = (process.argv[3] ?? '').toLowerCase();
    const diagMode = modeArg === 'diag';
    const holdMode = modeArg === 'hold';
    const orderLabel = useGRB ? 'grb' : 'rgb';
    const label = diagMode ? 'diag' : holdMode ? 'hold' : orderLabel;
    console.log(`Initializing SPI NeoPixel test on ${spiDevice} (mode=${label})`);

    if (!isSpiEnabledInConfig()) {
        console.error('SPI appears disabled in /boot/firmware/config.txt (dtparam=spi=on not set).');
        console.error('Enable SPI in config.txt, reboot, then rerun this script.');
        process.exit(1);
    }

    if (!isGpio10MuxedForSpi()) {
        console.error('GPIO10 is not currently muxed for SPI (pinctrl reports none).');
        console.error('Enable SPI in /boot/firmware/config.txt (dtparam=spi=on), reboot, then rerun.');
        process.exit(1);
    }

    const spi = SPI.initialize(spiDevice);
    spi.clockSpeed(FREQ);

    if (diagMode) {
        await runDiagnostic(spi);
        return;
    }

    if (holdMode) {
        const hexColor = (process.argv[4] ?? 'FF0000').toUpperCase();
        await runHold(spi, hexColor);
        return;
    }

    // Standard color cycle — 3 seconds per color so it's easy to observe
    const colors = [
        ['red',    'FF0000'],
        ['green',  '00FF00'],
        ['blue',   '0000FF'],
        ['yellow', 'FFFF00'],
        ['white',  'FFFFFF'],
        ['off',    '000000'],
    ];

    try {
        for (const [name, hex] of colors) {
            console.log(`Setting color: ${name} (#${hex})`);
            await render(spi, hex);
            await sleep(3000);
        }
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`SPI test failed: ${message}`);
        process.exit(1);
    }

    console.log('Done.');
}

main().catch((err) => {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Unhandled error: ${message}`);
    process.exit(1);
});
