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
import RecognizeStream from 'ibm-watson/lib/recognize-stream.js';
import { execSync } from 'child_process';

/**
 * Microphone controller for TJBot
 * Handles microphone initialization and audio stream management
 */
export class MicrophoneController {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private mic: any;
    private micInputStream: Transform;

    constructor() {
        const params = {};
        this.mic = Mic(params);
        this.micInputStream = this.mic.getAudioStream() as unknown as Transform;
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
                winston.verbose(`🎤 auto-detected microphone device: ${deviceString}`);
                return deviceString;
            }

            winston.warn('🎤 no audio capture devices found');
            return '';
        } catch (error) {
            winston.error('🎤 error detecting microphone device:', error);
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
        winston.verbose('🎤 initializing microphone');

        // Auto-detect device if not specified
        let selectedDevice = device || '';
        if (!selectedDevice || selectedDevice === '') {
            selectedDevice = this.detectMicrophoneDevice();
        }

        const params: Record<string, unknown> = {
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

        if (selectedDevice && selectedDevice !== '') {
            winston.verbose('🎤 listening through user-defined audio device: ' + selectedDevice);
            params['device'] = selectedDevice;
        } else {
            winston.verbose('🎤 listening through default audio device');
        }

        // create the microphone
        this.mic = Mic(params);

        // save the input stream so we can pipe it to STT
        // the weird typecasting is because we're using super legacy js code :)
        this.micInputStream = this.mic.getAudioStream() as unknown as Transform;

        // event handlers
        this.micInputStream.on('startComplete', () => {
            winston.verbose('🎤 microphone started');
        });

        this.micInputStream.on('pauseComplete', () => {
            winston.verbose('🎤 microphone paused');
        });

        this.micInputStream.on('data', () => {
            // turn this on for serious debugging, otherwise it's very noisy :)
            // winston.verbose('🎤 microphone received data: ' + data.length + ' bytes');
        });

        // log errors in the mic input stream
        this.micInputStream.on('error', (err) => {
            winston.error('🎤 microphone input stream experienced an error', err);
        });

        this.micInputStream.on('processExitComplete', () => {
            winston.verbose('🎤 microphone recording process exited');
        });

        // ignore silence
        this.micInputStream.on('silence', () => {
            winston.verbose('🎤 microphone silence');
        });
    }

    /**
     * Connect microphone stream to STT stream for speech-to-text
     * @param sttStream IBM Watson STT recognize stream
     * @returns The connected stream
     */
    connectToSTT(sttStream: RecognizeStream): RecognizeStream {
        return this.micInputStream.pipe(sttStream);
    }

    /**
     * Start microphone recording
     */
    start(): void {
        if (this.mic !== undefined) {
            this.mic.start();
        }
    }

    /**
     * Pause microphone recording
     */
    pause(): void {
        if (this.mic !== undefined) {
            winston.verbose('🎤 listening paused');
            this.mic.pause();
        }
    }

    /**
     * Resume microphone recording
     */
    resume(): void {
        if (this.mic !== undefined) {
            winston.verbose('🎤 listening resumed');
            this.mic.resume();
        }
    }

    /**
     * Stop microphone recording
     */
    stop(): void {
        if (this.mic !== undefined) {
            this.mic.stop();
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
        this.stop();
    }
}
