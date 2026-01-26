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
import { STTEngine, STTRequestOptions } from '../stt-engine.js';
import type { STTBackendAzureConfig } from '../../config/config-types.js';
/**
 * Azure Cognitive Services Speech-to-Text Engine
 *
 * Cloud-based speech recognition using Microsoft Azure Speech Services.
 * Requires Azure subscription key and region to be configured.
 * @public
 */
export declare class AzureSTTEngine extends STTEngine {
    private subscriptionKey;
    private region;
    constructor(config?: STTBackendAzureConfig);
    initialize(): Promise<void>;
    private loadCredentials;
    private resolveCredentialsPath;
    private loadCredentialsFromFile;
    transcribe(micStream: NodeJS.ReadableStream, options: STTRequestOptions): Promise<string>;
}
