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

import { Worker } from 'worker_threads';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import winston from 'winston';

const MIN_PULSE_MS = 0.5;
const MID_PULSE_MS = 1.5;
const MAX_PULSE_MS = 2.5;

/**
 * Servo controller using libgpiod for Raspberry Pi 5
 * Uses a worker thread to manage PWM via GPIO character devices
 */
export class LibGPIOServoController {
    private chipNumber: number;
    private pin: number;
    private freq: number;
    private worker?: Worker;
    private currentPulseMs: number;
    private running: boolean;
    private autoStopTimer?: NodeJS.Timeout;
    private autoStopDelayMs: number;

    /**
     * Create a LibGPIOServoController instance
     * @param chipNumber GPIO chip number (usually 0)
     * @param pin GPIO pin number (BCM)
     * @param freq PWM frequency in Hz (default 50 for standard servos)
     */
    constructor(chipNumber: number, pin: number, freq = 50, autoStopDelayMs = 2000) {
        this.chipNumber = chipNumber;
        this.pin = pin;
        this.freq = freq;
        this.currentPulseMs = MID_PULSE_MS;
        this.running = false;
        this.autoStopDelayMs = autoStopDelayMs;
    }

    private resolveWorkerPath(): string {
        const baseDir = path.dirname(fileURLToPath(import.meta.url));
        // Worker might be in the same directory (src/servo/) or in dist
        const candidate1 = path.join(baseDir, 'servo-libgpio-worker.js');
        if (fs.existsSync(candidate1)) return candidate1;
        const candidate2 = path.join(path.dirname(baseDir), 'dist', 'servo', 'servo-libgpio-worker.js');
        if (fs.existsSync(candidate2)) return candidate2;
        return candidate1;
    }

    /**
     * Start the servo controller worker
     */
    start() {
        if (this.running) return;
        this.running = true;

        const workerPath = this.resolveWorkerPath();
        this.worker = new Worker(workerPath, { execArgv: [] });

        this.worker.on('message', (m) => {
            const msg = m as { error?: string; debug?: string };
            if (msg.error) {
                winston.error('ServoController worker error:', msg.error);
            }
            if (msg.debug) {
                winston.debug('ServoController worker:', msg.debug);
            }
        });

        this.worker.on('error', (err) => {
            winston.error('ServoController worker thread error:', err);
        });

        const periodMs = 1000 / this.freq;
        this.worker.postMessage({
            cmd: 'start',
            chip: this.chipNumber,
            pin: this.pin,
            pulseMs: this.currentPulseMs,
            periodMs,
        });
    }

    /**
     * Stop the servo controller and clean up resources
     */
    async stop() {
        this.running = false;
        if (this.autoStopTimer) {
            clearTimeout(this.autoStopTimer);
            this.autoStopTimer = undefined;
        }
        if (this.worker) {
            // Send stop command and wait for worker to clean up
            await new Promise<void>((resolve) => {
                const timeout = setTimeout(() => {
                    winston.warn('ServoController: Worker did not stop gracefully, forcing termination');
                    resolve();
                }, 1000);

                if (this.worker) {
                    this.worker.once('message', (m) => {
                        const msg = m as { stopped?: boolean };
                        if (msg.stopped) {
                            clearTimeout(timeout);
                            resolve();
                        }
                    });

                    this.worker.postMessage({ cmd: 'stop' });
                }
            });

            await this.worker.terminate();
            this.worker = undefined;
        }
    }

    /**
     * Set pulse width in milliseconds
     * Valid range is 0.5-2.5ms for standard servos
     * @param pulseMs Pulse width in milliseconds
     */
    setPulseWidth(pulseMs: number) {
        this.currentPulseMs = Math.max(MIN_PULSE_MS, Math.min(MAX_PULSE_MS, pulseMs));
        if (!this.running) {
            this.start();
        } else if (this.worker) {
            this.worker.postMessage({ cmd: 'update', pulseMs: this.currentPulseMs });
        }

        // Reset auto-stop timer
        if (this.autoStopTimer) {
            clearTimeout(this.autoStopTimer);
        }
        this.autoStopTimer = setTimeout(() => {
            winston.debug('ServoController: Auto-stopping after inactivity');
            this.stop();
        }, this.autoStopDelayMs);
    }

    /**
     * Set servo angle (0-180 degrees)
     * 0° = 0.5ms pulse, 90° = 1.5ms pulse, 180° = 2.5ms pulse
     * @param angle Angle in degrees (0-180)
     */
    setAngle(angle: number) {
        angle = Math.max(0, Math.min(180, angle));
        const pulse = MIN_PULSE_MS + (angle / 180.0) * (MAX_PULSE_MS - MIN_PULSE_MS);
        this.setPulseWidth(pulse);
    }

    /**
     * Get the current pulse width
     */
    getPulseWidth(): number {
        return this.currentPulseMs;
    }

    /**
     * Get the current angle (approximately)
     */
    getAngle(): number {
        return Math.round(((this.currentPulseMs - MIN_PULSE_MS) / (MAX_PULSE_MS - MIN_PULSE_MS)) * 180);
    }

    /**
     * Check if the controller is running
     */
    isRunning(): boolean {
        return this.running;
    }

    /**
     * Cleanup and stop the controller
     */
    async cleanup() {
        await this.stop();
    }
}
