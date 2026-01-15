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
import { Transform } from 'stream';
import RecognizeStream from 'ibm-watson/lib/recognize-stream.js';
/**
 * Microphone controller for TJBot
 * Handles microphone initialization and audio stream management
 */
export declare class MicrophoneController {
    private mic;
    private micInputStream;
    constructor();
    /**
     * Auto-detect the first available audio recording device
     * @returns The device string (e.g., 'plughw:2,0') or empty string if none found
     */
    private detectMicrophoneDevice;
    /**
     * Initialize the microphone with configuration
     * @param rate Microphone sampling rate in Hz
     * @param channels Number of audio channels
     * @param device Optional specific audio device to use (auto-detected if not specified)
     */
    initialize(rate: number, channels: number, device?: string, exitOnSilenceSeconds?: number): void;
    /**
     * Connect microphone stream to STT stream for speech-to-text
     * @param sttStream IBM Watson STT recognize stream
     * @returns The connected stream
     */
    connectToSTT(sttStream: RecognizeStream): RecognizeStream;
    /**
     * Start microphone recording
     */
    start(): void;
    /**
     * Pause microphone recording
     */
    pause(): void;
    /**
     * Resume microphone recording
     */
    resume(): void;
    /**
     * Stop microphone recording
     */
    stop(): void;
    /**
     * Get the microphone input stream
     */
    getInputStream(): Transform;
    /**
     * Clean up resources
     */
    cleanup(): void;
}
