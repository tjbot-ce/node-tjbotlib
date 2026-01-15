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
/**
 * Servo controller using libgpiod for Raspberry Pi 5
 * Uses a worker thread to manage PWM via GPIO character devices
 */
export declare class LibGPIOServoController {
    private chipNumber;
    private pin;
    private freq;
    private worker?;
    private currentPulseMs;
    private running;
    private autoStopTimer?;
    private autoStopDelayMs;
    /**
     * Create a LibGPIOServoController instance
     * @param chipNumber GPIO chip number (usually 0)
     * @param pin GPIO pin number (BCM)
     * @param freq PWM frequency in Hz (default 50 for standard servos)
     */
    constructor(chipNumber: number, pin: number, freq?: number, autoStopDelayMs?: number);
    private resolveWorkerPath;
    /**
     * Start the servo controller worker
     */
    start(): void;
    /**
     * Stop the servo controller and clean up resources
     */
    stop(): Promise<void>;
    /**
     * Set pulse width in milliseconds
     * Valid range is 0.5-2.5ms for standard servos
     * @param pulseMs Pulse width in milliseconds
     */
    setPulseWidth(pulseMs: number): void;
    /**
     * Set servo angle (0-180 degrees)
     * 0° = 0.5ms pulse, 90° = 1.5ms pulse, 180° = 2.5ms pulse
     * @param angle Angle in degrees (0-180)
     */
    setAngle(angle: number): void;
    /**
     * Get the current pulse width
     */
    getPulseWidth(): number;
    /**
     * Get the current angle (approximately)
     */
    getAngle(): number;
    /**
     * Check if the controller is running
     */
    isRunning(): boolean;
    /**
     * Cleanup and stop the controller
     */
    cleanup(): Promise<void>;
}
