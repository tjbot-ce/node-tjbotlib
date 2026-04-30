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
 * NeoPixel root helper process.
 *
 * This process is launched as root (via sudo) by LEDNeopixel to gain access to
 * rpi-ws281x-native, which requires root privileges on RPi 3/4.
 *
 * Protocol: newline-delimited JSON on stdin/stdout.
 *   Requests:
 *     { id, cmd: "init",     pin, numLeds }
 *     { id, cmd: "render",   color }        -- color is a 32-bit integer (0xRRGGBB)
 *     { id, cmd: "reset"  }
 *     { id, cmd: "shutdown" }
 *   Responses:
 *     { id, ok: true }
 *     { id, ok: false, error: "<message>" }
 *
 * stderr is for human-readable diagnostics only and does not affect the protocol.
 */

import { createRequire } from 'module';

// rpi-ws281x-native is a native CJS addon; load it via createRequire so this
// file can remain an ES module (.js with "type":"module" in package.json).
const require = createRequire(import.meta.url);
const ws281x = require('rpi-ws281x-native');

const LED_DMA = 10;
const LED_FREQ_HZ = 800000;
const LED_BRIGHTNESS = 255;
const LED_INVERT = false;
const LED_STRIP_TYPE = ws281x.stripType.WS2812;

let initialized = false;
let channel;

/**
 * Reply with a structured JSON response on stdout.
 * @param {number|string} id
 * @param {boolean} ok
 * @param {string|undefined} error
 */
function reply(id, ok, error) {
    const msg = ok ? { id, ok: true } : { id, ok: false, error: String(error ?? 'unknown error') };
    process.stdout.write(JSON.stringify(msg) + '\n');
}

/**
 * Handle a single parsed command object.
 * @param {{ id: number|string, cmd: string, pin?: number, numLeds?: number, color?: number }} req
 */
function handle(req) {
    const { id, cmd } = req;

    try {
        switch (cmd) {
            case 'init': {
                const pin = Number(req.pin);
                const numLeds = Number(req.numLeds ?? 1);
                if (!Number.isInteger(pin) || pin < 0 || pin > 40) {
                    reply(id, false, `invalid pin: ${req.pin}`);
                    return;
                }
                channel = ws281x(numLeds, {
                    gpio: pin,
                    dma: LED_DMA,
                    freq: LED_FREQ_HZ,
                    invert: LED_INVERT,
                    brightness: LED_BRIGHTNESS,
                    stripType: LED_STRIP_TYPE,
                });
                initialized = true;
                reply(id, true);
                break;
            }

            case 'render': {
                if (!initialized) {
                    reply(id, false, 'not initialized');
                    return;
                }
                const color = Number(req.color);
                if (!Number.isInteger(color) || color < 0 || color > 0xffffff) {
                    reply(id, false, `invalid color: ${req.color}`);
                    return;
                }
                channel.array[0] = color;
                ws281x.render();
                reply(id, true);
                break;
            }

            case 'reset': {
                if (initialized) {
                    ws281x.reset();
                }
                reply(id, true);
                break;
            }

            case 'shutdown': {
                if (initialized) {
                    ws281x.reset();
                    ws281x.finalize();
                    initialized = false;
                    channel = undefined;
                }
                reply(id, true);
                // Give stdout a chance to flush before exiting.
                process.stdout.once('drain', () => process.exit(0));
                // Force exit if drain takes too long (e.g. pipe already closed).
                setTimeout(() => process.exit(0), 200).unref();
                break;
            }

            default:
                reply(id, false, `unknown command: ${cmd}`);
        }
    } catch (err) {
        reply(id, false, String(err));
    }
}

// --- Stdin line reader ---
let buffer = '';

process.stdin.setEncoding('utf8');

process.stdin.on('data', (chunk) => {
    buffer += chunk;
    let newline;
    while ((newline = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, newline).trim();
        buffer = buffer.slice(newline + 1);
        if (!line) continue;
        try {
            const req = JSON.parse(line);
            handle(req);
        } catch (_) {
            // Malformed JSON — no id to reply to, so silently ignore.
        }
    }
});

process.stdin.on('end', () => {
    // Parent closed the pipe — clean up and exit.
    if (initialized) {
        try {
            ws281x.reset();
            ws281x.finalize();
        } catch (_) {
            /* best effort */
        }
    }
    process.exit(0);
});

// Ensure the helper does not keep a stale process alive if the parent dies.
process.on('SIGTERM', () => {
    if (initialized) {
        try {
            ws281x.reset();
            ws281x.finalize();
        } catch (_) {
            /* best effort */
        }
    }
    process.exit(0);
});
