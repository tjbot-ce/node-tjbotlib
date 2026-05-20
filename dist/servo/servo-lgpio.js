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
import { createRequire } from 'module';
import { LogEmoji } from '../utils/logging.js';
import { TJBotError } from '../utils/errors.js';
import { MAX_PULSE_MS, MID_PULSE_MS, MIN_PULSE_MS } from './servo-constants.js';
const EMO = LogEmoji.SERVO;
const require = createRequire(import.meta.url);
// lgpio is published as CommonJS; createRequire avoids ESM namespace interop issues.
const lgpio = require('lgpio');
/**
 * Servo controller using lgpio on Raspberry Pi GPIO character devices
 */
export class LGPIOServoController {
    chipNumber;
    pin;
    freq;
    chipHandle;
    claimed = false;
    currentPulseMs;
    running;
    autoStopTimer;
    autoStopDelayMs;
    /**
     * Create a LGPIOServoController instance
     * @param chipNumber GPIO chip number (usually 0)
     * @param pin GPIO pin number (BCM)
     * @param freq PWM frequency in Hz (default 50 for standard servos)
     */
    constructor(chipNumber, pin, freq = 50, autoStopDelayMs = 2000) {
        this.chipNumber = chipNumber;
        this.pin = pin;
        this.freq = freq;
        this.currentPulseMs = MID_PULSE_MS;
        this.running = false;
        this.autoStopDelayMs = autoStopDelayMs;
        winston.debug(`${EMO} LGPIOServoController initialized with config:
            chip: ${chipNumber}
            pin: ${pin}
            frequency: ${freq} Hz`);
    }
    /**
     * Set the servo to a specific position.
     * @param position Servo position in microseconds (500-2500 for standard servos)
     */
    setPosition(position) {
        const pulseMs = position / 1000;
        winston.verbose(`${EMO} setting servo position to ${position} μs (${pulseMs} ms)`);
        this.setPulseWidth(pulseMs);
    }
    ensureStarted() {
        if (this.running)
            return;
        winston.debug(`${EMO} starting LGPIOServoController`);
        const handle = lgpio.gpiochipOpen(this.chipNumber);
        lgpio.gpioClaimOutput(handle, this.pin);
        this.chipHandle = handle;
        this.claimed = true;
        this.running = true;
    }
    setServoPulse(pulseMs) {
        if (this.chipHandle === undefined) {
            throw new TJBotError('Servo GPIO is not initialized');
        }
        winston.debug(`${EMO} setting servo pulse: ${pulseMs.toFixed(2)} ms`);
        const periodMs = 1000 / this.freq;
        const dutyCycle = Math.max(0, Math.min(100, (pulseMs / periodMs) * 100));
        // 0 cycles means continuous output until changed.
        lgpio.txPwm(this.chipHandle, this.pin, this.freq, dutyCycle, 0, 0);
    }
    /**
     * Start the servo controller worker
     */
    start() {
        try {
            this.ensureStarted();
            this.setServoPulse(this.currentPulseMs);
        }
        catch (err) {
            winston.error(`${EMO} ServoController failed to start:`, err);
            throw err;
        }
    }
    /**
     * Stop the servo controller and clean up resources
     */
    async stop() {
        winston.debug(`${EMO} stopping LGPIOServoController`);
        this.running = false;
        if (this.autoStopTimer) {
            clearTimeout(this.autoStopTimer);
            this.autoStopTimer = undefined;
        }
        if (this.claimed && this.chipHandle !== undefined) {
            try {
                lgpio.txPwm(this.chipHandle, this.pin, this.freq, 0, 0, 0);
                lgpio.gpioWrite(this.chipHandle, this.pin, false);
                lgpio.gpioFree(this.chipHandle, this.pin);
                lgpio.gpiochipClose(this.chipHandle);
            }
            catch (err) {
                winston.warn(`${EMO} ServoController cleanup warning:`, err);
            }
            finally {
                this.claimed = false;
                this.chipHandle = undefined;
            }
        }
    }
    /**
     * Set pulse width in milliseconds
     * Valid range is 0.5-2.5ms for standard servos
     * @param pulseMs Pulse width in milliseconds
     */
    setPulseWidth(pulseMs) {
        this.currentPulseMs = Math.max(MIN_PULSE_MS, Math.min(MAX_PULSE_MS, pulseMs));
        this.ensureStarted();
        this.setServoPulse(this.currentPulseMs);
        // Reset auto-stop timer
        if (this.autoStopTimer) {
            clearTimeout(this.autoStopTimer);
        }
        this.autoStopTimer = setTimeout(() => {
            winston.debug(`${EMO} ServoController auto-stopping after inactivity`);
            this.stop();
        }, this.autoStopDelayMs);
    }
    /**
     * Set servo angle (0-180 degrees)
     * 0° = 0.5ms pulse, 90° = 1.5ms pulse, 180° = 2.5ms pulse
     * @param angle Angle in degrees (0-180)
     */
    setAngle(angle) {
        angle = Math.max(0, Math.min(180, angle));
        const pulse = MIN_PULSE_MS + (angle / 180.0) * (MAX_PULSE_MS - MIN_PULSE_MS);
        this.setPulseWidth(pulse);
    }
    /**
     * Get the current pulse width
     */
    getPulseWidth() {
        return this.currentPulseMs;
    }
    /**
     * Get the current angle (approximately)
     */
    getAngle() {
        return Math.round(((this.currentPulseMs - MIN_PULSE_MS) / (MAX_PULSE_MS - MIN_PULSE_MS)) * 180);
    }
    /**
     * Check if the controller is running
     */
    isRunning() {
        return this.running;
    }
    /**
     * Cleanup and stop the controller
     */
    async cleanup() {
        winston.debug(`${EMO} LGPIOServoController cleanup`);
        await this.stop();
    }
}
//# sourceMappingURL=servo-lgpio.js.map