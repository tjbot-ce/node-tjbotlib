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
import type { ValidateFunction } from 'ajv';
import type { HardwareConfig, LEDCommonAnodeConfig, LEDNeopixelConfig, ListenConfig, LogLevel, LogConfig, ModelEntry, ModelEntryType, ModelsConfig, SeeBackendAzureConfig, SeeBackendConfig, SeeBackendGoogleCloudConfig, SeeBackendLocalConfig, SeeBackendType, SeeConfig, ShineConfig, SpeakConfig, STTBackendAzureConfig, STTBackendConfig, STTBackendGoogleCloudConfig, STTBackendIBMWatsonConfig, STTBackendLocalConfig, STTBackendType, TJBotConfigSchema, TTSBackendAzureConfig, TTSBackendConfig, TTSBackendGoogleCloudConfig, TTSBackendIBMWatsonConfig, TTSBackendLocalConfig, TTSBackendType, VADConfig, WaveConfig } from './config-types.generated.js';
export type { HardwareConfig, LEDCommonAnodeConfig, LEDNeopixelConfig, ListenConfig, LogLevel, LogConfig, ModelEntryType, ModelEntry, ModelsConfig, SeeBackendAzureConfig, SeeBackendConfig, SeeBackendGoogleCloudConfig, SeeBackendLocalConfig, SeeBackendType, SeeConfig, ShineConfig, SpeakConfig, STTBackendAzureConfig, STTBackendConfig, STTBackendGoogleCloudConfig, STTBackendIBMWatsonConfig, STTBackendLocalConfig, STTBackendType, TJBotConfigSchema, TTSBackendAzureConfig, TTSBackendConfig, TTSBackendGoogleCloudConfig, TTSBackendIBMWatsonConfig, TTSBackendLocalConfig, TTSBackendType, VADConfig, WaveConfig, };
export type NoneBackendConfig = Record<string, never>;
export type STTEngineConfig = NoneBackendConfig | STTBackendLocalConfig | STTBackendIBMWatsonConfig | STTBackendGoogleCloudConfig | STTBackendAzureConfig;
export type TTSEngineConfig = NoneBackendConfig | TTSBackendLocalConfig | TTSBackendIBMWatsonConfig | TTSBackendGoogleCloudConfig | TTSBackendAzureConfig;
export type VisionEngineConfig = NoneBackendConfig | SeeBackendLocalConfig | SeeBackendGoogleCloudConfig | SeeBackendAzureConfig;
export declare const STT_BACKEND_TYPES: readonly ["none", "local", "ibm-watson-stt", "google-cloud-stt", "azure-stt"];
export declare const TTS_BACKEND_TYPES: readonly ["none", "local", "ibm-watson-tts", "google-cloud-tts", "azure-tts"];
export declare const SEE_BACKEND_TYPES: readonly ["none", "local", "google-cloud-vision", "azure-vision"];
export declare function getConfigSchema(): Readonly<Record<string, unknown>>;
export declare function isSTTBackendType(value: unknown): value is STTBackendType;
export declare function isTTSBackendType(value: unknown): value is TTSBackendType;
export declare function isSeeBackendType(value: unknown): value is SeeBackendType;
export declare const sttBackendTypeSchema: {
    parse(value: unknown): "none" | "local" | "ibm-watson-stt" | "google-cloud-stt" | "azure-stt";
    safeParse(value: unknown): {
        success: false;
        error: Error;
    } | {
        success: true;
        data: "none" | "local" | "ibm-watson-stt" | "google-cloud-stt" | "azure-stt";
    };
};
export declare const ttsBackendTypeSchema: {
    parse(value: unknown): "none" | "local" | "ibm-watson-tts" | "google-cloud-tts" | "azure-tts";
    safeParse(value: unknown): {
        success: false;
        error: Error;
    } | {
        success: true;
        data: "none" | "local" | "ibm-watson-tts" | "google-cloud-tts" | "azure-tts";
    };
};
export declare const seeBackendTypeSchema: {
    parse(value: unknown): "none" | "local" | "google-cloud-vision" | "azure-vision";
    safeParse(value: unknown): {
        success: false;
        error: Error;
    } | {
        success: true;
        data: "none" | "local" | "google-cloud-vision" | "azure-vision";
    };
};
export declare const tjbotConfigSchema: {
    parse(value: unknown): TJBotConfigSchema;
    safeParse(value: unknown): {
        success: false;
        error: Error;
    } | {
        success: true;
        data: TJBotConfigSchema;
    };
};
export declare const validateTJBotConfig: ValidateFunction<TJBotConfigSchema>;
export declare function getSTTBackendConfig(backendConfig: STTBackendConfig | undefined, backendType: STTBackendType): STTEngineConfig;
export declare function getTTSBackendConfig(backendConfig: TTSBackendConfig | undefined, backendType: TTSBackendType): TTSEngineConfig;
export declare function getSeeBackendConfig(backendConfig: SeeBackendConfig | undefined, backendType: SeeBackendType): VisionEngineConfig;
//# sourceMappingURL=config-types.d.ts.map