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
declare const logConfigSchema: z.ZodObject<{
    level: z.ZodOptional<z.ZodString>;
}, z.core.$loose>;
export type LogConfig = z.infer<typeof logConfigSchema>;
/**
 * STT Backend configuration
 */
export declare const sttBackendTypeSchema: z.ZodEnum<{
    local: "local";
    "ibm-watson-stt": "ibm-watson-stt";
    "google-cloud-stt": "google-cloud-stt";
    "azure-stt": "azure-stt";
}>;
export type STTBackendType = z.infer<typeof sttBackendTypeSchema>;
export declare const vadConfigSchema: z.ZodObject<{
    enabled: z.ZodOptional<z.ZodBoolean>;
    model: z.ZodOptional<z.ZodString>;
}, z.core.$loose>;
export type VADConfig = z.infer<typeof vadConfigSchema>;
export declare const sttBackendLocalConfigSchema: z.ZodObject<{
    model: z.ZodOptional<z.ZodString>;
    vad: z.ZodOptional<z.ZodObject<{
        enabled: z.ZodOptional<z.ZodBoolean>;
        model: z.ZodOptional<z.ZodString>;
    }, z.core.$loose>>;
}, z.core.$loose>;
export type STTBackendLocalConfig = z.infer<typeof sttBackendLocalConfigSchema>;
export declare const sttBackendIBMWatsonConfigSchema: z.ZodObject<{
    model: z.ZodOptional<z.ZodString>;
    inactivityTimeout: z.ZodOptional<z.ZodNumber>;
    backgroundAudioSuppression: z.ZodOptional<z.ZodNumber>;
    interimResults: z.ZodOptional<z.ZodBoolean>;
    credentialsPath: z.ZodOptional<z.ZodString>;
}, z.core.$loose>;
export type STTBackendIBMWatsonConfig = z.infer<typeof sttBackendIBMWatsonConfigSchema>;
export declare const sttBackendGoogleCloudConfigSchema: z.ZodObject<{
    model: z.ZodOptional<z.ZodString>;
    languageCode: z.ZodOptional<z.ZodString>;
    credentialsPath: z.ZodOptional<z.ZodString>;
    encoding: z.ZodOptional<z.ZodString>;
    sampleRateHertz: z.ZodOptional<z.ZodNumber>;
    audioChannelCount: z.ZodOptional<z.ZodNumber>;
    enableAutomaticPunctuation: z.ZodOptional<z.ZodBoolean>;
    interimResults: z.ZodOptional<z.ZodBoolean>;
}, z.core.$loose>;
export type STTBackendGoogleCloudConfig = z.infer<typeof sttBackendGoogleCloudConfigSchema>;
export declare const sttBackendAzureConfigSchema: z.ZodObject<{
    language: z.ZodOptional<z.ZodString>;
    credentialsPath: z.ZodOptional<z.ZodString>;
}, z.core.$loose>;
export type STTBackendAzureConfig = z.infer<typeof sttBackendAzureConfigSchema>;
export declare const sttBackendConfigSchema: z.ZodObject<{
    type: z.ZodOptional<z.ZodEnum<{
        local: "local";
        "ibm-watson-stt": "ibm-watson-stt";
        "google-cloud-stt": "google-cloud-stt";
        "azure-stt": "azure-stt";
    }>>;
    local: z.ZodOptional<z.ZodObject<{
        model: z.ZodOptional<z.ZodString>;
        vad: z.ZodOptional<z.ZodObject<{
            enabled: z.ZodOptional<z.ZodBoolean>;
            model: z.ZodOptional<z.ZodString>;
        }, z.core.$loose>>;
    }, z.core.$loose>>;
    'ibm-watson-stt': z.ZodOptional<z.ZodObject<{
        model: z.ZodOptional<z.ZodString>;
        inactivityTimeout: z.ZodOptional<z.ZodNumber>;
        backgroundAudioSuppression: z.ZodOptional<z.ZodNumber>;
        interimResults: z.ZodOptional<z.ZodBoolean>;
        credentialsPath: z.ZodOptional<z.ZodString>;
    }, z.core.$loose>>;
    'google-cloud-stt': z.ZodOptional<z.ZodObject<{
        model: z.ZodOptional<z.ZodString>;
        languageCode: z.ZodOptional<z.ZodString>;
        credentialsPath: z.ZodOptional<z.ZodString>;
        encoding: z.ZodOptional<z.ZodString>;
        sampleRateHertz: z.ZodOptional<z.ZodNumber>;
        audioChannelCount: z.ZodOptional<z.ZodNumber>;
        enableAutomaticPunctuation: z.ZodOptional<z.ZodBoolean>;
        interimResults: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$loose>>;
    'azure-stt': z.ZodOptional<z.ZodObject<{
        language: z.ZodOptional<z.ZodString>;
        credentialsPath: z.ZodOptional<z.ZodString>;
    }, z.core.$loose>>;
}, z.core.$loose>;
export type STTBackendConfig = z.infer<typeof sttBackendConfigSchema>;
/**
 * Speech-to-text (Listen) configuration
 */
export declare const listenConfigSchema: z.ZodObject<{
    device: z.ZodOptional<z.ZodString>;
    microphoneRate: z.ZodOptional<z.ZodNumber>;
    microphoneChannels: z.ZodOptional<z.ZodNumber>;
    model: z.ZodOptional<z.ZodString>;
    backend: z.ZodOptional<z.ZodObject<{
        type: z.ZodOptional<z.ZodEnum<{
            local: "local";
            "ibm-watson-stt": "ibm-watson-stt";
            "google-cloud-stt": "google-cloud-stt";
            "azure-stt": "azure-stt";
        }>>;
        local: z.ZodOptional<z.ZodObject<{
            model: z.ZodOptional<z.ZodString>;
            vad: z.ZodOptional<z.ZodObject<{
                enabled: z.ZodOptional<z.ZodBoolean>;
                model: z.ZodOptional<z.ZodString>;
            }, z.core.$loose>>;
        }, z.core.$loose>>;
        'ibm-watson-stt': z.ZodOptional<z.ZodObject<{
            model: z.ZodOptional<z.ZodString>;
            inactivityTimeout: z.ZodOptional<z.ZodNumber>;
            backgroundAudioSuppression: z.ZodOptional<z.ZodNumber>;
            interimResults: z.ZodOptional<z.ZodBoolean>;
            credentialsPath: z.ZodOptional<z.ZodString>;
        }, z.core.$loose>>;
        'google-cloud-stt': z.ZodOptional<z.ZodObject<{
            model: z.ZodOptional<z.ZodString>;
            languageCode: z.ZodOptional<z.ZodString>;
            credentialsPath: z.ZodOptional<z.ZodString>;
            encoding: z.ZodOptional<z.ZodString>;
            sampleRateHertz: z.ZodOptional<z.ZodNumber>;
            audioChannelCount: z.ZodOptional<z.ZodNumber>;
            enableAutomaticPunctuation: z.ZodOptional<z.ZodBoolean>;
            interimResults: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$loose>>;
        'azure-stt': z.ZodOptional<z.ZodObject<{
            language: z.ZodOptional<z.ZodString>;
            credentialsPath: z.ZodOptional<z.ZodString>;
        }, z.core.$loose>>;
    }, z.core.$loose>>;
}, z.core.$loose>;
export type ListenConfig = z.infer<typeof listenConfigSchema>;
/**
 * SEE (CV) Backend configuration
 */
export declare const seeBackendTypeSchema: z.ZodEnum<{
    local: "local";
    "google-cloud-vision": "google-cloud-vision";
    "azure-vision": "azure-vision";
}>;
export type SeeBackendType = z.infer<typeof seeBackendTypeSchema>;
export declare const seeBackendLocalConfigSchema: z.ZodObject<{
    objectDetectionModel: z.ZodOptional<z.ZodString>;
    imageClassificationModel: z.ZodOptional<z.ZodString>;
    faceDetectionModel: z.ZodOptional<z.ZodString>;
    objectDetectionConfidence: z.ZodOptional<z.ZodNumber>;
    imageClassificationConfidence: z.ZodOptional<z.ZodNumber>;
    faceDetectionConfidence: z.ZodOptional<z.ZodNumber>;
}, z.core.$loose>;
export type SeeBackendLocalConfig = z.infer<typeof seeBackendLocalConfigSchema>;
export declare const seeBackendGoogleCloudConfigSchema: z.ZodObject<{
    credentialsPath: z.ZodOptional<z.ZodString>;
    model: z.ZodOptional<z.ZodString>;
}, z.core.$loose>;
export type SeeBackendGoogleCloudConfig = z.infer<typeof seeBackendGoogleCloudConfigSchema>;
export declare const seeBackendAzureConfigSchema: z.ZodObject<{
    credentialsPath: z.ZodOptional<z.ZodString>;
    model: z.ZodOptional<z.ZodString>;
}, z.core.$loose>;
export type SeeBackendAzureConfig = z.infer<typeof seeBackendAzureConfigSchema>;
export declare const seeBackendConfigSchema: z.ZodObject<{
    type: z.ZodOptional<z.ZodEnum<{
        local: "local";
        "google-cloud-vision": "google-cloud-vision";
        "azure-vision": "azure-vision";
    }>>;
    local: z.ZodOptional<z.ZodObject<{
        objectDetectionModel: z.ZodOptional<z.ZodString>;
        imageClassificationModel: z.ZodOptional<z.ZodString>;
        faceDetectionModel: z.ZodOptional<z.ZodString>;
        objectDetectionConfidence: z.ZodOptional<z.ZodNumber>;
        imageClassificationConfidence: z.ZodOptional<z.ZodNumber>;
        faceDetectionConfidence: z.ZodOptional<z.ZodNumber>;
    }, z.core.$loose>>;
    'google-cloud-vision': z.ZodOptional<z.ZodObject<{
        credentialsPath: z.ZodOptional<z.ZodString>;
        model: z.ZodOptional<z.ZodString>;
    }, z.core.$loose>>;
    'azure-vision': z.ZodOptional<z.ZodObject<{
        credentialsPath: z.ZodOptional<z.ZodString>;
        model: z.ZodOptional<z.ZodString>;
    }, z.core.$loose>>;
}, z.core.$loose>;
export type SeeBackendConfig = z.infer<typeof seeBackendConfigSchema>;
/**
 * Camera (See) configuration
 */
export declare const seeConfigSchema: z.ZodObject<{
    cameraResolution: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>>;
    verticalFlip: z.ZodOptional<z.ZodBoolean>;
    horizontalFlip: z.ZodOptional<z.ZodBoolean>;
    backend: z.ZodOptional<z.ZodObject<{
        type: z.ZodOptional<z.ZodEnum<{
            local: "local";
            "google-cloud-vision": "google-cloud-vision";
            "azure-vision": "azure-vision";
        }>>;
        local: z.ZodOptional<z.ZodObject<{
            objectDetectionModel: z.ZodOptional<z.ZodString>;
            imageClassificationModel: z.ZodOptional<z.ZodString>;
            faceDetectionModel: z.ZodOptional<z.ZodString>;
            objectDetectionConfidence: z.ZodOptional<z.ZodNumber>;
            imageClassificationConfidence: z.ZodOptional<z.ZodNumber>;
            faceDetectionConfidence: z.ZodOptional<z.ZodNumber>;
        }, z.core.$loose>>;
        'google-cloud-vision': z.ZodOptional<z.ZodObject<{
            credentialsPath: z.ZodOptional<z.ZodString>;
            model: z.ZodOptional<z.ZodString>;
        }, z.core.$loose>>;
        'azure-vision': z.ZodOptional<z.ZodObject<{
            credentialsPath: z.ZodOptional<z.ZodString>;
            model: z.ZodOptional<z.ZodString>;
        }, z.core.$loose>>;
    }, z.core.$loose>>;
}, z.core.$loose>;
export type SeeConfig = z.infer<typeof seeConfigSchema>;
/**
 * LED configuration
 */
export declare const ledNeopixelConfigSchema: z.ZodObject<{
    gpioPin: z.ZodOptional<z.ZodNumber>;
    spiInterface: z.ZodOptional<z.ZodString>;
    useGRBFormat: z.ZodOptional<z.ZodBoolean>;
}, z.core.$loose>;
export type LEDNeopixelConfig = z.infer<typeof ledNeopixelConfigSchema>;
export declare const ledCommonAnodeConfigSchema: z.ZodObject<{
    redPin: z.ZodOptional<z.ZodNumber>;
    greenPin: z.ZodOptional<z.ZodNumber>;
    bluePin: z.ZodOptional<z.ZodNumber>;
}, z.core.$loose>;
export type LEDCommonAnodeConfig = z.infer<typeof ledCommonAnodeConfigSchema>;
export declare const shineConfigSchema: z.ZodObject<{
    neopixel: z.ZodOptional<z.ZodObject<{
        gpioPin: z.ZodOptional<z.ZodNumber>;
        spiInterface: z.ZodOptional<z.ZodString>;
        useGRBFormat: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$loose>>;
    commonanode: z.ZodOptional<z.ZodObject<{
        redPin: z.ZodOptional<z.ZodNumber>;
        greenPin: z.ZodOptional<z.ZodNumber>;
        bluePin: z.ZodOptional<z.ZodNumber>;
    }, z.core.$loose>>;
}, z.core.$loose>;
export type ShineConfig = z.infer<typeof shineConfigSchema>;
/**
 * TTS Backend configuration
 */
export declare const ttsBackendTypeSchema: z.ZodEnum<{
    local: "local";
    "ibm-watson-tts": "ibm-watson-tts";
    "google-cloud-tts": "google-cloud-tts";
    "azure-tts": "azure-tts";
}>;
export type TTSBackendType = z.infer<typeof ttsBackendTypeSchema>;
export declare const ttsBackendLocalConfigSchema: z.ZodObject<{
    model: z.ZodOptional<z.ZodString>;
}, z.core.$loose>;
export type TTSBackendLocalConfig = z.infer<typeof ttsBackendLocalConfigSchema>;
export declare const ttsBackendIBMWatsonConfigSchema: z.ZodObject<{
    credentialsPath: z.ZodOptional<z.ZodString>;
    voice: z.ZodOptional<z.ZodString>;
}, z.core.$loose>;
export type TTSBackendIBMWatsonConfig = z.infer<typeof ttsBackendIBMWatsonConfigSchema>;
export declare const ttsBackendGoogleCloudConfigSchema: z.ZodObject<{
    languageCode: z.ZodOptional<z.ZodString>;
    credentialsPath: z.ZodOptional<z.ZodString>;
}, z.core.$loose>;
export type TTSBackendGoogleCloudConfig = z.infer<typeof ttsBackendGoogleCloudConfigSchema>;
export declare const ttsBackendAzureConfigSchema: z.ZodObject<{
    voice: z.ZodOptional<z.ZodString>;
    credentialsPath: z.ZodOptional<z.ZodString>;
}, z.core.$loose>;
export type TTSBackendAzureConfig = z.infer<typeof ttsBackendAzureConfigSchema>;
export declare const ttsBackendConfigSchema: z.ZodObject<{
    type: z.ZodOptional<z.ZodEnum<{
        local: "local";
        "ibm-watson-tts": "ibm-watson-tts";
        "google-cloud-tts": "google-cloud-tts";
        "azure-tts": "azure-tts";
    }>>;
    local: z.ZodOptional<z.ZodObject<{
        model: z.ZodOptional<z.ZodString>;
    }, z.core.$loose>>;
    'ibm-watson-tts': z.ZodOptional<z.ZodObject<{
        credentialsPath: z.ZodOptional<z.ZodString>;
        voice: z.ZodOptional<z.ZodString>;
    }, z.core.$loose>>;
    'google-cloud-tts': z.ZodOptional<z.ZodObject<{
        languageCode: z.ZodOptional<z.ZodString>;
        credentialsPath: z.ZodOptional<z.ZodString>;
    }, z.core.$loose>>;
    'azure-tts': z.ZodOptional<z.ZodObject<{
        voice: z.ZodOptional<z.ZodString>;
        credentialsPath: z.ZodOptional<z.ZodString>;
    }, z.core.$loose>>;
}, z.core.$loose>;
export type TTSBackendConfig = z.infer<typeof ttsBackendConfigSchema>;
/**
 * Text-to-speech (Speak) configuration
 */
export declare const speakConfigSchema: z.ZodObject<{
    device: z.ZodOptional<z.ZodString>;
    backend: z.ZodOptional<z.ZodObject<{
        type: z.ZodOptional<z.ZodEnum<{
            local: "local";
            "ibm-watson-tts": "ibm-watson-tts";
            "google-cloud-tts": "google-cloud-tts";
            "azure-tts": "azure-tts";
        }>>;
        local: z.ZodOptional<z.ZodObject<{
            model: z.ZodOptional<z.ZodString>;
        }, z.core.$loose>>;
        'ibm-watson-tts': z.ZodOptional<z.ZodObject<{
            credentialsPath: z.ZodOptional<z.ZodString>;
            voice: z.ZodOptional<z.ZodString>;
        }, z.core.$loose>>;
        'google-cloud-tts': z.ZodOptional<z.ZodObject<{
            languageCode: z.ZodOptional<z.ZodString>;
            credentialsPath: z.ZodOptional<z.ZodString>;
        }, z.core.$loose>>;
        'azure-tts': z.ZodOptional<z.ZodObject<{
            voice: z.ZodOptional<z.ZodString>;
            credentialsPath: z.ZodOptional<z.ZodString>;
        }, z.core.$loose>>;
    }, z.core.$loose>>;
}, z.core.$loose>;
export type SpeakConfig = z.infer<typeof speakConfigSchema>;
/**
 * Servo/Arm (Wave) configuration
 */
export declare const waveConfigSchema: z.ZodObject<{
    gpioChip: z.ZodOptional<z.ZodNumber>;
    servoPin: z.ZodOptional<z.ZodNumber>;
}, z.core.$loose>;
export type WaveConfig = z.infer<typeof waveConfigSchema>;
/**
 * Hardware configuration
 */
export declare const hardwareConfigSchema: z.ZodObject<{
    speaker: z.ZodOptional<z.ZodBoolean>;
    microphone: z.ZodOptional<z.ZodBoolean>;
    led_common_anode: z.ZodOptional<z.ZodBoolean>;
    led_neopixel: z.ZodOptional<z.ZodBoolean>;
    servo: z.ZodOptional<z.ZodBoolean>;
    camera: z.ZodOptional<z.ZodBoolean>;
}, z.core.$loose>;
export type HardwareConfig = z.infer<typeof hardwareConfigSchema>;
/**
 * User-defined model configuration
 * Allows users to register custom models via TOML [models] section
 */
export declare const modelEntrySchema: z.ZodObject<{
    type: z.ZodEnum<{
        vad: "vad";
        stt: "stt";
        tts: "tts";
        "vision.object-recognition": "vision.object-recognition";
        "vision.classification": "vision.classification";
        "vision.face-detection": "vision.face-detection";
        "vision.image-description": "vision.image-description";
    }>;
    key: z.ZodString;
    label: z.ZodString;
    url: z.ZodString;
    folder: z.ZodOptional<z.ZodString>;
    kind: z.ZodOptional<z.ZodString>;
    inputShape: z.ZodOptional<z.ZodArray<z.ZodNumber>>;
    labelUrl: z.ZodOptional<z.ZodString>;
    required: z.ZodOptional<z.ZodArray<z.ZodString>>;
}, z.core.$strict>;
export type ModelEntry = z.infer<typeof modelEntrySchema>;
export declare const modelsConfigSchema: z.ZodOptional<z.ZodArray<z.ZodObject<{
    type: z.ZodEnum<{
        vad: "vad";
        stt: "stt";
        tts: "tts";
        "vision.object-recognition": "vision.object-recognition";
        "vision.classification": "vision.classification";
        "vision.face-detection": "vision.face-detection";
        "vision.image-description": "vision.image-description";
    }>;
    key: z.ZodString;
    label: z.ZodString;
    url: z.ZodString;
    folder: z.ZodOptional<z.ZodString>;
    kind: z.ZodOptional<z.ZodString>;
    inputShape: z.ZodOptional<z.ZodArray<z.ZodNumber>>;
    labelUrl: z.ZodOptional<z.ZodString>;
    required: z.ZodOptional<z.ZodArray<z.ZodString>>;
}, z.core.$strict>>>;
export type ModelsConfig = z.infer<typeof modelsConfigSchema>;
/**
 * TTS & STT Engine configuration (used for TTSEngine & STTEngine constructors)
 */
export type TTSEngineConfig = Record<string, unknown>;
export type STTEngineConfig = Record<string, unknown>;
/**
 * Complete TJBot configuration
 */
export declare const tjbotConfigSchema: z.ZodObject<{
    log: z.ZodOptional<z.ZodObject<{
        level: z.ZodOptional<z.ZodString>;
    }, z.core.$loose>>;
    hardware: z.ZodOptional<z.ZodObject<{
        speaker: z.ZodOptional<z.ZodBoolean>;
        microphone: z.ZodOptional<z.ZodBoolean>;
        led_common_anode: z.ZodOptional<z.ZodBoolean>;
        led_neopixel: z.ZodOptional<z.ZodBoolean>;
        servo: z.ZodOptional<z.ZodBoolean>;
        camera: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$loose>>;
    listen: z.ZodOptional<z.ZodObject<{
        device: z.ZodOptional<z.ZodString>;
        microphoneRate: z.ZodOptional<z.ZodNumber>;
        microphoneChannels: z.ZodOptional<z.ZodNumber>;
        model: z.ZodOptional<z.ZodString>;
        backend: z.ZodOptional<z.ZodObject<{
            type: z.ZodOptional<z.ZodEnum<{
                local: "local";
                "ibm-watson-stt": "ibm-watson-stt";
                "google-cloud-stt": "google-cloud-stt";
                "azure-stt": "azure-stt";
            }>>;
            local: z.ZodOptional<z.ZodObject<{
                model: z.ZodOptional<z.ZodString>;
                vad: z.ZodOptional<z.ZodObject<{
                    enabled: z.ZodOptional<z.ZodBoolean>;
                    model: z.ZodOptional<z.ZodString>;
                }, z.core.$loose>>;
            }, z.core.$loose>>;
            'ibm-watson-stt': z.ZodOptional<z.ZodObject<{
                model: z.ZodOptional<z.ZodString>;
                inactivityTimeout: z.ZodOptional<z.ZodNumber>;
                backgroundAudioSuppression: z.ZodOptional<z.ZodNumber>;
                interimResults: z.ZodOptional<z.ZodBoolean>;
                credentialsPath: z.ZodOptional<z.ZodString>;
            }, z.core.$loose>>;
            'google-cloud-stt': z.ZodOptional<z.ZodObject<{
                model: z.ZodOptional<z.ZodString>;
                languageCode: z.ZodOptional<z.ZodString>;
                credentialsPath: z.ZodOptional<z.ZodString>;
                encoding: z.ZodOptional<z.ZodString>;
                sampleRateHertz: z.ZodOptional<z.ZodNumber>;
                audioChannelCount: z.ZodOptional<z.ZodNumber>;
                enableAutomaticPunctuation: z.ZodOptional<z.ZodBoolean>;
                interimResults: z.ZodOptional<z.ZodBoolean>;
            }, z.core.$loose>>;
            'azure-stt': z.ZodOptional<z.ZodObject<{
                language: z.ZodOptional<z.ZodString>;
                credentialsPath: z.ZodOptional<z.ZodString>;
            }, z.core.$loose>>;
        }, z.core.$loose>>;
    }, z.core.$loose>>;
    see: z.ZodOptional<z.ZodObject<{
        cameraResolution: z.ZodOptional<z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>>;
        verticalFlip: z.ZodOptional<z.ZodBoolean>;
        horizontalFlip: z.ZodOptional<z.ZodBoolean>;
        backend: z.ZodOptional<z.ZodObject<{
            type: z.ZodOptional<z.ZodEnum<{
                local: "local";
                "google-cloud-vision": "google-cloud-vision";
                "azure-vision": "azure-vision";
            }>>;
            local: z.ZodOptional<z.ZodObject<{
                objectDetectionModel: z.ZodOptional<z.ZodString>;
                imageClassificationModel: z.ZodOptional<z.ZodString>;
                faceDetectionModel: z.ZodOptional<z.ZodString>;
                objectDetectionConfidence: z.ZodOptional<z.ZodNumber>;
                imageClassificationConfidence: z.ZodOptional<z.ZodNumber>;
                faceDetectionConfidence: z.ZodOptional<z.ZodNumber>;
            }, z.core.$loose>>;
            'google-cloud-vision': z.ZodOptional<z.ZodObject<{
                credentialsPath: z.ZodOptional<z.ZodString>;
                model: z.ZodOptional<z.ZodString>;
            }, z.core.$loose>>;
            'azure-vision': z.ZodOptional<z.ZodObject<{
                credentialsPath: z.ZodOptional<z.ZodString>;
                model: z.ZodOptional<z.ZodString>;
            }, z.core.$loose>>;
        }, z.core.$loose>>;
    }, z.core.$loose>>;
    shine: z.ZodOptional<z.ZodObject<{
        neopixel: z.ZodOptional<z.ZodObject<{
            gpioPin: z.ZodOptional<z.ZodNumber>;
            spiInterface: z.ZodOptional<z.ZodString>;
            useGRBFormat: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$loose>>;
        commonanode: z.ZodOptional<z.ZodObject<{
            redPin: z.ZodOptional<z.ZodNumber>;
            greenPin: z.ZodOptional<z.ZodNumber>;
            bluePin: z.ZodOptional<z.ZodNumber>;
        }, z.core.$loose>>;
    }, z.core.$loose>>;
    speak: z.ZodOptional<z.ZodObject<{
        device: z.ZodOptional<z.ZodString>;
        backend: z.ZodOptional<z.ZodObject<{
            type: z.ZodOptional<z.ZodEnum<{
                local: "local";
                "ibm-watson-tts": "ibm-watson-tts";
                "google-cloud-tts": "google-cloud-tts";
                "azure-tts": "azure-tts";
            }>>;
            local: z.ZodOptional<z.ZodObject<{
                model: z.ZodOptional<z.ZodString>;
            }, z.core.$loose>>;
            'ibm-watson-tts': z.ZodOptional<z.ZodObject<{
                credentialsPath: z.ZodOptional<z.ZodString>;
                voice: z.ZodOptional<z.ZodString>;
            }, z.core.$loose>>;
            'google-cloud-tts': z.ZodOptional<z.ZodObject<{
                languageCode: z.ZodOptional<z.ZodString>;
                credentialsPath: z.ZodOptional<z.ZodString>;
            }, z.core.$loose>>;
            'azure-tts': z.ZodOptional<z.ZodObject<{
                voice: z.ZodOptional<z.ZodString>;
                credentialsPath: z.ZodOptional<z.ZodString>;
            }, z.core.$loose>>;
        }, z.core.$loose>>;
    }, z.core.$loose>>;
    wave: z.ZodOptional<z.ZodObject<{
        gpioChip: z.ZodOptional<z.ZodNumber>;
        servoPin: z.ZodOptional<z.ZodNumber>;
    }, z.core.$loose>>;
    models: z.ZodOptional<z.ZodArray<z.ZodObject<{
        type: z.ZodEnum<{
            vad: "vad";
            stt: "stt";
            tts: "tts";
            "vision.object-recognition": "vision.object-recognition";
            "vision.classification": "vision.classification";
            "vision.face-detection": "vision.face-detection";
            "vision.image-description": "vision.image-description";
        }>;
        key: z.ZodString;
        label: z.ZodString;
        url: z.ZodString;
        folder: z.ZodOptional<z.ZodString>;
        kind: z.ZodOptional<z.ZodString>;
        inputShape: z.ZodOptional<z.ZodArray<z.ZodNumber>>;
        labelUrl: z.ZodOptional<z.ZodString>;
        required: z.ZodOptional<z.ZodArray<z.ZodString>>;
    }, z.core.$strict>>>;
    recipe: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, z.core.$loose>;
export type TJBotConfigSchema = z.infer<typeof tjbotConfigSchema>;
export {};
