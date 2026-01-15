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

import { ListenConfig, STTBackendType } from '../config/index.js';
import { TJBotError } from '../utils/index.js';
import { inferLocalModelFlavor, toModelType, ModelType } from './model-type.js';

export function inferSTTMode(listenConfig: ListenConfig): ModelType {
    const backend = (listenConfig.backend?.type as STTBackendType) ?? 'local';

    if (backend === 'ibm-watson-stt' || backend === 'google-cloud-stt') {
        return 'streaming';
    }

    if (backend === 'azure-stt') {
        // Azure is single-shot request/response; treat as offline for listen() API usage
        return 'offline';
    }

    if (backend === 'local') {
        const modelName =
            ((listenConfig.backend?.local as Record<string, unknown>)?.model as string) ??
            (listenConfig.model as string) ??
            '';
        const modelUrl = ((listenConfig.backend?.local as Record<string, unknown>)?.modelUrl as string) ?? '';
        const flavor = inferLocalModelFlavor(modelName, modelUrl);
        return toModelType(flavor);
    }
    throw new TJBotError(`Unknown STT backend type: ${backend}`);
}
