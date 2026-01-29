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

export type STTModelType = 'streaming' | 'offline';
export type STTModelFlavor = 'streaming-zipformer' | 'streaming-paraformer' | 'offline-whisper' | 'offline-moonshine';

/**
 * Infer sherpa-onnx local model flavor from model name/URL.
 * Throws a TJBotError if the flavor cannot be determined.
 */
export function inferLocalModelFlavor(modelName?: string, modelUrl?: string): STTModelFlavor {
    const name = modelName?.toLowerCase() ?? '';
    const url = modelUrl?.toLowerCase() ?? '';

    const haystack = `${name} ${url}`;

    const isWhisper = /whisper/.test(haystack);
    const isMoonshine = /moonshine/.test(haystack);
    const isZipformer = /zipformer|transducer|streaming-zipformer/.test(haystack);
    const isParaformer = /paraformer/.test(haystack);

    if (isWhisper) return 'offline-whisper';
    if (isMoonshine) return 'offline-moonshine';
    if (isZipformer) return 'streaming-zipformer';
    if (isParaformer) return 'streaming-paraformer';

    throw new TJBotError(
        'Unable to infer STT model type. Provide a sherpa-onnx model name/URL that indicates whisper, moonshine, zipformer, or paraformer.'
    );
}

export function toModelType(flavor: STTModelFlavor): STTModelType {
    return flavor.startsWith('streaming') ? 'streaming' : 'offline';
}

export function inferSTTMode(listenConfig: ListenConfig): STTModelType {
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
