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

import { AudioPlayer } from './audio-player.js';
import winston from 'winston';
import { once } from 'events';
import { execSync } from 'child_process';

/**
 * Speaker controller for TJBot
 * Handles audio playback and text-to-speech synthesis
 */
export class SpeakerController {
    private device: string;
    private onPauseCallback?: () => void;
    private onResumeCallback?: () => void;

    constructor() {
        this.device = '';
    }

    /**
     * Auto-detect the first available audio playback device
     * Prefers USB audio devices over HDMI devices
     * @returns The device string (e.g., 'plughw:0,0') or empty string if none found
     */
    private detectSpeakerDevice(): string {
        try {
            // Run aplay -l to list playback devices
            const output = execSync('aplay -l', { encoding: 'utf8' });
            const lines = output.split('\n');

            // Prefer USB audio devices over HDMI (which may not work without connected display)
            const usbLine = lines.find((line) => line.includes('USB') && line.match(/card (\d+):.*device (\d+):/));
            const targetLine = usbLine || lines.find((line) => line.match(/card (\d+):.*device (\d+):/));

            if (targetLine) {
                const match = targetLine.match(/card (\d+):.*device (\d+):/);
                if (match) {
                    const card = match[1];
                    const device = match[2];
                    const deviceString = `plughw:${card},${device}`;
                    winston.verbose(`🔈 auto-detected speaker device: ${deviceString}`);
                    return deviceString;
                }
            }

            winston.warn('🔈 no audio playback devices found');
            return '';
        } catch (error) {
            winston.error('🔈 error detecting speaker device:', error);
            return '';
        }
    }

    /**
     * Initialize the speaker with configuration
     * @param device Optional specific audio device to use (auto-detected if not specified)
     */
    initialize(device?: string): void {
        // Auto-detect device if not specified
        let selectedDevice = device || '';
        if (!selectedDevice || selectedDevice === '') {
            selectedDevice = this.detectSpeakerDevice();
        }

        this.device = selectedDevice;
        winston.verbose(`🔈 initializing speaker on device ${this.device}`);
    }

    /**
     * Set callbacks for pause/resume (typically to pause/resume microphone)
     * @param onPause Callback when audio playback starts
     * @param onResume Callback when audio playback ends
     */
    setAudioLifecycleCallbacks(onPause?: () => void, onResume?: () => void): void {
        this.onPauseCallback = onPause;
        this.onResumeCallback = onResume;
    }

    /**
     * Play audio from a file
     * @param audioPath Path to the audio file to play
     */
    async playAudio(audioPath: string): Promise<void> {
        // pause listening while we play a sound
        if (this.onPauseCallback) {
            this.onPauseCallback();
        }

        const player = new AudioPlayer();

        if (this.device !== undefined && this.device !== '') {
            winston.verbose('🔈 playing through user-defined audio device: ' + this.device);
        } else {
            winston.verbose('🔈 playing through default audio device');
        }

        winston.debug('🔈 playing audio file: ' + audioPath);

        // Set up event handlers
        player.on('complete', () => {
            winston.debug('🔈 audio playback finished');

            // resume listening
            if (this.onResumeCallback) {
                this.onResumeCallback();
            }
        });

        player.on('error', (err) => {
            winston.error('🔈 error occurred while playing audio', err);
        });

        // play the audio
        player.play(audioPath, this.device);

        // wait for the audio to finish playing, either by completing playback or by throwing an error
        await Promise.race([once(player, 'complete'), once(player, 'error')]);
    }

    /**
     * Clean up resources
     */
    cleanup(): void {
        // AudioPlayer cleanup is handled automatically
    }
}
