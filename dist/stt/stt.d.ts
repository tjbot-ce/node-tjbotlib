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
import { ListenConfig } from '../config/index.js';
import { MicrophoneController } from '../microphone/index.js';
/**
 * STT Controller for TJBot
 * Manages speech-to-text synthesis and engine lifecycle.
 * Lazy-initializes the STT engine on first transcribe call and caches it for reuse.
 */
export declare class STTController {
    private sttEngine;
    private microphoneController;
    private listenConfig;
    constructor(microphoneController: MicrophoneController, listenConfig: ListenConfig);
    /**
     * Transcribe audio from a microphone stream.
     * Lazily initializes the STT engine on first call.
     * Manages the microphone lifecycle (start/stop) internally.
     *
     * @returns The transcribed text
     */
    transcribe(options?: {
        onPartialResult?: (text: string) => void;
        onFinalResult?: (text: string) => void;
        abortSignal?: AbortSignal;
    }): Promise<string>;
}
