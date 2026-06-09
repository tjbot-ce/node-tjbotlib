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
 * Minimal direct servo test using lgpio.
 *
 * This bypasses TJBot and drives a servo directly so we can verify whether
 * lgpio PWM is working in the current Node.js environment.
 *
 * Usage:
 *   sudo node scripts/test-servo.js [gpioPin]
 *
 * Example:
 *   sudo node scripts/test-servo.js 18
 */

import { createRequire } from 'module';
import { createInterface } from 'readline';

const require = createRequire(import.meta.url);

const chipNumber = 0;
const frequency = 50;

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

const positions = [
    ['back', 700],
    ['up', 1400],
    ['down', 2300],
    ['up', 1400],
];

function parsePin(value, defaultValue) {
    if (value === undefined) {
        return defaultValue;
    }
    const pin = Number.parseInt(value, 10);
    if (!Number.isInteger(pin) || pin < 0) {
        console.error(`Invalid GPIO pin: ${value}`);
        process.exit(1);
    }
    return pin;
}

function prompt(rl, question) {
    return new Promise((resolve) => rl.question(question, resolve));
}

async function askPin(rl, defaultValue) {
    const answer = await prompt(rl, `  GPIO pin [default: ${defaultValue}]: `);
    const trimmed = answer.trim();
    if (trimmed === '') {
        return defaultValue;
    }
    const pin = Number.parseInt(trimmed, 10);
    if (!Number.isInteger(pin) || pin < 0) {
        console.error(`Invalid GPIO pin: ${trimmed}`);
        process.exit(1);
    }
    return pin;
}

let chipHandle;
let claimed = false;
let cleanedUp = false;
let gpioPin;

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function setServoPosition(positionMicros) {
    const pulseMs = positionMicros / 1000;
    const periodMs = 1000 / frequency;
    const dutyCycle = Math.max(0, Math.min(100, (pulseMs / periodMs) * 100));
    lgpio.txPwm(chipHandle, gpioPin, frequency, dutyCycle, 0, 0);
}

function cleanup() {
    if (cleanedUp) {
        return;
    }
    cleanedUp = true;

    if (chipHandle === undefined) {
        return;
    }

    try {
        lgpio.txPwm(chipHandle, gpioPin, frequency, 0, 0, 0);
        lgpio.gpioWrite(chipHandle, gpioPin, false);
        if (claimed) {
            lgpio.gpioFree(chipHandle, gpioPin);
        }
    } catch (err) {
        console.error('Servo cleanup warning:', err.message ?? err);
    } finally {
        try {
            lgpio.gpiochipClose(chipHandle);
        } catch (err) {
            console.error('Failed to close gpio chip:', err.message ?? err);
        }
    }
}

process.on('SIGINT', () => {
    console.log('\nInterrupted, stopping servo PWM...');
    cleanup();
    process.exit(0);
});

process.on('SIGTERM', () => {
    cleanup();
    process.exit(0);
});

async function main() {
    if (process.argv[2] !== undefined) {
        gpioPin = parsePin(process.argv[2], 18);
    } else {
        console.log('Servo GPIO pin configuration (press Enter to accept default):');
        const rl = createInterface({ input: process.stdin, output: process.stdout });
        gpioPin = await askPin(rl, 18);
        rl.close();
    }

    console.log(`Initializing lgpio servo test on GPIO ${gpioPin} (chip=${chipNumber}, freq=${frequency}Hz)`);

    chipHandle = lgpio.gpiochipOpen(chipNumber);
    lgpio.gpioClaimOutput(chipHandle, gpioPin);
    claimed = true;

    try {
        for (const [name, positionMicros] of positions) {
            console.log(`Setting servo position: ${name} (${positionMicros}us)`);
            setServoPosition(positionMicros);
            await sleep(2000);
        }
    } finally {
        cleanup();
    }

    console.log('Done.');
}

main().catch((err) => {
    console.error('Direct servo test failed:', err);
    cleanup();
    process.exit(1);
});
