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
import { spawn, spawnSync } from 'child_process';
import { createInterface } from 'readline';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { TJBotError } from '../utils/errors.js';
import { getLogger } from '../utils/logging.js';
const logger = getLogger(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
/** Absolute path to the root helper script (plain JS so it runs under raw node). */
const HELPER_PATH = join(__dirname, 'led-neopixel-ws281x.js');
/**
 * LED controller for NeoPixel (WS281x) LEDs on Raspberry Pi 3/4.
 *
 * rpi-ws281x-native requires root privileges. Rather than launching every
 * TJBot recipe that uses the LED as root, this class spawns a small, long-lived
 * helper process (in led-neopixel-ws281x.js) using sudo and communicates with it
 * over a newline-delimited JSON IPC channel on stdin/stdout.
 *
 * Sudo authentication is performed once at construction time (either
 * passwordless or via an interactive prompt). Subsequent render() calls are
 * cheap IPC messages with no additional privilege escalation.
 */
export class LEDNeopixel {
    helper;
    reader;
    helperStderrTail = [];
    _ready;
    _pendingById = new Map();
    _nextId = 1;
    _helperDead = null;
    constructor(pin) {
        const isRoot = process.getuid?.() === 0;
        let spawnCmd;
        let spawnArgs;
        if (isRoot) {
            // Already root — run the helper directly, no sudo needed.
            spawnCmd = process.execPath;
            spawnArgs = [HELPER_PATH];
        }
        else {
            // Test whether passwordless sudo is available.
            const probe = spawnSync('sudo', ['-n', 'true'], { stdio: 'pipe' });
            if (probe.status !== 0) {
                // Password is required. Print a clear rationale before prompting.
                console.log('\nThe NeoPixel LED on Raspberry Pi 3/4 requires elevated hardware access.\n' +
                    'TJBot will now request sudo authentication to launch a dedicated LED\n' +
                    'helper process. This is a one-time authentication per session.\n');
                const auth = spawnSync('sudo', ['-v'], { stdio: 'inherit' });
                if (auth.status !== 0) {
                    throw new TJBotError('sudo authentication failed. The NeoPixel LED requires root privileges on Raspberry Pi 3/4. ' +
                        'Enable passwordless sudo for this command or run `sudo -v` before starting TJBot.');
                }
            }
            // Credentials are now cached; use -n so the helper spawn never blocks.
            spawnCmd = 'sudo';
            spawnArgs = ['-n', process.execPath, HELPER_PATH];
        }
        logger.verbose(`Spawning NeoPixel helper: ${spawnCmd} ${spawnArgs.join(' ')}`);
        this.helper = spawn(spawnCmd, spawnArgs, {
            stdio: ['pipe', 'pipe', 'pipe'],
        });
        if (!this.helper.stdout) {
            throw new TJBotError('NeoPixel helper process stdout is not available.');
        }
        // Line-based JSON reader on helper stdout.
        this.reader = createInterface({ input: this.helper.stdout });
        this.reader.on('line', (line) => this._handleLine(line));
        if (this.helper.stderr) {
            this.helper.stderr.setEncoding('utf8');
            this.helper.stderr.on('data', (chunk) => {
                process.stderr.write(chunk);
                const lines = chunk.split(/\r?\n/).filter((line) => line.trim().length > 0);
                if (lines.length > 0) {
                    this.helperStderrTail.push(...lines);
                    if (this.helperStderrTail.length > 8) {
                        this.helperStderrTail = this.helperStderrTail.slice(-8);
                    }
                }
            });
        }
        this.helper.on('exit', (code, signal) => {
            const stderrSummary = this.helperStderrTail.length > 0 ? `; stderr: ${this.helperStderrTail.join(' | ')}` : '';
            this._helperDead = new TJBotError(`NeoPixel helper exited unexpectedly (code=${code}, signal=${signal}${stderrSummary})`);
            for (const [, pending] of this._pendingById) {
                clearTimeout(pending.timer);
                pending.reject(this._helperDead);
            }
            this._pendingById.clear();
            logger.error(`NeoPixel helper exited (code=${code}, signal=${signal})`);
        });
        // Send the init command; store the promise so render() can await readiness.
        this._ready = this._send({ cmd: 'init', pin, numLeds: 1 }, 10_000);
        this._ready
            .then(() => {
            logger.verbose(`NeoPixel helper ready on pin ${pin}`);
            this._setHelperHandleRefState(false);
        })
            .catch(() => {
            this._setHelperHandleRefState(false);
        });
        // Tear down the helper when the parent process exits (covers normal exit,
        // SIGINT, and SIGTERM). The helper's own stdin-close handler calls
        // ws281x.reset() so the LED is turned off cleanly.
        process.on('exit', () => this._killHelper());
    }
    /**
     * Wait for the NeoPixel helper to be fully initialized and ready.
     * Call this before loading long-running tasks if the LED needs to be available early.
     */
    async initialize() {
        await this._ready;
    }
    /**
     * Render the NeoPixel to a specific color.
     * @param color Color as a 32-bit integer in RGB format (0xRRGGBB)
     */
    async render(color) {
        logger.debug(`Rendering NeoPixel LED (IPC) with color: ${color}`);
        await this._ready;
        await this._send({ cmd: 'render', color }, 2_000);
    }
    /**
     * Send a reset command and terminate the helper process.
     */
    async cleanup() {
        logger.debug('LEDNeopixel cleanup');
        if (this._helperDead)
            return;
        try {
            await this._send({ cmd: 'shutdown' }, 2_000);
        }
        finally {
            this._killHelper();
        }
    }
    // ── Private helpers ───────────────────────────────────────────────────────
    _handleLine(line) {
        let msg;
        try {
            msg = JSON.parse(line);
        }
        catch {
            logger.warn(`NeoPixel helper sent unparseable response: ${line}`);
            return;
        }
        const pending = this._pendingById.get(msg.id);
        if (!pending) {
            logger.warn(`NeoPixel helper sent response for unknown id: ${msg.id}`);
            return;
        }
        this._pendingById.delete(msg.id);
        clearTimeout(pending.timer);
        if (this._pendingById.size === 0) {
            this._setHelperHandleRefState(false);
        }
        if (msg.ok) {
            pending.resolve();
        }
        else {
            pending.reject(new TJBotError(`NeoPixel helper error: ${msg.error ?? 'unknown'}`));
        }
    }
    _send(payload, timeoutMs) {
        if (this._helperDead) {
            return Promise.reject(this._helperDead);
        }
        return new Promise((resolve, reject) => {
            const id = this._nextId++;
            this._setHelperHandleRefState(true);
            const timer = setTimeout(() => {
                this._pendingById.delete(id);
                if (this._pendingById.size === 0) {
                    this._setHelperHandleRefState(false);
                }
                reject(new TJBotError(`NeoPixel helper timed out waiting for response to '${payload.cmd}' (${timeoutMs}ms)`));
            }, timeoutMs);
            timer.unref();
            this._pendingById.set(id, { resolve, reject, timer });
            this.helper.stdin?.write(JSON.stringify({ ...payload, id }) + '\n');
        });
    }
    _setHelperHandleRefState(referenced) {
        const maybeRefUnref = (handle) => {
            if (!handle || typeof handle !== 'object')
                return;
            const h = handle;
            if (referenced) {
                h.ref?.();
            }
            else {
                h.unref?.();
            }
        };
        if (referenced) {
            this.helper.ref();
        }
        else {
            this.helper.unref();
        }
        maybeRefUnref(this.helper.stdin);
        maybeRefUnref(this.helper.stdout);
        maybeRefUnref(this.helper.stderr);
    }
    _killHelper() {
        if (this.helper && !this.helper.killed) {
            try {
                this.reader?.close();
                this.reader = undefined;
                this.helper.stdin?.end();
            }
            catch {
                /* best effort */
            }
            this.helper.kill('SIGTERM');
        }
    }
}
//# sourceMappingURL=led-neopixel.js.map