/**
 * Copyright 2016-2025 IBM Corp. All Rights Reserved.
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
import type { TJBotConfigSchema } from './config/config-types.js';
import { TJBotConfig } from './config/tjbot-config.js';
import { RPiHardwareDriver } from './rpi-drivers/index.js';
import { Hardware } from './utils/index.js';
import { ObjectDetectionResult, ImageClassificationResult, ImageSegmentationResult } from './vision/index.js';
/**
 * Class representing a TJBot
 */
declare class TJBot {
    /**
     * TJBot library version
     * @readonly
     */
    static VERSION: string;
    /**
     * Hardware list
     * @readonly
     */
    static Hardware: typeof Hardware;
    /**
     * TJBot configuration
     */
    config: TJBotConfig;
    /**
     * Raspberry Pi model on which TJBot is running
     * @example "Raspberry Pi 5"
     */
    rpiModel: string;
    /**
     * Raspberry Pi hardware driver
     */
    rpiDriver: RPiHardwareDriver;
    /**
     * Cache of the colors recognized by TJBot
     */
    _shineColors: string[];
    /**
     * TJBot constructor. Loads configuration in the following order:
     * 1. Base config from tjbot.default.toml
     * 2. Local tjbot.toml (if it exists)
     * 3. Override config (if provided)
     * Hardware is automatically initialized based on the [hardware] configuration section.
     * @constructor
     * @param  {Partial<TJBotConfigSchema>=} overrideConfig (optional) Configuration object to overlay on top of loaded config.
     * @throws {TJBotError} if configuration file cannot be loaded or is invalid
     * @public
     */
    constructor(overrideConfig?: Partial<TJBotConfigSchema>);
    /**
     * Auto-initialize hardware devices based on configuration
     * @private
     */
    private initializeHardwareFromConfig;
    /**
     * Change the level of TJBot's logging.
     * @param {string} level Logging level (see Winston's [list of logging levels](https://github.com/winstonjs/winston?tab=readme-ov-file#using-logging-levels))
     * @public
     */
    setLogLevel(level: string): void;
    /**
     * Assert that TJBot is able to perform a specified capability.
     * @private
     * @param {string} capability The capability assert (see TJBot.prototype.capabilities).
     */
    private assertCapability;
    /** ------------------------------------------------------------------------ */
    /** LISTEN                                                                   */
    /** ------------------------------------------------------------------------ */
    /**
     * Listen for a spoken utterance.
     * @returns {Promise<string>} The transcribed text
     * @throws {TJBotError} if the microphone hardware is not initialized
     * @async
     * @public
     */
    listen(callback?: (text: string) => void): Promise<string | void>;
    /**
     * List all downloaded Sherpa-ONNX STT models on this device.
     * @returns {string[]} Array of installed model keys
     */
    static installedSTTModels(): string[];
    /**
     * List supported Sherpa-ONNX STT models for this device.
     * @returns {Array<{ key: string, label: string, kind: string }>} Array of supported model info
     */
    static supportedSTTModels(): Array<{
        key: string;
        label: string;
        kind: string;
    }>;
    /** ------------------------------------------------------------------------ */
    /** LOOK                                                                      */
    /** ------------------------------------------------------------------------ */
    /**
     * Capture an image and save it in the given path.
     * @param  {string=} filePath (optional) Path at which to save the photo file. If not
     * specified, photo will be saved in a temp location.
     * @return {string} Path at which the photo was saved.
     * @throws {TJBotError} if the camera hardware is not initialized
     * @async
     * @public
     */
    look(filePath?: string): Promise<string>;
    /**
     * Detect objects in an image using the configured vision engine.
     * @param {Buffer|string} image Image buffer or file path
     * @returns {Promise<ObjectDetectionResult[]>}
     */
    detectObjects(image: Buffer | string): Promise<ObjectDetectionResult[]>;
    /**
     * Classify an image using the configured vision engine.
     * @param {Buffer|string} image Image buffer or file path
     * @returns {Promise<ImageClassificationResult[]>}
     */
    classifyImage(image: Buffer | string): Promise<ImageClassificationResult[]>;
    /**
     * Segment an image using the configured vision engine.
     * @param {Buffer|string} image Image buffer or file path
     * @returns {Promise<ImageSegmentationResult>}
     */
    segmentImage(image: Buffer | string): Promise<ImageSegmentationResult>;
    /**
     * List all installed ONNX vision models on this device.
     * @returns {string[]} Array of installed vision model keys
     */
    static installedVisionModels(): string[];
    /**
     * List supported ONNX vision models for this device.
     * @returns {Array<{ model: string, label?: string }>} Array of supported TTS model info
     */
    static supportedVisionModels(): Array<{
        model: string;
        label?: string;
    }>;
    /** ------------------------------------------------------------------------ */
    /** SHINE                                                                    */
    /** ------------------------------------------------------------------------ */
    /**
     * Change the color of the LED.
     * @param {string} color The color to shine the LED. May be specified in a number of
     * formats, including: hexadecimal, (e.g. "0xF12AC4", "11FF22", "#AABB24"), "on", "off",
     * or may be a named color in the `colornames` package. Hexadecimal colors
     * follow an #RRGGBB format.
     * @returns {Promise<void>} A promise that resolves when the LED color has been set.
     * @see {@link https://github.com/timoxley/colornames|Colornames} for a list of color names.
     * @throws {TJBotError} if the LED hardware is not initialized or if color is invalid
     * @public
     */
    shine(color: string): Promise<void>;
    /**
     * Pulse the LED a single time.
     * @param {string} color The color to shine the LED. May be specified in a number of
     * formats, including: hexadecimal, (e.g. "0xF12AC4", "11FF22", "#AABB24"), "on", "off",
     * or may be a named color in the `colornames` package. Hexadecimal colors
     * follow an #RRGGBB format.
     * @param {float=} duration The duration the pulse should last. The duration should be in
     * the range [0.5, 2.0] seconds.
     * @returns {Promise<void>} A promise that resolves when the LED pulse animation completes.
     * @see {@link https://github.com/timoxley/colornames|Colornames} for a list of color names.
     * @throws {TJBotError} if the LED hardware is not initialized, color is invalid, or duration exceeds 2.0 seconds
     * @public
     */
    pulse(color: string, duration?: number): Promise<void>;
    /**
     * Get the list of all colors recognized by TJBot.
     * @return {array} List of all named colors recognized by `shine()` and `pulse()`.
     * @public
     */
    shineColors(): string[];
    /**
     * Get a random color.
     * @return {string} Random named color.
     * @public
     */
    randomColor(): string;
    /** ------------------------------------------------------------------------ */
    /** SPEAK                                                                    */
    /** ------------------------------------------------------------------------ */
    /**
     * Speak a message.
     * @param {string} message The message to speak.
     * @throws {TJBotError} if the speaker hardware is not initialized
     * @async
     * @public
     */
    speak(message: string): Promise<void>;
    /**
     * Play a sound at the specified path.
     * @param {string} soundFile The path to the sound file to be played.
     * @async
     * @public
     */
    play(soundFile: string): Promise<void>;
    /**
     * List all installed Sherpa-ONNX TTS models on this device.
     * @returns {string[]} Array of installed TTS model keys
     */
    static installedTTSModels(): string[];
    /**
     * List supported Sherpa-ONNX TTS models for this device.
     * @returns {Array<{ model: string, label?: string }>} Array of supported TTS model info
     */
    static supportedTTSModels(): Array<{
        model: string;
        label?: string;
    }>;
    /** ------------------------------------------------------------------------ */
    /** WAVE                                                                     */
    /** ------------------------------------------------------------------------ */
    /**
     * Moves TJBot's arm all the way back. If this method doesn't move the arm all the way back, the servo motor stop point defined in TJBot.Servo.ARM_BACK may need to be overridden. Valid servo values are in the range [500, 2300].
     * @throws {TJBotError} if the servo hardware is not initialized
     * @example tj.armBack()
     * @public
     */
    armBack(): void;
    /**
     * Raises TJBot's arm. If this method doesn't move the arm all the way back, the servo motor stop point defined in TJBot.Servo.ARM_UP may need to be overridden. Valid servo values are in the range [500, 2300].
     * @throws {TJBotError} if the servo hardware is not initialized
     * @example tj.raiseArm()
     * @public
     */
    raiseArm(): void;
    /**
     * Lowers TJBot's arm. If this method doesn't move the arm all the way back, the servo motor stop point defined in TJBot.Servo.ARM_DOWN may need to be overridden. Valid servo values are in the range [500, 2300].
     * @throws {TJBotError} if the servo hardware is not initialized
     * @example tj.lowerArm()
     * @public
     */
    lowerArm(): void;
    /**
     * Waves TJBots's arm once.
     * @throws {TJBotError} if the servo hardware is not initialized
     * @public
     */
    wave(): void;
}
/** ------------------------------------------------------------------------ */
/** MODULE EXPORTS                                                           */
/** ------------------------------------------------------------------------ */
/**
 * Export TJBot!
 */
export { TJBot };
export default TJBot;
