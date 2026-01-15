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
 * Speaker controller for TJBot
 * Handles audio playback and text-to-speech synthesis
 */
export declare class SpeakerController {
    private device;
    private onPauseCallback?;
    private onResumeCallback?;
    constructor();
    /**
     * Auto-detect the first available audio playback device
     * Prefers USB audio devices over HDMI devices
     * @returns The device string (e.g., 'plughw:0,0') or empty string if none found
     */
    private detectSpeakerDevice;
    /**
     * Initialize the speaker with configuration
     * @param device Optional specific audio device to use (auto-detected if not specified)
     */
    initialize(device?: string): void;
    /**
     * Set callbacks for pause/resume (typically to pause/resume microphone)
     * @param onPause Callback when audio playback starts
     * @param onResume Callback when audio playback ends
     */
    setAudioLifecycleCallbacks(onPause?: () => void, onResume?: () => void): void;
    /**
     * Play audio from a file
     * @param audioPath Path to the audio file to play
     */
    playAudio(audioPath: string): Promise<void>;
    /**
     * Clean up resources
     */
    cleanup(): void;
}
