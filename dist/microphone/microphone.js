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
import { execSync } from 'child_process';
import { getLogger } from '../utils/logging.js';
const logger = getLogger(import.meta.url);
/**
 * Microphone controller for TJBot
 * Handles microphone initialization and audio stream management
 */
export class MicrophoneController {
    mic;
    micInputStream;
    isStarted;
    isPaused;
    constructor() {
        const params = {};
        this.mic = Mic(params);
        this.micInputStream = this.mic.getAudioStream();
        this.isStarted = false;
        this.isPaused = false;
    }
    /**
     * Auto-detect the first available audio recording device
     * @returns The device string (e.g., 'plughw:2,0') or empty string if none found
     */
    detectMicrophoneDevice() {
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
                logger.debug(`auto-detected microphone device: ${deviceString}`);
                return deviceString;
            }
            logger.warn('no audio capture devices found');
            return '';
        }
        catch (error) {
            logger.error('error detecting microphone device:', error);
            return '';
        }
    }
    /**
     * Initialize the microphone with configuration
     * @param rate Microphone sampling rate in Hz
     * @param channels Number of audio channels
     * @param device Optional specific audio device to use (auto-detected if not specified)
     */
    initialize(rate, channels, device, exitOnSilenceSeconds) {
        const params = {
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
            logger.verbose(`Initializing microphone with user-defined audio device: ${device}`);
        }
        else {
            const selectedDevice = this.detectMicrophoneDevice();
            params['device'] = selectedDevice;
            logger.verbose(`Initializing microphone with auto-detected audio device: ${selectedDevice}`);
        }
        // create the microphone
        this.mic = Mic(params);
        // save the input stream so we can pipe it to STT
        this.micInputStream = this.mic.getAudioStream();
        // event handlers
        this.micInputStream.on('startComplete', () => {
            logger.verbose('Microphone started');
        });
        this.micInputStream.on('pauseComplete', () => {
            logger.verbose('Microphone paused');
        });
        this.micInputStream.on('data', (data) => {
            logger.silly(`microphone received ${data.length} bytes`);
        });
        // log errors in the mic input stream
        this.micInputStream.on('error', (err) => {
            logger.error('Microphone input stream experienced an error', err);
        });
        this.micInputStream.on('processExitComplete', () => {
            logger.verbose('Microphone recording process exited');
        });
        // ignore silence
        this.micInputStream.on('silence', () => {
            logger.verbose('Microphone silence');
        });
        logger.debug(`initialized microphone with config:
            rate: ${rate}
            channels: ${channels}
            device: ${device}
            exitOnSilenceSeconds: ${exitOnSilenceSeconds}`);
    }
    /**
     * Start microphone recording
     */
    start() {
        if (this.mic !== undefined && !this.isStarted) {
            this.mic.start();
            this.isStarted = true;
            this.isPaused = false;
        }
        else if (this.mic !== undefined && this.isPaused) {
            this.resume();
        }
    }
    /**
     * Pause microphone recording
     */
    pause() {
        if (this.mic !== undefined && this.isStarted && !this.isPaused) {
            this.mic.pause();
            this.isPaused = true;
        }
    }
    /**
     * Resume microphone recording
     */
    resume() {
        if (this.mic !== undefined && this.isStarted && this.isPaused) {
            this.mic.resume();
            this.isPaused = false;
            // there is no resume event, so log it here
            logger.verbose('Microphone resumed');
        }
    }
    /**
     * Stop microphone recording
     */
    stop() {
        if (this.mic !== undefined) {
            this.mic.stop();
            this.isStarted = false;
            this.isPaused = false;
        }
    }
    /**
     * Get the microphone input stream
     */
    getInputStream() {
        return this.micInputStream;
    }
    /**
     * Clean up resources
     */
    cleanup() {
        logger.debug('MicrophoneController cleanup');
        this.stop();
    }
}
//# sourceMappingURL=microphone.js.map