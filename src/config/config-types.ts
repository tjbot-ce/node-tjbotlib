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
export type LogConfig = z.infer<typeof logConfigSchema>;

/**
 * STT Backend configuration
 */
export const sttBackendTypeSchema = z.enum(['local', 'ibm-watson-stt', 'google-cloud-stt', 'azure-stt']);
export type STTBackendType = z.infer<typeof sttBackendTypeSchema>;

/**
 * Custom model configuration for overriding default models from registry
 * If customModel is specified, both 'model' and 'url' must be provided
 */
export const customModelConfigSchema = z
    .object({
        model: z.string().optional(),
        url: z.string().optional(),
    })
    .superRefine((data, ctx) => {
        const hasModel = data.model !== undefined && data.model !== '';
        const hasUrl = data.url !== undefined && data.url !== '';

        if ((hasModel && !hasUrl) || (!hasModel && hasUrl)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Custom model configuration must have both "model" and "url" specified, or neither',
                path: hasModel ? ['url'] : ['model'],
            });
        }
    })
    .loose();
export type CustomModelConfig = z.infer<typeof customModelConfigSchema>;

export const vadConfigSchema = z
    .object({
        enabled: z.boolean().optional(),
        /** Optional model filename (e.g., silero_vad.onnx) */
        model: z.string().optional(),
        'custom-model': customModelConfigSchema.optional(),
    })
    .loose();
export type VADConfig = z.infer<typeof vadConfigSchema>;

export const sttBackendLocalConfigSchema = z
    .object({
        model: z.string().optional(),
        vad: vadConfigSchema.optional(),
        'custom-model': customModelConfigSchema.optional(),
    })
    .loose();
export type STTBackendLocalConfig = z.infer<typeof sttBackendLocalConfigSchema>;

export const sttBackendIBMWatsonConfigSchema = z
    .object({
        model: z.string().optional(),
        inactivityTimeout: z.number().optional(),
        backgroundAudioSuppression: z.number().optional(),
        interimResults: z.boolean().optional(),
        credentialsPath: z.string().optional(),
    })
    .loose();
export type STTBackendIBMWatsonConfig = z.infer<typeof sttBackendIBMWatsonConfigSchema>;

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
export type STTBackendGoogleCloudConfig = z.infer<typeof sttBackendGoogleCloudConfigSchema>;

export const sttBackendAzureConfigSchema = z
    .object({
        language: z.string().optional(),
        credentialsPath: z.string().optional(),
    })
    .loose();
export type STTBackendAzureConfig = z.infer<typeof sttBackendAzureConfigSchema>;

export const sttBackendConfigSchema = z
    .object({
        type: sttBackendTypeSchema.optional(),
        local: sttBackendLocalConfigSchema.optional(),
        'ibm-watson-stt': sttBackendIBMWatsonConfigSchema.optional(),
        'google-cloud-stt': sttBackendGoogleCloudConfigSchema.optional(),
        'azure-stt': sttBackendAzureConfigSchema.optional(),
    })
    .loose();
export type STTBackendConfig = z.infer<typeof sttBackendConfigSchema>;

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
export type ListenConfig = z.infer<typeof listenConfigSchema>;

/**
 * SEE (CV) Backend configuration
 */
export const seeBackendTypeSchema = z.enum(['local', 'google-cloud-vision', 'azure-vision']);
export type SeeBackendType = z.infer<typeof seeBackendTypeSchema>;

export const seeBackendLocalConfigSchema = z
    .object({
        detectionModel: z.string().optional(),
        classificationModel: z.string().optional(),
        faceDetectionModel: z.string().optional(),
    })
    .loose();
export type SeeBackendLocalConfig = z.infer<typeof seeBackendLocalConfigSchema>;

export const seeBackendGoogleCloudConfigSchema = z
    .object({
        credentialsPath: z.string().optional(),
        model: z.string().optional(),
    })
    .loose();
export type SeeBackendGoogleCloudConfig = z.infer<typeof seeBackendGoogleCloudConfigSchema>;

export const seeBackendAzureConfigSchema = z
    .object({
        credentialsPath: z.string().optional(),
        model: z.string().optional(),
    })
    .loose();
export type SeeBackendAzureConfig = z.infer<typeof seeBackendAzureConfigSchema>;

export const seeBackendConfigSchema = z
    .object({
        type: seeBackendTypeSchema.optional(),
        local: seeBackendLocalConfigSchema.optional(),
        'google-cloud-vision': seeBackendGoogleCloudConfigSchema.optional(),
        'azure-vision': seeBackendAzureConfigSchema.optional(),
    })
    .loose();
export type SeeBackendConfig = z.infer<typeof seeBackendConfigSchema>;

/**
 * Camera (See) configuration
 */
export const seeConfigSchema = z
    .object({
        cameraResolution: z.tuple([z.number(), z.number()]).optional(),
        verticalFlip: z.boolean().optional(),
        horizontalFlip: z.boolean().optional(),
        backend: seeBackendConfigSchema.optional(),
    })
    .loose();
export type SeeConfig = z.infer<typeof seeConfigSchema>;

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
export type LEDNeopixelConfig = z.infer<typeof ledNeopixelConfigSchema>;

export const ledCommonAnodeConfigSchema = z
    .object({
        redPin: z.number().optional(),
        greenPin: z.number().optional(),
        bluePin: z.number().optional(),
    })
    .loose();
export type LEDCommonAnodeConfig = z.infer<typeof ledCommonAnodeConfigSchema>;

export const shineConfigSchema = z
    .object({
        neopixel: ledNeopixelConfigSchema.optional(),
        commonanode: ledCommonAnodeConfigSchema.optional(),
    })
    .loose();
export type ShineConfig = z.infer<typeof shineConfigSchema>;

/**
 * TTS Backend configuration
 */
export const ttsBackendTypeSchema = z.enum(['local', 'ibm-watson-tts', 'google-cloud-tts', 'azure-tts']);
export type TTSBackendType = z.infer<typeof ttsBackendTypeSchema>;

export const ttsBackendLocalConfigSchema = z
    .object({
        model: z.string().optional(),
        'custom-model': customModelConfigSchema.optional(),
    })
    .loose();
export type TTSBackendLocalConfig = z.infer<typeof ttsBackendLocalConfigSchema>;

export const ttsBackendIBMWatsonConfigSchema = z
    .object({
        credentialsPath: z.string().optional(),
        voice: z.string().optional(),
    })
    .loose();
export type TTSBackendIBMWatsonConfig = z.infer<typeof ttsBackendIBMWatsonConfigSchema>;

export const ttsBackendGoogleCloudConfigSchema = z
    .object({
        languageCode: z.string().optional(),
        credentialsPath: z.string().optional(),
    })
    .loose();
export type TTSBackendGoogleCloudConfig = z.infer<typeof ttsBackendGoogleCloudConfigSchema>;

export const ttsBackendAzureConfigSchema = z
    .object({
        voice: z.string().optional(),
        credentialsPath: z.string().optional(),
    })
    .loose();
export type TTSBackendAzureConfig = z.infer<typeof ttsBackendAzureConfigSchema>;

export const ttsBackendConfigSchema = z
    .object({
        type: ttsBackendTypeSchema.optional(),
        local: ttsBackendLocalConfigSchema.optional(),
        'ibm-watson-tts': ttsBackendIBMWatsonConfigSchema.optional(),
        'google-cloud-tts': ttsBackendGoogleCloudConfigSchema.optional(),
        'azure-tts': ttsBackendAzureConfigSchema.optional(),
    })
    .loose();
export type TTSBackendConfig = z.infer<typeof ttsBackendConfigSchema>;

/**
 * Text-to-speech (Speak) configuration
 */
export const speakConfigSchema = z
    .object({
        device: z.string().optional(),
        backend: ttsBackendConfigSchema.optional(),
    })
    .loose();
export type SpeakConfig = z.infer<typeof speakConfigSchema>;

/**
 * Servo/Arm (Wave) configuration
 */
export const waveConfigSchema = z
    .object({
        gpioChip: z.number().optional(),
        servoPin: z.number().optional(),
    })
    .loose();
export type WaveConfig = z.infer<typeof waveConfigSchema>;

/**
 * Hardware configuration
 */
export const hardwareConfigSchema = z
    .object({
        speaker: z.boolean().optional(),
        microphone: z.boolean().optional(),
        led_common_anode: z.boolean().optional(),
        led_neopixel: z.boolean().optional(),
        servo: z.boolean().optional(),
        camera: z.boolean().optional(),
    })
    .loose();
export type HardwareConfig = z.infer<typeof hardwareConfigSchema>;

/**
 * TTS & STT Engine configuration (used for TTSEngine & STTEngine constructors)
 */
export type TTSEngineConfig = Record<string, unknown>;

export type STTEngineConfig = Record<string, unknown>;

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
        // Use explicit key schema to satisfy TS signature for z.record
        recipe: z.record(z.string(), z.any()).optional(),
    })
    .loose();
export type TJBotConfigSchema = z.infer<typeof tjbotConfigSchema>;
