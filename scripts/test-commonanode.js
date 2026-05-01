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
 * Minimal direct Common Anode LED test.
 *
 * This bypasses TJBot and drives a Common Anode RGB LED directly using lgpio.
 * Common Anode LEDs are inverted: output LOW is fully ON, HIGH is fully OFF.
 *
 * Usage:
 *   sudo node scripts/test-commonanode.js [redPin] [greenPin] [bluePin]
 *
 * Examples:
 *   sudo node scripts/test-commonanode.js
 *   sudo node scripts/test-commonanode.js 19 13 12
 *
 * Default pins match the TJBot Common Anode defaults:
 *   redPin=19  (GPIO19 / Physical pin 35)
 *   greenPin=13 (GPIO13 / Physical pin 33)
 *   bluePin=12  (GPIO12 / Physical pin 32)
 */

import { createRequire } from 'module';
import { createInterface } from 'readline';

const require = createRequire(import.meta.url);

// ─── Parse pins ──────────────────────────────────────────────────────────────

function parsePin(value, name, defaultValue) {
    if (value === undefined) {
        return defaultValue;
    }
    const pin = Number.parseInt(value, 10);
    if (!Number.isInteger(pin) || pin < 0) {
        console.error(`Invalid ${name} pin: ${value}`);
        process.exit(1);
    }
    return pin;
}

// ─── Prompt helper ───────────────────────────────────────────────────────────

function prompt(rl, question) {
    return new Promise((resolve) => rl.question(question, resolve));
}

async function askPin(rl, name, defaultValue) {
    const answer = await prompt(rl, `  ${name} pin [default: ${defaultValue}]: `);
    const trimmed = answer.trim();
    if (trimmed === '') {
        return defaultValue;
    }
    const pin = Number.parseInt(trimmed, 10);
    if (!Number.isInteger(pin) || pin < 0) {
        console.error(`Invalid pin: ${trimmed}`);
        process.exit(1);
    }
    return pin;
}

// ─── Colors ──────────────────────────────────────────────────────────────────

const colors = [
    ['red',     [255,   0,   0]],
    ['green',   [  0, 255,   0]],
    ['blue',    [  0,   0, 255]],
    ['orange',  [255, 165,   0]],
    ['yellow',  [255, 255,   0]],
    ['purple',  [128,   0, 128]],
    ['white',   [255, 255, 255]],
    ['off',     [  0,   0,   0]],
];

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
    let redPin, greenPin, bluePin;

    if (process.argv[2] !== undefined || process.argv[3] !== undefined || process.argv[4] !== undefined) {
        // Pins provided on command line
        redPin   = parsePin(process.argv[2], 'red',   19);
        greenPin = parsePin(process.argv[3], 'green', 13);
        bluePin  = parsePin(process.argv[4], 'blue',  12);
    } else {
        // Interactive prompt
        console.log('Common Anode LED pin configuration (press Enter to accept defaults):');
        const rl = createInterface({ input: process.stdin, output: process.stdout });
        redPin   = await askPin(rl, 'Red',   19);
        greenPin = await askPin(rl, 'Green', 13);
        bluePin  = await askPin(rl, 'Blue',  12);
        rl.close();
    }

    console.log(`\nUsing pins: R=${redPin}  G=${greenPin}  B=${bluePin}`);

    // Check for root / lgpio availability
    if (process.getuid && process.getuid() !== 0) {
        console.warn('Warning: lgpio typically requires root. Try running with sudo.');
    }

    let lgpio;
    try {
        lgpio = require('lgpio');
    } catch (err) {
        console.error('Failed to load lgpio:', err.message);
        console.error('Make sure lgpio is installed: npm install lgpio');
        process.exit(1);
    }

    const chipHandle = lgpio.gpiochipOpen(0);
    lgpio.gpioClaimOutput(chipHandle, redPin);
    lgpio.gpioClaimOutput(chipHandle, greenPin);
    lgpio.gpioClaimOutput(chipHandle, bluePin);

    function render(r, g, b) {
        const redDutyCycle = ((255 - r) / 255) * 100;
        const greenDutyCycle = ((255 - g) / 255) * 100;
        const blueDutyCycle = ((255 - b) / 255) * 100;

        lgpio.txPwm(chipHandle, redPin, 800, redDutyCycle, 0, 0);
        lgpio.txPwm(chipHandle, greenPin, 800, greenDutyCycle, 0, 0);
        lgpio.txPwm(chipHandle, bluePin, 800, blueDutyCycle, 0, 0);
    }

    function cleanup() {
        try {
            render(0, 0, 0);
            lgpio.gpioFree(chipHandle, redPin);
            lgpio.gpioFree(chipHandle, greenPin);
            lgpio.gpioFree(chipHandle, bluePin);
        } finally {
            lgpio.gpiochipClose(chipHandle);
        }
    }

    process.on('SIGINT', () => {
        console.log('\nInterrupted, turning LED off...');
        cleanup();
        process.exit(0);
    });

    process.on('SIGTERM', () => {
        cleanup();
        process.exit(0);
    });

    try {
        for (const [name, [r, g, b]] of colors) {
            console.log(`Setting color: ${name}`);
            render(r, g, b);
            await sleep(2000);
        }
    } finally {
        cleanup();
    }

    console.log('Done.');
}

main().catch((err) => {
    console.error('Unexpected error:', err);
    process.exit(1);
});
