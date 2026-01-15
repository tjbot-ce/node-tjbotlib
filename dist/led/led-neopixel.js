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
import { spawn } from 'child_process';
/**
 * LED controller for NeoPixel (WS281x) LEDs
 * This uses the native pigpio library for ws281x support
 */
export class LEDNeopixel {
    constructor(pin) {
        // Check if running as root (required for rpi-ws281x-native)
        if (process.getuid && process.getuid() !== 0) {
            console.log('Use of the Neopixel LED requires root privileges. Re-executing recipe with sudo...');
            console.log(`→ sudo -E ${process.execPath} ${process.argv.slice(1).join(' ')}`);
            // Re-execute the script with sudo, preserving the environment
            const child = spawn('sudo', ['-E', process.execPath, ...process.argv.slice(1)], {
                stdio: 'inherit',
            });
            child.on('exit', (code) => {
                process.exit(code ?? 0);
            });
            // Prevent further execution in the non-root process
            throw new Error('Re-executing with sudo');
        }
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const ws281x = require('rpi-ws281x-native');
        this.neopixel = ws281x;
        this.neopixel.init(1, {
            pin,
        });
        // capture 'this' context so we can reference it in the callback
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const self = this;
        // reset the LED before the program exits
        process.on('SIGINT', () => {
            self.neopixel.reset();
            process.nextTick(() => {
                process.exit(0);
            });
        });
    }
    /**
     * Render the NeoPixel to a specific color
     * @param color Color as a 32-bit integer in RGB format (0xRRGGBB)
     */
    render(color) {
        const colors = new Uint32Array(1);
        colors[0] = color;
        this.neopixel.render(colors);
    }
    /**
     * Clean up resources
     */
    cleanup() {
        this.neopixel.reset();
    }
}
//# sourceMappingURL=led-neopixel.js.map