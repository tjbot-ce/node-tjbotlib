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

import winston from 'winston';
import { parentPort } from 'worker_threads';

type Msg =
    | { cmd: 'start'; chip: number; pin: number; pulseMs: number; periodMs: number }
    | { cmd: 'update'; pulseMs: number }
    | { cmd: 'stop' };

class LibGPIOServoWorker {
    private running = false;
    private currentPulseMs = 1.5;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private line: any = null;

    private busyWaitNs(ns: bigint) {
        const start = process.hrtime.bigint();
        while (process.hrtime.bigint() - start < ns) {
            // spin
        }
    }

    async handleStart(chipNum: number, pin: number, pulseMs: number, periodMs: number) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let gpiod: any;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let chip: any;

        try {
            gpiod = await import('node-libgpiod');
            chip = new gpiod.Chip(chipNum);
            this.line = chip.getLine(pin);
            this.line.requestOutputMode();
        } catch (err) {
            parentPort?.postMessage({ error: `Failed to load node-libgpiod: ${err}` });
            return;
        }

        this.running = true;
        parentPort?.postMessage({ ready: true });

        try {
            while (this.running) {
                const periodStart = process.hrtime.bigint();

                // high
                this.line.setValue(1);
                this.busyWaitNs(BigInt(Math.floor(this.currentPulseMs * 1_000_000)));

                // low
                this.line.setValue(0);

                const elapsed = Number(process.hrtime.bigint() - periodStart) / 1_000_000;
                const remaining = periodMs - elapsed;
                if (remaining > 1) {
                    await new Promise((r) => setTimeout(r, Math.max(0, remaining - 0.5)));
                    const toWaitNs = BigInt(Math.floor((remaining - Math.max(0, remaining - 0.5)) * 1_000_000));
                    if (toWaitNs > 0) this.busyWaitNs(toWaitNs);
                } else if (remaining > 0) {
                    this.busyWaitNs(BigInt(Math.floor(remaining * 1_000_000)));
                }
            }
        } finally {
            this.cleanup();
        }

        parentPort?.postMessage({ stopped: true });
    }

    private cleanup() {
        if (this.line) {
            try {
                this.line.setValue(0);
                this.line.release();
            } catch (_e) {
                // ignore cleanup errors
            }
            this.line = null;
        }
    }

    async run() {
        parentPort?.on('message', async (msg: Msg) => {
            if (msg.cmd === 'start') {
                this.currentPulseMs = msg.pulseMs;
                try {
                    await this.handleStart(msg.chip, msg.pin, msg.pulseMs, msg.periodMs);
                } catch (e) {
                    parentPort?.postMessage({ error: String(e) });
                }
            } else if (msg.cmd === 'update') {
                this.currentPulseMs = msg.pulseMs;
            } else if (msg.cmd === 'stop') {
                this.running = false;
            }
        });
    }
}

// Start worker
const worker = new LibGPIOServoWorker();
await worker.run();

// Cleanup handler for process termination
const cleanup = () => {
    winston.debug('🧹 LibGPIOServoWorker cleaning up before exit');
    worker['cleanup']();
};

// Handle termination signals
process.on('SIGTERM', () => {
    cleanup();
    process.exit(0);
});

process.on('SIGINT', () => {
    cleanup();
    process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    parentPort?.postMessage({ error: `Uncaught exception: ${err.message}` });
    cleanup();
    process.exit(1);
});

// Handle process exit
process.on('exit', () => {
    cleanup();
});
