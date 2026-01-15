/**
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
import { EventEmitter } from 'events';
/**
 * Native audio player that uses aplay for audio playback on Raspbian/ALSA systems
 * Provides the same API surface as sound-player package
 */
export declare class AudioPlayer extends EventEmitter {
    private process;
    /**
     * Play an audio file using aplay
     * @param audioPath Path to the audio file to play
     * @param device Optional audio device to use (e.g., 'hw:0,0')
     */
    play(audioPath: string, device?: string): void;
}
