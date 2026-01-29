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
export type STTModelType = 'streaming' | 'offline';
export type STTModelFlavor = 'streaming-zipformer' | 'streaming-paraformer' | 'offline-whisper' | 'offline-moonshine';
/**
 * Infer sherpa-onnx local model flavor from model name/URL.
 * Throws a TJBotError if the flavor cannot be determined.
 */
export declare function inferLocalModelFlavor(modelName?: string, modelUrl?: string): STTModelFlavor;
export declare function toModelType(flavor: STTModelFlavor): STTModelType;
export declare function inferSTTMode(listenConfig: ListenConfig): STTModelType;
