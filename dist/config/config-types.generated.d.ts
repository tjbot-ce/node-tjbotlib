/**
 * Verbosity level for TJBot logging.
 */
export type LogLevel = ("error" | "warning" | "warn" | "info" | "verbose" | "debug" | "silly");
/**
 * Speech-to-text backend implementation.
 */
export type STTBackendType = ("none" | "local" | "ibm-watson-stt" | "google-cloud-stt" | "azure-stt");
/**
 * Vision backend implementation.
 */
export type SeeBackendType = ("none" | "local" | "google-cloud-vision" | "azure-vision");
/**
 * Text-to-speech backend implementation.
 */
export type TTSBackendType = ("none" | "local" | "ibm-watson-tts" | "google-cloud-tts" | "azure-tts");
/**
 * Kind of model entry being registered.
 */
export type ModelEntryType = ("stt" | "tts" | "vad" | "vision.object-recognition" | "vision.classification" | "vision.face-detection" | "vision.image-description");
/**
 * Additional model registry entries supplied by the user.
 */
export type ModelsConfig = ModelEntry[];
/**
 * Canonical schema for TJBot runtime configuration.
 */
export interface TJBotConfigSchema {
    log?: LogConfig;
    hardware?: HardwareConfig;
    listen?: ListenConfig;
    see?: SeeConfig;
    shine?: ShineConfig;
    speak?: SpeakConfig;
    wave?: WaveConfig;
    models?: ModelsConfig;
    /**
     * Free-form recipe-level configuration merged after TJBot defaults and user config.
     */
    recipe?: {
        [k: string]: unknown;
    };
    [k: string]: unknown;
}
/**
 * Logging configuration.
 */
export interface LogConfig {
    level?: LogLevel;
    [k: string]: unknown;
}
/**
 * Hardware capabilities physically attached to the Raspberry Pi.
 */
export interface HardwareConfig {
    /**
     * Set to true when a speaker is connected and should be initialized.
     */
    speaker?: boolean;
    /**
     * Set to true when a microphone is connected and should be initialized.
     */
    microphone?: boolean;
    /**
     * Set to true when TJBot should initialize an LED output.
     */
    led?: boolean;
    /**
     * Set to true when TJBot should initialize the arm servo.
     */
    servo?: boolean;
    /**
     * Set to true when a camera is attached and vision features should initialize.
     */
    camera?: boolean;
    [k: string]: unknown;
}
/**
 * Audio capture and speech recognition configuration.
 */
export interface ListenConfig {
    /**
     * ALSA capture device name. Empty uses the system default device.
     */
    device?: string;
    /**
     * Capture sample rate in hertz.
     */
    microphoneRate?: number;
    /**
     * Number of microphone input channels.
     */
    microphoneChannels?: number;
    backend?: STTBackendConfig;
    [k: string]: unknown;
}
/**
 * Speech-to-text backend selection and backend-specific settings.
 */
export interface STTBackendConfig {
    type: STTBackendType;
    local?: STTBackendLocalConfig;
    "ibm-watson-stt"?: STTBackendIBMWatsonConfig;
    "google-cloud-stt"?: STTBackendGoogleCloudConfig;
    "azure-stt"?: STTBackendAzureConfig;
}
/**
 * Local speech-to-text backend configuration.
 */
export interface STTBackendLocalConfig {
    /**
     * Registry key of the local speech model.
     */
    model?: string;
    vad?: VADConfig;
    [k: string]: unknown;
}
/**
 * Voice activity detection settings for local speech recognition.
 */
export interface VADConfig {
    /**
     * Enables the VAD model before local transcription.
     */
    enabled?: boolean;
    /**
     * Registry key of the VAD model to load.
     */
    model?: string;
    [k: string]: unknown;
}
/**
 * IBM Watson speech-to-text backend configuration.
 */
export interface STTBackendIBMWatsonConfig {
    /**
     * IBM Watson STT model identifier.
     */
    model?: string;
    /**
     * Seconds of silence before Watson closes the stream. Use -1 to disable.
     */
    inactivityTimeout?: number;
    /**
     * Background audio suppression factor.
     */
    backgroundAudioSuppression?: number;
    /**
     * Whether partial transcriptions should be emitted.
     */
    interimResults?: boolean;
    /**
     * Path to the IBM credentials file.
     */
    credentialsPath?: string;
    [k: string]: unknown;
}
/**
 * Google Cloud speech-to-text backend configuration.
 */
export interface STTBackendGoogleCloudConfig {
    /**
     * Path to the Google Cloud credentials file.
     */
    credentialsPath?: string;
    /**
     * Google Cloud STT model identifier.
     */
    model?: string;
    /**
     * BCP-47 language code for transcription.
     */
    languageCode?: string;
    /**
     * Google Cloud region to target.
     */
    region?: string;
    /**
     * Enables automatic punctuation in transcripts.
     */
    enableAutomaticPunctuation?: boolean;
    /**
     * Masks profane words in transcripts.
     */
    profanityFilter?: boolean;
    /**
     * Whether partial transcriptions should be emitted.
     */
    interimResults?: boolean;
    [k: string]: unknown;
}
/**
 * Azure speech-to-text backend configuration.
 */
export interface STTBackendAzureConfig {
    /**
     * Azure speech recognition language. Empty uses the service default.
     */
    language?: string;
    /**
     * Path to the Azure credentials file.
     */
    credentialsPath?: string;
    /**
     * Whether partial transcriptions should be emitted.
     */
    interimResults?: boolean;
    [k: string]: unknown;
}
/**
 * Camera and vision backend configuration.
 */
export interface SeeConfig {
    /**
     * Requested capture resolution as [width, height].
     *
    
     */
    cameraResolution?: [number, number];
    /**
     * Flips captured frames vertically.
     */
    verticalFlip?: boolean;
    /**
     * Flips captured frames horizontally.
     */
    horizontalFlip?: boolean;
    /**
     * Camera capture timeout in milliseconds.
     */
    captureTimeout?: number;
    /**
     * Enables zero-shutter-lag capture when supported.
     */
    zeroShutterLag?: boolean;
    backend?: SeeBackendConfig;
    [k: string]: unknown;
}
/**
 * Vision backend selection and backend-specific settings.
 */
export interface SeeBackendConfig {
    type: SeeBackendType;
    local?: SeeBackendLocalConfig;
    "google-cloud-vision"?: SeeBackendGoogleCloudConfig;
    "azure-vision"?: SeeBackendAzureConfig;
}
/**
 * Local ONNX-based vision backend configuration.
 */
export interface SeeBackendLocalConfig {
    /**
     * Registry key of the local object detection model.
     */
    objectDetectionModel?: string;
    /**
     * Registry key of the local image classification model.
     */
    imageClassificationModel?: string;
    /**
     * Registry key of the local face detection model.
     */
    faceDetectionModel?: string;
    /**
     * Minimum confidence for object detection results.
     */
    objectDetectionConfidence?: number;
    /**
     * Minimum confidence for image classification results.
     */
    imageClassificationConfidence?: number;
    /**
     * Minimum confidence for face detection results.
     */
    faceDetectionConfidence?: number;
    [k: string]: unknown;
}
/**
 * Google Cloud Vision backend configuration.
 */
export interface SeeBackendGoogleCloudConfig {
    /**
     * Path to the Google Cloud credentials file.
     */
    credentialsPath?: string;
    /**
     * Minimum confidence for object localization results.
     */
    objectDetectionConfidence?: number;
    /**
     * Minimum confidence for label detection results.
     */
    imageClassificationConfidence?: number;
    /**
     * Minimum confidence for face detection results.
     */
    faceDetectionConfidence?: number;
    [k: string]: unknown;
}
/**
 * Azure Vision backend configuration.
 */
export interface SeeBackendAzureConfig {
    /**
     * Path to the Azure credentials file.
     */
    credentialsPath?: string;
    /**
     * Minimum confidence for object detection results.
     */
    objectDetectionConfidence?: number;
    /**
     * Minimum confidence for image classification results.
     */
    imageClassificationConfidence?: number;
    [k: string]: unknown;
}
/**
 * LED hardware selection and pin mapping.
 */
export interface ShineConfig {
    /**
     * Enables NeoPixel / WS281x LED support.
     */
    hasNeopixelLED?: boolean;
    /**
     * Enables common-anode RGB LED support.
     */
    hasCommonAnodeLED?: boolean;
    neopixel?: LEDNeopixelConfig;
    commonanode?: LEDCommonAnodeConfig;
    [k: string]: unknown;
}
/**
 * WS281x / NeoPixel LED configuration.
 */
export interface LEDNeopixelConfig {
    /**
     * GPIO pin number used for the LED data signal.
     */
    gpioPin?: number;
    /**
     * SPI interface path used when driving LEDs over SPI.
     */
    spiInterface?: string;
    /**
     * Whether the LED expects GRB byte ordering.
     */
    useGRBFormat?: boolean;
    [k: string]: unknown;
}
/**
 * Common-anode RGB LED configuration.
 */
export interface LEDCommonAnodeConfig {
    /**
     * GPIO pin for the red channel.
     */
    redPin?: number;
    /**
     * GPIO pin for the green channel.
     */
    greenPin?: number;
    /**
     * GPIO pin for the blue channel.
     */
    bluePin?: number;
    [k: string]: unknown;
}
/**
 * Audio playback and text-to-speech configuration.
 */
export interface SpeakConfig {
    /**
     * ALSA playback device name. Empty uses the system default device.
     */
    device?: string;
    backend?: TTSBackendConfig;
    [k: string]: unknown;
}
/**
 * Text-to-speech backend selection and backend-specific settings.
 */
export interface TTSBackendConfig {
    type: TTSBackendType;
    local?: TTSBackendLocalConfig;
    "ibm-watson-tts"?: TTSBackendIBMWatsonConfig;
    "google-cloud-tts"?: TTSBackendGoogleCloudConfig;
    "azure-tts"?: TTSBackendAzureConfig;
}
/**
 * Local text-to-speech backend configuration.
 */
export interface TTSBackendLocalConfig {
    /**
     * Registry key of the local voice model.
     */
    model?: string;
    [k: string]: unknown;
}
/**
 * IBM Watson text-to-speech backend configuration.
 */
export interface TTSBackendIBMWatsonConfig {
    /**
     * Path to the IBM credentials file.
     */
    credentialsPath?: string;
    /**
     * IBM Watson voice identifier.
     */
    voice?: string;
    [k: string]: unknown;
}
/**
 * Google Cloud text-to-speech backend configuration.
 */
export interface TTSBackendGoogleCloudConfig {
    /**
     * Path to the Google Cloud credentials file.
     */
    credentialsPath?: string;
    /**
     * BCP-47 language code for synthesis.
     */
    languageCode?: string;
    /**
     * Google Cloud voice identifier.
     */
    voice?: string;
    [k: string]: unknown;
}
/**
 * Azure text-to-speech backend configuration.
 */
export interface TTSBackendAzureConfig {
    /**
     * Path to the Azure credentials file.
     */
    credentialsPath?: string;
    /**
     * Azure voice identifier.
     */
    voice?: string;
    [k: string]: unknown;
}
/**
 * Servo configuration for TJBot arm movement.
 */
export interface WaveConfig {
    /**
     * GPIO pin number connected to the servo PWM input.
     */
    servoPin?: number;
    [k: string]: unknown;
}
/**
 * Custom model registry entry.
 */
export interface ModelEntry {
    type: ModelEntryType;
    /**
     * Unique key used to reference the model in config.
     */
    key: string;
    /**
     * Human-readable model name.
     */
    label: string;
    /**
     * URL or file URI where the model archive can be retrieved.
     */
    url: string;
    /**
     * Folder name to use after extracting the model.
     */
    folder?: string;
    /**
     * Model subtype used by the vision runtime.
     */
    kind?: string;
    /**
     * Optional tensor input shape for ONNX vision models.
     */
    inputShape?: number[];
    /**
     * URL or file URI for a companion labels file.
     */
    labelUrl?: string;
    /**
     * Files that must exist after the model is installed.
     */
    required?: string[];
}
//# sourceMappingURL=config-types.generated.d.ts.map