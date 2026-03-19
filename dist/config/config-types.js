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
import { z } from 'zod';
/**
 * Logging configuration
 */
const logConfigSchema = z
    .object({
    level: z.string().optional(),
})
    .loose();
/**
 * STT Backend configuration with discriminated union based on type field
 */
export const sttBackendTypeSchema = z.enum(['none', 'local', 'ibm-watson-stt', 'google-cloud-stt', 'azure-stt']);
export const vadConfigSchema = z
    .object({
    enabled: z.boolean().optional(),
    /** Optional model name from registry (e.g., silero-vad) */
    model: z.string().optional(),
})
    .loose();
export const sttBackendLocalConfigSchema = z
    .object({
    model: z.string().optional(),
    vad: vadConfigSchema.optional(),
})
    .loose();
export const sttBackendIBMWatsonConfigSchema = z
    .object({
    model: z.string().optional(),
    inactivityTimeout: z.number().optional(),
    backgroundAudioSuppression: z.number().optional(),
    interimResults: z.boolean().optional(),
    credentialsPath: z.string().optional(),
})
    .loose();
export const sttBackendGoogleCloudConfigSchema = z
    .object({
    model: z.string().optional(),
    languageCode: z.string().optional(),
    credentialsPath: z.string().optional(),
    encoding: z.string().optional(),
    sampleRateHertz: z.number().optional(),
    audioChannelCount: z.number().optional(),
    enableAutomaticPunctuation: z.boolean().optional(),
    interimResults: z.boolean().optional(),
})
    .loose();
export const sttBackendAzureConfigSchema = z
    .object({
    language: z.string().optional(),
    credentialsPath: z.string().optional(),
})
    .loose();
/** Empty config for 'none' backend */
export const noneBackendConfigSchema = z.object({}).strict();
export const sttBackendConfigSchema = z
    .object({
    type: sttBackendTypeSchema,
    local: sttBackendLocalConfigSchema.optional(),
    'ibm-watson-stt': sttBackendIBMWatsonConfigSchema.optional(),
    'google-cloud-stt': sttBackendGoogleCloudConfigSchema.optional(),
    'azure-stt': sttBackendAzureConfigSchema.optional(),
})
    .strict()
    .refine((config) => {
    // If type is 'none', no additional config needed
    if (config.type === 'none') {
        return true;
    }
    // For other types, we don't enforce anything here
    return true;
});
/**
 * Speech-to-text (Listen) configuration
 */
export const listenConfigSchema = z
    .object({
    device: z.string().optional(),
    microphoneRate: z.number().optional(),
    microphoneChannels: z.number().optional(),
    model: z.string().optional(),
    /** Optional URL for the STT model download */
    backend: sttBackendConfigSchema.optional(),
})
    .loose();
/**
 * SEE (CV) Backend configuration with discriminated union based on type field
 */
export const seeBackendTypeSchema = z.enum(['none', 'local', 'google-cloud-vision', 'azure-vision']);
export const seeBackendLocalConfigSchema = z
    .object({
    objectDetectionModel: z.string().optional(),
    imageClassificationModel: z.string().optional(),
    faceDetectionModel: z.string().optional(),
    objectDetectionConfidence: z.number().optional(),
    imageClassificationConfidence: z.number().optional(),
    faceDetectionConfidence: z.number().optional(),
})
    .loose();
export const seeBackendGoogleCloudConfigSchema = z
    .object({
    credentialsPath: z.string().optional(),
    model: z.string().optional(),
})
    .loose();
export const seeBackendAzureConfigSchema = z
    .object({
    credentialsPath: z.string().optional(),
    model: z.string().optional(),
})
    .loose();
export const seeBackendConfigSchema = z
    .object({
    type: seeBackendTypeSchema,
    local: seeBackendLocalConfigSchema.optional(),
    'google-cloud-vision': seeBackendGoogleCloudConfigSchema.optional(),
    'azure-vision': seeBackendAzureConfigSchema.optional(),
})
    .strict();
/**
 * Camera (See) configuration
 */
export const seeConfigSchema = z
    .object({
    cameraResolution: z.tuple([z.number(), z.number()]).optional(),
    verticalFlip: z.boolean().optional(),
    horizontalFlip: z.boolean().optional(),
    captureTimeout: z.number().optional(),
    zeroShutterLag: z.boolean().optional(),
    backend: seeBackendConfigSchema.optional(),
})
    .loose();
/**
 * LED configuration
 */
export const ledNeopixelConfigSchema = z
    .object({
    gpioPin: z.number().optional(),
    spiInterface: z.string().optional(),
    useGRBFormat: z.boolean().optional(),
})
    .loose();
export const ledCommonAnodeConfigSchema = z
    .object({
    redPin: z.number().optional(),
    greenPin: z.number().optional(),
    bluePin: z.number().optional(),
})
    .loose();
export const shineConfigSchema = z
    .object({
    hasNeopixelLED: z.boolean().optional(),
    hasCommonAnodeLED: z.boolean().optional(),
    neopixel: ledNeopixelConfigSchema.optional(),
    commonanode: ledCommonAnodeConfigSchema.optional(),
})
    .loose();
/**
 * TTS Backend configuration with discriminated union based on type field
 */
export const ttsBackendTypeSchema = z.enum(['none', 'local', 'ibm-watson-tts', 'google-cloud-tts', 'azure-tts']);
export const ttsBackendLocalConfigSchema = z
    .object({
    model: z.string().optional(),
})
    .loose();
export const ttsBackendIBMWatsonConfigSchema = z
    .object({
    credentialsPath: z.string().optional(),
    voice: z.string().optional(),
})
    .loose();
export const ttsBackendGoogleCloudConfigSchema = z
    .object({
    languageCode: z.string().optional(),
    credentialsPath: z.string().optional(),
})
    .loose();
export const ttsBackendAzureConfigSchema = z
    .object({
    voice: z.string().optional(),
    credentialsPath: z.string().optional(),
})
    .loose();
export const ttsBackendConfigSchema = z
    .object({
    type: ttsBackendTypeSchema,
    local: ttsBackendLocalConfigSchema.optional(),
    'ibm-watson-tts': ttsBackendIBMWatsonConfigSchema.optional(),
    'google-cloud-tts': ttsBackendGoogleCloudConfigSchema.optional(),
    'azure-tts': ttsBackendAzureConfigSchema.optional(),
})
    .strict()
    .refine((config) => {
    // If type is 'none', no additional config needed
    if (config.type === 'none') {
        return true;
    }
    // For other types, we don't enforce anything here
    return true;
});
/**
 * Text-to-speech (Speak) configuration
 */
export const speakConfigSchema = z
    .object({
    device: z.string().optional(),
    backend: ttsBackendConfigSchema.optional(),
})
    .loose();
/**
 * Servo/Arm (Wave) configuration
 */
export const waveConfigSchema = z
    .object({
    servoPin: z.number().optional(),
})
    .loose();
/**
 * Hardware configuration
 */
export const hardwareConfigSchema = z
    .object({
    speaker: z.boolean().optional(),
    microphone: z.boolean().optional(),
    led: z.boolean().optional(),
    servo: z.boolean().optional(),
    camera: z.boolean().optional(),
})
    .loose();
/**
 * User-defined model configuration
 * Allows users to register custom models via TOML [models] section
 */
export const modelEntrySchema = z
    .object({
    type: z.enum([
        'stt',
        'tts',
        'vad',
        'vision.object-recognition',
        'vision.classification',
        'vision.face-detection',
        'vision.image-description',
    ]),
    key: z.string(),
    label: z.string(),
    url: z.string(),
    folder: z.string().optional(),
    kind: z.string().optional(),
    inputShape: z.array(z.number()).optional(),
    labelUrl: z.string().optional(),
    required: z.array(z.string()).optional(),
})
    .strict();
export const modelsConfigSchema = z.array(modelEntrySchema).optional();
/**
 * Type guard functions for safe backend config narrowing
 */
/**
 * Extract backend-specific config from STTBackendConfig based on type.
 * Returns the appropriate config object for the backend type, or empty object if no match.
 */
export function getSTTBackendConfig(backendConfig, backendType) {
    if (!backendConfig) {
        return {};
    }
    switch (backendType) {
        case 'none':
            return {};
        case 'local':
            return (backendConfig.local ?? {});
        case 'ibm-watson-stt':
            return (backendConfig['ibm-watson-stt'] ?? {});
        case 'google-cloud-stt':
            return (backendConfig['google-cloud-stt'] ?? {});
        case 'azure-stt':
            return (backendConfig['azure-stt'] ?? {});
        default:
            return {};
    }
}
/**
 * Extract backend-specific config from TTSBackendConfig based on type.
 * Returns the appropriate config object for the backend type, or empty object if no match.
 */
export function getTTSBackendConfig(backendConfig, backendType) {
    if (!backendConfig) {
        return {};
    }
    switch (backendType) {
        case 'none':
            return {};
        case 'local':
            return (backendConfig.local ?? {});
        case 'ibm-watson-tts':
            return (backendConfig['ibm-watson-tts'] ?? {});
        case 'google-cloud-tts':
            return (backendConfig['google-cloud-tts'] ?? {});
        case 'azure-tts':
            return (backendConfig['azure-tts'] ?? {});
        default:
            return {};
    }
}
/**
 * Extract backend-specific config from SeeBackendConfig based on type.
 * Returns the appropriate config object for the backend type, or empty object if no match.
 */
export function getSeeBackendConfig(backendConfig, backendType) {
    if (!backendConfig) {
        return {};
    }
    switch (backendType) {
        case 'none':
            return {};
        case 'local':
            return (backendConfig.local ?? {});
        case 'google-cloud-vision':
            return (backendConfig['google-cloud-vision'] ?? {});
        case 'azure-vision':
            return (backendConfig['azure-vision'] ?? {});
        default:
            return {};
    }
}
/**
 * Complete TJBot configuration
 */
export const tjbotConfigSchema = z
    .object({
    log: logConfigSchema.optional(),
    hardware: hardwareConfigSchema.optional(),
    listen: listenConfigSchema.optional(),
    see: seeConfigSchema.optional(),
    shine: shineConfigSchema.optional(),
    speak: speakConfigSchema.optional(),
    wave: waveConfigSchema.optional(),
    models: modelsConfigSchema,
    // Use explicit key schema to satisfy TS signature for z.record
    recipe: z.record(z.string(), z.any()).optional(),
})
    .loose();
//# sourceMappingURL=config-types.js.map