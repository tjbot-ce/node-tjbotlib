#!/usr/bin/env node

/**
 * Minimal direct NeoPixel test for Raspberry Pi 3/4.
 *
 * This bypasses TJBot and the helper IPC entirely so we can determine whether
 * rpi-ws281x-native itself is able to drive the LED in the current Node.js
 * environment.
 *
 * Usage:
 *   sudo -E node scripts/test-neopixel-direct.js [gpioPin]
 *
 * Example:
 *   sudo -E node scripts/test-neopixel-direct.js 18
 */

import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const ws281x = require('rpi-ws281x-native');

const gpioPin = Number.parseInt(process.argv[2] ?? '18', 10);
const numLeds = 1;
const freq = 800000;
const dma = 10;
const invert = false;
const brightness = 255;
const stripType = ws281x.stripType.WS2812;

if (!Number.isInteger(gpioPin) || gpioPin < 0) {
    console.error(`Invalid GPIO pin: ${process.argv[2] ?? ''}`);
    process.exit(1);
}

console.log(`Initializing ws281x on GPIO ${gpioPin} (leds=${numLeds}, dma=${dma}, freq=${freq})`);

const channel = ws281x(numLeds, {
    gpio: gpioPin,
    dma,
    freq,
    invert,
    brightness,
    stripType,
});

const colors = [
    ['red', 0xff0000],
    ['green', 0x00ff00],
    ['blue', 0x0000ff],
    ['orange', 0xffa500],
    ['yellow', 0xffff00],
    ['purple', 0x800080],
    ['white', 0xffffff],
    ['off', 0x000000],
];

let finalized = false;

function finalize() {
    if (finalized) {
        return;
    }
    finalized = true;
    try {
        ws281x.reset();
        ws281x.finalize();
    } catch (err) {
        console.error('Failed to finalize ws281x:', err);
    }
}

process.on('SIGINT', () => {
    console.log('\nInterrupted, resetting LED...');
    finalize();
    process.exit(0);
});

process.on('SIGTERM', () => {
    finalize();
    process.exit(0);
});

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
    try {
        for (const [name, color] of colors) {
            console.log(`Setting color: ${name}`);
            channel.array[0] = color;
            ws281x.render();
            await sleep(2000);
        }
    } finally {
        finalize();
    }

    console.log('Done.');
}

main().catch((err) => {
    console.error('Direct NeoPixel test failed:', err);
    finalize();
    process.exit(1);
});