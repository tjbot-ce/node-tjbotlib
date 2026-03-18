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

import Mic from 'mic';
import winston from 'winston';
import { Transform } from 'stream';
import { execSync } from 'child_process';
import { LogEmoji } from '../utils/logging.js';

const EMO = LogEmoji.MIC;

interface MicInstance {
    start(): void;
    stop(): void;
    pause(): void;
    resume(): void;
    getAudioStream(): Transform;
}

type MicParams = Record<string, string | number | boolean>;

/**
 * Microphone controller for TJBot
 * Handles microphone initialization and audio stream management
 */
export class MicrophoneController {
    private mic: MicInstance;
    private micInputStream: Transform;
    private isStarted: boolean;
    private isPaused: boolean;

    constructor() {
        const params: MicParams = {};
        this.mic = Mic(params) as unknown as MicInstance;
        this.micInputStream = this.mic.getAudioStream();
        this.isStarted = false;
        this.isPaused = false;
    }

    /**
     * Auto-detect the first available audio recording device
     * @returns The device string (e.g., 'plughw:2,0') or empty string if none found
     */
    private detectMicrophoneDevice(): string {
        try {
            // Run arecord -l to list capture devices
            const output = execSync('arecord -l', { encoding: 'utf8' });

            // Parse output to find first card and device
            // Example line: "card 2: Device [USB PnP Sound Device], device 0: USB Audio [USB Audio]"
            const match = output.match(/card (\d+):.*device (\d+):/);

            if (match) {
                const card = match[1];
                const device = match[2];
                const deviceString = `plughw:${card},${device}`;
                winston.debug(`${EMO} auto-detected microphone device: ${deviceString}`);
                return deviceString;
            }

            winston.warn(`${EMO} no audio capture devices found`);
            return '';
        } catch (error) {
            winston.error(`${EMO} error detecting microphone device:`, error);
            return '';
        }
    }

    /**
     * Initialize the microphone with configuration
     * @param rate Microphone sampling rate in Hz
     * @param channels Number of audio channels
     * @param device Optional specific audio device to use (auto-detected if not specified)
     */
    initialize(rate: number, channels: number, device?: string, exitOnSilenceSeconds?: number): void {
        const params: MicParams = {
            rate: String(rate),
            channels: String(channels),
            bitwidth: '16',
            encoding: 'signed-integer',
            endian: 'little',
            debug: false,
        };

        // Only enable auto-stop on silence if a positive value is provided
        if (typeof exitOnSilenceSeconds === 'number' && exitOnSilenceSeconds > 0) {
            params['exitOnSilence'] = exitOnSilenceSeconds;
        }

        if (device && device !== '') {
            params['device'] = device;
            winston.verbose(`${EMO} Initializing microphone with user-defined audio device: ${device}`);
        } else {
            const selectedDevice = this.detectMicrophoneDevice();
            params['device'] = selectedDevice;
            winston.verbose(`${EMO} Initializing microphone with auto-detected audio device: ${selectedDevice}`);
        }

        // create the microphone
        this.mic = Mic(params);

        // save the input stream so we can pipe it to STT
        this.micInputStream = this.mic.getAudioStream();

        // event handlers
        this.micInputStream.on('startComplete', () => {
            winston.verbose(`${EMO} Microphone started`);
        });

        this.micInputStream.on('pauseComplete', () => {
            winston.verbose(`${EMO} Microphone paused`);
        });

        this.micInputStream.on('data', (data) => {
            winston.silly(`${EMO} microphone received ${data.length} bytes`);
        });

        // log errors in the mic input stream
        this.micInputStream.on('error', (err) => {
            winston.error(`${EMO} Microphone input stream experienced an error`, err);
        });

        this.micInputStream.on('processExitComplete', () => {
            winston.verbose(`${EMO} Microphone recording process exited`);
        });

        // ignore silence
        this.micInputStream.on('silence', () => {
            winston.verbose(`${EMO} Microphone silence`);
        });

        winston.debug(`${EMO} initialized microphone with config:
            rate: ${rate}
            channels: ${channels}
            device: ${device}
            exitOnSilenceSeconds: ${exitOnSilenceSeconds}`);
    }

    /**
     * Start microphone recording
     */
    start(): void {
        if (this.mic !== undefined && !this.isStarted) {
            this.mic.start();
            this.isStarted = true;
            this.isPaused = false;
        } else if (this.mic !== undefined && this.isPaused) {
            this.mic.resume();
            this.isPaused = false;
        }
    }

    /**
     * Pause microphone recording
     */
    pause(): void {
        if (this.mic !== undefined && this.isStarted && !this.isPaused) {
            this.mic.pause();
            this.isPaused = true;
        }
    }

    /**
     * Resume microphone recording
     */
    resume(): void {
        if (this.mic !== undefined && this.isStarted && this.isPaused) {
            this.mic.resume();
            this.isPaused = false;
        }
    }

    /**
     * Stop microphone recording
     */
    stop(): void {
        if (this.mic !== undefined) {
            this.mic.stop();
            this.isStarted = false;
            this.isPaused = false;
        }
    }

    /**
     * Get the microphone input stream
     */
    getInputStream(): Transform {
        return this.micInputStream;
    }

    /**
     * Clean up resources
     */
    cleanup(): void {
        winston.debug(`${EMO} MicrophoneController cleanup`);
        this.stop();
    }
}
