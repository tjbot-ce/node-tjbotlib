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
 *   node scripts/test-neopixel-spi.js [spiDevice] [rgb|grb|diag|hold <RRGGBB>] [--profile=f8|fc|f0|f8l80|fcl80]
 *
 * Examples:
 *   node scripts/test-neopixel-spi.js
 *   node scripts/test-neopixel-spi.js /dev/spidev0.0 grb
 *   node scripts/test-neopixel-spi.js /dev/spidev0.0 diag
 *   node scripts/test-neopixel-spi.js /dev/spidev0.0 hold FF0000
 *   node scripts/test-neopixel-spi.js hold FF0000 --profile=fc
 *   node scripts/test-neopixel-spi.js hold FF0000 --profile=f8l80
 */

import SPI from 'pi-spi';
import { existsSync, readFileSync } from 'fs';
import { execSync } from 'child_process';

const FREQ = 6400000;
const RESET_BYTES = 100;
const FRAME_REPEATS = 1;
const PRIME_OFF_FRAMES = 6;
const HOLD_DURATION_MS = 10000;

const SYMBOL_PROFILES = {
    f8: { high: 0xf8, low: 0xc0 },
    fc: { high: 0xfc, low: 0xc0 },
    f0: { high: 0xf0, low: 0xc0 },
    f8l80: { high: 0xf8, low: 0x80 },
    fcl80: { high: 0xfc, low: 0x80 },
};

const defaultSpiDevice = '/dev/spidev0.0';
const modes = new Set(['rgb', 'grb', 'diag', 'hold']);
const rawArgs = process.argv.slice(2);
const positionalArgs = [];
let profileArg = 'f8';

for (const arg of rawArgs) {
    if (arg.startsWith('--profile=')) {
        profileArg = arg.slice('--profile='.length).toLowerCase();
        continue;
    }
    positionalArgs.push(arg);
}

if (!Object.hasOwn(SYMBOL_PROFILES, profileArg)) {
    console.error(`Invalid profile: ${profileArg}. Use one of: ${Object.keys(SYMBOL_PROFILES).join(', ')}.`);
    process.exit(1);
}

const { high: HIGH, low: LOW } = SYMBOL_PROFILES[profileArg];

const firstArg = (positionalArgs[0] ?? '').toLowerCase();
const hasExplicitDevice = positionalArgs[0]?.startsWith('/dev/spidev') ?? false;
const spiDevice = hasExplicitDevice ? positionalArgs[0] : defaultSpiDevice;
const modeArg = (hasExplicitDevice ? positionalArgs[1] : positionalArgs[0] ?? 'rgb').toLowerCase();
const holdColorArg = hasExplicitDevice ? positionalArgs[2] : positionalArgs[1];
const useGRB = modeArg === 'grb';

if (firstArg !== '' && !hasExplicitDevice && !modes.has(firstArg)) {
    console.error(`Invalid argument: ${firstArg}. Use 'rgb', 'grb', 'diag', or 'hold <RRGGBB>'.`);
    process.exit(1);
}

if (!modes.has(modeArg)) {
    console.error(`Invalid mode: ${modeArg}. Use 'rgb', 'grb', 'diag', or 'hold <RRGGBB>'.`);
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

function transfer(spi, bitstream, verbose = true) {
    return new Promise((resolve, reject) => {
        if (verbose) {
            console.log(`  → transferring ${bitstream.length} bytes (full frame)`);
        }
        spi.transfer(bitstream, (err) => {
            if (err) {
                console.error(`  ✗ transfer error: ${err.message}`);
                reject(err);
                return;
            }
            if (verbose) {
                console.log('  ✓ transfer complete');
            }
            resolve();
        });
    });
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function render(spi, hexColor, options = {}) {
    const { verbose = true } = options;
    const { r, g, b } = hexToRgb(hexColor);
    const colorBuf = rgbToSpiBitstream(r, g, b, useGRB);
    // Send reset/latch pulses on both sides of the color frame as part of the
    // SAME SPI transfer.
    // - Prefix reset helps ensure the first color starts after a clean LOW.
    // - Suffix reset provides the WS2812 latch period after the color bits.
    // A separate transfer is avoided because inter-transfer idle behavior can
    // create a stray HIGH gap on MOSI and confuse the LED decoder.
    // WS2812 latches on ≥50µs LOW. We intentionally use a longer low window
    // to tolerate clone devices and timing jitter.
    const resetBuf = Buffer.alloc(RESET_BYTES, 0x00);
    const combined = Buffer.concat([resetBuf, colorBuf, resetBuf]);

    // Send the exact same frame twice.
    // On some setups the first decoded frame after idle can be unstable;
    // a second identical frame often makes the visible color deterministic.
    for (let i = 0; i < FRAME_REPEATS; i += 1) {
        if (verbose && FRAME_REPEATS > 1) {
            console.log(`  → frame pass ${i + 1}/${FRAME_REPEATS}`);
        }
        await transfer(spi, combined, verbose);
        await sleep(1);
    }
}

async function primeLink(spi) {
    console.log(`Priming link with ${PRIME_OFF_FRAMES} OFF frames...`);
    for (let i = 0; i < PRIME_OFF_FRAMES; i += 1) {
        await render(spi, '000000', { verbose: false });
        await sleep(2);
    }
    console.log('Prime complete.');
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
    await sleep(HOLD_DURATION_MS);

    console.log('LED off.');
    await render(spi, '000000');
}

async function main() {
    const diagMode = modeArg === 'diag';
    const holdMode = modeArg === 'hold';
    const orderLabel = useGRB ? 'grb' : 'rgb';
    const label = diagMode ? 'diag' : holdMode ? 'hold' : orderLabel;
    console.log(`Initializing SPI NeoPixel test on ${spiDevice} (mode=${label}, profile=${profileArg})`);

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
    spi.dataMode(0);
    spi.bitOrder(SPI.order.MSB_FIRST);

    await primeLink(spi);

    if (diagMode) {
        await runDiagnostic(spi);
        return;
    }

    if (holdMode) {
        const hexColor = (holdColorArg ?? 'FF0000').toUpperCase();
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
