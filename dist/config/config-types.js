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
    .passthrough();
/**
 * STT Backend configuration
 */
export const sttBackendTypeSchema = z.enum(['local', 'ibm-watson-stt', 'google-cloud-stt', 'azure-stt']);
export const vadConfigSchema = z
    .object({
    enabled: z.boolean().optional(),
    /** Optional model filename (e.g., silero_vad.onnx) */
    model: z.string().optional(),
    /** Optional URL for the VAD model download */
    modelUrl: z.string().optional(),
})
    .passthrough();
export const sttBackendLocalConfigSchema = z
    .object({
    model: z.string().optional(),
    modelUrl: z.string().optional(),
    vad: vadConfigSchema.optional(),
})
    .passthrough();
export const sttBackendIBMWatsonConfigSchema = z
    .object({
    model: z.string().optional(),
    inactivityTimeout: z.number().optional(),
    backgroundAudioSuppression: z.number().optional(),
    interimResults: z.boolean().optional(),
    credentialsPath: z.string().optional(),
})
    .passthrough();
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
    .passthrough();
export const sttBackendAzureConfigSchema = z
    .object({
    language: z.string().optional(),
    credentialsPath: z.string().optional(),
})
    .passthrough();
export const sttBackendConfigSchema = z
    .object({
    type: sttBackendTypeSchema.optional(),
    local: sttBackendLocalConfigSchema.optional(),
    'ibm-watson-stt': sttBackendIBMWatsonConfigSchema.optional(),
    'google-cloud-stt': sttBackendGoogleCloudConfigSchema.optional(),
    'azure-stt': sttBackendAzureConfigSchema.optional(),
})
    .passthrough();
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
    .passthrough();
/**
 * Camera (See) configuration
 */
export const seeConfigSchema = z
    .object({
    cameraResolution: z.tuple([z.number(), z.number()]).optional(),
    verticalFlip: z.boolean().optional(),
    horizontalFlip: z.boolean().optional(),
})
    .passthrough();
/**
 * LED configuration
 */
export const ledNeopixelConfigSchema = z
    .object({
    gpioPin: z.number().optional(),
    spiInterface: z.string().optional(),
    useGRBFormat: z.boolean().optional(),
})
    .passthrough();
export const ledCommonAnodeConfigSchema = z
    .object({
    redPin: z.number().optional(),
    greenPin: z.number().optional(),
    bluePin: z.number().optional(),
})
    .passthrough();
export const shineConfigSchema = z
    .object({
    neopixel: ledNeopixelConfigSchema.optional(),
    commonanode: ledCommonAnodeConfigSchema.optional(),
})
    .passthrough();
/**
 * TTS Backend configuration
 */
export const ttsBackendTypeSchema = z.enum(['local', 'ibm-watson-tts', 'google-cloud-tts', 'azure-tts']);
export const ttsBackendLocalConfigSchema = z
    .object({
    model: z.string().optional(),
    modelUrl: z.string().optional(),
})
    .passthrough();
export const ttsBackendIBMWatsonConfigSchema = z
    .object({
    voice: z.string().optional(),
    credentialsPath: z.string().optional(),
})
    .passthrough();
export const ttsBackendGoogleCloudConfigSchema = z
    .object({
    voice: z.string().optional(),
    languageCode: z.string().optional(),
    credentialsPath: z.string().optional(),
})
    .passthrough();
export const ttsBackendAzureConfigSchema = z
    .object({
    voice: z.string().optional(),
    credentialsPath: z.string().optional(),
})
    .passthrough();
export const ttsBackendConfigSchema = z
    .object({
    type: ttsBackendTypeSchema.optional(),
    local: ttsBackendLocalConfigSchema.optional(),
    'ibm-watson-tts': ttsBackendIBMWatsonConfigSchema.optional(),
    'google-cloud-tts': ttsBackendGoogleCloudConfigSchema.optional(),
    'azure-tts': ttsBackendAzureConfigSchema.optional(),
})
    .passthrough();
/**
 * Text-to-speech (Speak) configuration
 */
export const speakConfigSchema = z
    .object({
    device: z.string().optional(),
    backend: ttsBackendConfigSchema.optional(),
})
    .passthrough();
/**
 * Servo/Arm (Wave) configuration
 */
export const waveConfigSchema = z
    .object({
    gpioChip: z.number().optional(),
    servoPin: z.number().optional(),
})
    .passthrough();
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
    .passthrough();
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
    .passthrough();
//# sourceMappingURL=config-types.js.map