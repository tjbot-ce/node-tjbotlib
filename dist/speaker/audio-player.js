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
import { spawn } from 'child_process';
/**
 * Native audio player that uses aplay for audio playback on Raspbian/ALSA systems
 * Provides the same API surface as sound-player package
 */
export class AudioPlayer extends EventEmitter {
    constructor() {
        super(...arguments);
        this.process = null;
    }
    /**
     * Play an audio file using aplay
     * @param audioPath Path to the audio file to play
     * @param device Optional audio device to use (e.g., 'hw:0,0')
     */
    play(audioPath, device) {
        const args = [audioPath];
        // Add device parameter if specified
        if (device && device !== '') {
            args.unshift('-D', device);
        }
        // Spawn aplay process
        this.process = spawn('aplay', args, {
            stdio: ['ignore', 'ignore', 'pipe'], // Only capture stderr for errors
        });
        let stderrOutput = '';
        // Capture stderr for error reporting
        if (this.process.stderr) {
            this.process.stderr.on('data', (data) => {
                stderrOutput += data.toString();
            });
        }
        // Handle process completion
        this.process.on('close', (code) => {
            this.process = null;
            if (code === 0) {
                this.emit('complete');
            }
            else {
                const error = new Error(`aplay exited with code ${code}: ${stderrOutput}`);
                this.emit('error', error);
            }
        });
        // Handle process errors (e.g., aplay not found)
        this.process.on('error', (err) => {
            this.process = null;
            this.emit('error', err);
        });
    }
}
//# sourceMappingURL=audio-player.js.map