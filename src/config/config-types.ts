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

import fs from 'fs';
import { createRequire } from 'module';
import type { ErrorObject, ValidateFunction } from 'ajv';
import yaml from 'js-yaml';
import type {
    HardwareConfig,
    LEDCommonAnodeConfig,
    LEDNeopixelConfig,
    ListenConfig,
    LogLevel,
    LogConfig,
    ModelEntry,
    ModelEntryType,
    ModelsConfig,
    SeeBackendAzureConfig,
    SeeBackendConfig,
    SeeBackendGoogleCloudConfig,
    SeeBackendLocalConfig,
    SeeBackendType,
    SeeConfig,
    ShineConfig,
    SpeakConfig,
    STTBackendAzureConfig,
    STTBackendConfig,
    STTBackendGoogleCloudConfig,
    STTBackendIBMWatsonConfig,
    STTBackendLocalConfig,
    STTBackendType,
    TJBotConfigSchema,
    TTSBackendAzureConfig,
    TTSBackendConfig,
    TTSBackendGoogleCloudConfig,
    TTSBackendIBMWatsonConfig,
    TTSBackendLocalConfig,
    TTSBackendType,
    VADConfig,
    WaveConfig,
} from './config-types.generated.js';

export type {
    HardwareConfig,
    LEDCommonAnodeConfig,
    LEDNeopixelConfig,
    ListenConfig,
    LogLevel,
    LogConfig,
    ModelEntryType,
    ModelEntry,
    ModelsConfig,
    SeeBackendAzureConfig,
    SeeBackendConfig,
    SeeBackendGoogleCloudConfig,
    SeeBackendLocalConfig,
    SeeBackendType,
    SeeConfig,
    ShineConfig,
    SpeakConfig,
    STTBackendAzureConfig,
    STTBackendConfig,
    STTBackendGoogleCloudConfig,
    STTBackendIBMWatsonConfig,
    STTBackendLocalConfig,
    STTBackendType,
    TJBotConfigSchema,
    TTSBackendAzureConfig,
    TTSBackendConfig,
    TTSBackendGoogleCloudConfig,
    TTSBackendIBMWatsonConfig,
    TTSBackendLocalConfig,
    TTSBackendType,
    VADConfig,
    WaveConfig,
};

export type NoneBackendConfig = Record<string, never>;

export type STTEngineConfig =
    | NoneBackendConfig
    | STTBackendLocalConfig
    | STTBackendIBMWatsonConfig
    | STTBackendGoogleCloudConfig
    | STTBackendAzureConfig;

export type TTSEngineConfig =
    | NoneBackendConfig
    | TTSBackendLocalConfig
    | TTSBackendIBMWatsonConfig
    | TTSBackendGoogleCloudConfig
    | TTSBackendAzureConfig;

export type VisionEngineConfig =
    | NoneBackendConfig
    | SeeBackendLocalConfig
    | SeeBackendGoogleCloudConfig
    | SeeBackendAzureConfig;

export const STT_BACKEND_TYPES = Object.freeze([
    'none',
    'local',
    'ibm-watson-stt',
    'google-cloud-stt',
    'azure-stt',
] as const satisfies readonly STTBackendType[]);

export const TTS_BACKEND_TYPES = Object.freeze([
    'none',
    'local',
    'ibm-watson-tts',
    'google-cloud-tts',
    'azure-tts',
] as const satisfies readonly TTSBackendType[]);

export const SEE_BACKEND_TYPES = Object.freeze([
    'none',
    'local',
    'google-cloud-vision',
    'azure-vision',
] as const satisfies readonly SeeBackendType[]);

function loadConfigSchema(): Record<string, unknown> {
    const schemaUrl = new URL('./schema/tjbot-config.schema.yaml', import.meta.url);
    const schemaSource = fs.readFileSync(schemaUrl, 'utf8');
    const loadedSchema = yaml.load(schemaSource);

    if (!loadedSchema || typeof loadedSchema !== 'object' || Array.isArray(loadedSchema)) {
        throw new Error('TJBot config schema is invalid or empty');
    }

    return loadedSchema as Record<string, unknown>;
}

const configSchema = loadConfigSchema();
const require = createRequire(import.meta.url);
const Ajv = require('ajv').default as typeof import('ajv').default;
const addFormats = require('ajv-formats').default as typeof import('ajv-formats').default;
const ajv = new Ajv({
    allErrors: true,
    allowUnionTypes: true,
    strict: false,
});

addFormats(ajv);

const compiledTJBotConfigValidator = ajv.compile(configSchema) as ValidateFunction<TJBotConfigSchema>;

function formatValidationErrors(errors: ErrorObject[] | null | undefined): string {
    return ajv.errorsText(errors, { separator: '; ' });
}

function createEnumParser<T extends readonly string[]>(
    values: T,
    label: string
): {
    parse(value: unknown): T[number];
    safeParse(value: unknown): { success: true; data: T[number] } | { success: false; error: Error };
} {
    return {
        parse(value: unknown): T[number] {
            const result = this.safeParse(value);
            if (!result.success) {
                throw result.error;
            }

            return result.data;
        },
        safeParse(value: unknown): { success: true; data: T[number] } | { success: false; error: Error } {
            if (typeof value === 'string' && values.includes(value)) {
                return { success: true, data: value };
            }

            return {
                success: false,
                error: new Error(`Invalid ${label}. Expected one of: ${values.join(', ')}`),
            };
        },
    };
}

function createValidatorParser<T>(
    validate: ValidateFunction<T>,
    label: string
): {
    parse(value: unknown): T;
    safeParse(value: unknown): { success: true; data: T } | { success: false; error: Error };
} {
    return {
        parse(value: unknown): T {
            const result = this.safeParse(value);
            if (!result.success) {
                throw result.error;
            }

            return result.data;
        },
        safeParse(value: unknown): { success: true; data: T } | { success: false; error: Error } {
            if (validate(value)) {
                return { success: true, data: value as T };
            }

            return {
                success: false,
                error: new Error(`Invalid ${label}: ${formatValidationErrors(validate.errors)}`),
            };
        },
    };
}

export function getConfigSchema(): Readonly<Record<string, unknown>> {
    return configSchema;
}

export function isSTTBackendType(value: unknown): value is STTBackendType {
    return typeof value === 'string' && STT_BACKEND_TYPES.includes(value as STTBackendType);
}

export function isTTSBackendType(value: unknown): value is TTSBackendType {
    return typeof value === 'string' && TTS_BACKEND_TYPES.includes(value as TTSBackendType);
}

export function isSeeBackendType(value: unknown): value is SeeBackendType {
    return typeof value === 'string' && SEE_BACKEND_TYPES.includes(value as SeeBackendType);
}

export const sttBackendTypeSchema = createEnumParser(STT_BACKEND_TYPES, 'STT backend type');
export const ttsBackendTypeSchema = createEnumParser(TTS_BACKEND_TYPES, 'TTS backend type');
export const seeBackendTypeSchema = createEnumParser(SEE_BACKEND_TYPES, 'vision backend type');
export const tjbotConfigSchema = createValidatorParser(compiledTJBotConfigValidator, 'TJBot configuration');
export const validateTJBotConfig = compiledTJBotConfigValidator;

export function getSTTBackendConfig(
    backendConfig: STTBackendConfig | undefined,
    backendType: STTBackendType
): STTEngineConfig {
    if (!backendConfig) {
        return {} as STTEngineConfig;
    }

    switch (backendType) {
        case 'none':
            return {} as STTEngineConfig;
        case 'local':
            return (backendConfig.local ?? {}) as STTEngineConfig;
        case 'ibm-watson-stt':
            return (backendConfig['ibm-watson-stt'] ?? {}) as STTEngineConfig;
        case 'google-cloud-stt':
            return (backendConfig['google-cloud-stt'] ?? {}) as STTEngineConfig;
        case 'azure-stt':
            return (backendConfig['azure-stt'] ?? {}) as STTEngineConfig;
        default:
            return {} as STTEngineConfig;
    }
}

export function getTTSBackendConfig(
    backendConfig: TTSBackendConfig | undefined,
    backendType: TTSBackendType
): TTSEngineConfig {
    if (!backendConfig) {
        return {} as TTSEngineConfig;
    }

    switch (backendType) {
        case 'none':
            return {} as TTSEngineConfig;
        case 'local':
            return (backendConfig.local ?? {}) as TTSEngineConfig;
        case 'ibm-watson-tts':
            return (backendConfig['ibm-watson-tts'] ?? {}) as TTSEngineConfig;
        case 'google-cloud-tts':
            return (backendConfig['google-cloud-tts'] ?? {}) as TTSEngineConfig;
        case 'azure-tts':
            return (backendConfig['azure-tts'] ?? {}) as TTSEngineConfig;
        default:
            return {} as TTSEngineConfig;
    }
}

export function getSeeBackendConfig(
    backendConfig: SeeBackendConfig | undefined,
    backendType: SeeBackendType
): VisionEngineConfig {
    if (!backendConfig) {
        return {} as VisionEngineConfig;
    }

    switch (backendType) {
        case 'none':
            return {} as VisionEngineConfig;
        case 'local':
            return (backendConfig.local ?? {}) as VisionEngineConfig;
        case 'google-cloud-vision':
            return (backendConfig['google-cloud-vision'] ?? {}) as VisionEngineConfig;
        case 'azure-vision':
            return (backendConfig['azure-vision'] ?? {}) as VisionEngineConfig;
        default:
            return {} as VisionEngineConfig;
    }
}
