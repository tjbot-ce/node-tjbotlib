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
import { createSTTEngine } from './stt-engine.js';
/**
 * STT Controller for TJBot
 * Manages speech-to-text synthesis and engine lifecycle.
 * Lazy-initializes the STT engine on first transcribe call and caches it for reuse.
 */
export class STTController {
    constructor(microphoneController, listenConfig) {
        this.sttEngine = undefined;
        this.microphoneController = microphoneController;
        this.listenConfig = listenConfig;
    }
    /**
     * Transcribe audio from a microphone stream.
     * Lazily initializes the STT engine on first call.
     * Manages the microphone lifecycle (start/stop) internally.
     *
     * @returns The transcribed text
     */
    async transcribe(options) {
        // Initialize STT engine lazily on first call
        if (this.sttEngine === undefined) {
            this.sttEngine = await createSTTEngine(this.listenConfig);
            await this.sttEngine.initialize();
        }
        // Start microphone
        this.microphoneController.start();
        try {
            const micStream = this.microphoneController.getInputStream();
            const transcript = await this.sttEngine.transcribe(micStream, {
                listenConfig: this.listenConfig,
                onPartialResult: options?.onPartialResult,
                onFinalResult: options?.onFinalResult,
                abortSignal: options?.abortSignal,
            });
            return transcript;
        }
        finally {
            // Always stop microphone to avoid speaker feedback
            this.microphoneController.stop();
        }
    }
    /**
     * Eagerly initialize the STT engine.
     */
    async ensureEngineInitialized() {
        if (this.sttEngine === undefined) {
            this.sttEngine = await createSTTEngine(this.listenConfig);
            await this.sttEngine.initialize();
        }
    }
    /**
     * Clean up STT resources.
     */
    async cleanup() {
        if (this.sttEngine) {
            await this.sttEngine.cleanup?.();
            this.sttEngine = undefined;
        }
    }
}
//# sourceMappingURL=stt.js.map