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

// internal classes
import type { TJBotConfigSchema } from './config/config-types.js';
import { TJBotConfig } from './config/tjbot-config.js';
import { RPi3Driver, RPi4Driver, RPi5Driver, RPiDetect, RPiHardwareDriver } from './rpi-drivers/index.js';
import { ServoPosition } from './servo/index.js';
import { inferSTTMode } from './stt/stt-utils.js';
import { Capability, Hardware, normalizeColor, ModelManager, sleep, TJBotError } from './utils/index.js';
import { ObjectDetectionResult, ImageClassificationResult, ImageSegmentationResult } from './vision/index.js';

// node modules
import cm from 'color-model';
import colorToHex from 'colornames';
import { readFileSync } from 'fs';
import { easeInOutQuad } from 'js-easing-functions';
import { dirname, join } from 'path';
import temp from 'temp';
import { fileURLToPath } from 'url';
import winston from 'winston';

// Read version from package.json
const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJson = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf-8'));

/**
 * Class representing a TJBot
 */
class TJBot {
    /**
     * TJBot library version
     * @readonly
     */
    static VERSION = `v${packageJson.version}`;

    /**
     * Hardware list
     * @readonly
     */
    static Hardware = Hardware;

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
    _shineColors: string[] = [];

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
    constructor(overrideConfig?: Partial<TJBotConfigSchema>) {
        // set up logging -- start with the 'info' level
        // Custom formatter for pretty-printing error objects with color
        const prettyErrorFormat = winston.format.printf((info) => {
            let message = `${info.message}`;

            // If there are additional metadata fields (like error objects), pretty-print them
            const metadata: Record<string, unknown> = { ...info };
            delete metadata.level;
            delete metadata.message;
            delete metadata[Symbol.for('level') as unknown as string];
            delete metadata[Symbol.for('message') as unknown as string];
            delete metadata[Symbol.for('splat') as unknown as string];

            if (Object.keys(metadata).length > 0) {
                // Pretty-print the metadata as colored JSON
                const jsonString = JSON.stringify(metadata, null, 2);
                // Add cyan color to the JSON output
                message += ' \x1b[36m' + jsonString + '\x1b[0m';
            }

            return message;
        });

        winston.configure({
            level: 'info',
            format: winston.format.combine(winston.format.colorize(), prettyErrorFormat),
            transports: [new winston.transports.Console()],
        });

        this.config = new TJBotConfig(overrideConfig);

        // change the level if it was defined differently in the config
        const logConfig = this.config.log;
        if (logConfig && logConfig.level) {
            winston.level = logConfig.level;
        }

        // automatically track and clean up temporary files
        temp.track();

        // figure out which RPi we're running on
        this.rpiModel = RPiDetect.model();

        if (this.rpiModel.startsWith('Raspberry Pi 3')) {
            this.rpiDriver = new RPi3Driver();
        } else if (this.rpiModel.startsWith('Raspberry Pi 4')) {
            this.rpiDriver = new RPi4Driver();
        } else if (this.rpiModel.startsWith('Raspberry Pi 5')) {
            this.rpiDriver = new RPi5Driver();
        } else {
            winston.warn(
                'TJBot is running on unsupported Raspberry Pi hardware. Restorting to RPi3 hardware driver, but errors may occur.'
            );
            this.rpiDriver = new RPi3Driver();
        }

        // say hello
        winston.info(`👋 Hello from TJBot! Running on ${this.rpiModel}`);
        winston.verbose(`🤖 TJBot library version ${TJBot.VERSION}`);
        winston.debug(`🛠️ TJBot configuration:\n${JSON.stringify(this.config, null, 2)}`);

        // Auto-initialize hardware from configuration
        this.initializeHardwareFromConfig();
    }

    /**
     * Auto-initialize hardware devices based on configuration
     * @private
     */
    private initializeHardwareFromConfig(): void {
        const hwConfig = this.config.hardware;
        if (!hwConfig || Object.keys(hwConfig).length === 0) {
            winston.debug('No hardware configured in config file');
            return;
        }

        const hardwareToInit: Hardware[] = [];

        // Map config keys to Hardware enum values
        if (hwConfig.speaker) {
            hardwareToInit.push(Hardware.SPEAKER);
        }
        if (hwConfig.microphone) {
            hardwareToInit.push(Hardware.MICROPHONE);
        }
        if (hwConfig.camera) {
            hardwareToInit.push(Hardware.CAMERA);
        }
        if (hwConfig.led_neopixel) {
            hardwareToInit.push(Hardware.LED_NEOPIXEL);
        }
        if (hwConfig.led_common_anode) {
            hardwareToInit.push(Hardware.LED_COMMON_ANODE);
        }
        if (hwConfig.servo) {
            hardwareToInit.push(Hardware.SERVO);
        }

        if (hardwareToInit.length === 0) {
            return;
        }

        // Set up the hardware
        const hw = hardwareToInit.join(', ');
        winston.info(`🤖 Initializing TJBot with ${hw}`);

        hardwareToInit.forEach((device) => {
            switch (device) {
                case Hardware.CAMERA: {
                    const config = this.config.see;
                    this.rpiDriver.setupCamera(config);
                    break;
                }

                case Hardware.LED_NEOPIXEL: {
                    const shineConfig = this.config.shine;
                    this.rpiDriver.setupLEDNeopixel(shineConfig.neopixel ?? {});
                    break;
                }

                case Hardware.LED_COMMON_ANODE: {
                    const shineConfig = this.config.shine;
                    this.rpiDriver.setupLEDCommonAnode(shineConfig.commonanode ?? {});
                    break;
                }

                case Hardware.MICROPHONE: {
                    const config = this.config.listen;
                    this.rpiDriver.setupMicrophone(config);
                    break;
                }

                case Hardware.SERVO: {
                    const config = this.config.wave;
                    this.rpiDriver.setupServo(config);
                    break;
                }

                case Hardware.SPEAKER: {
                    const config = this.config.speak;
                    this.rpiDriver.setupSpeaker(config);
                    break;
                }
                default:
                    break;
            }
        }, this);
    }

    /**
     * Change the level of TJBot's logging.
     * @param {string} level Logging level (see Winston's [list of logging levels](https://github.com/winstonjs/winston?tab=readme-ov-file#using-logging-levels))
     * @public
     */
    setLogLevel(level: string) {
        winston.level = level;
    }

    /**
     * Assert that TJBot is able to perform a specified capability.
     * @private
     * @param {string} capability The capability assert (see TJBot.prototype.capabilities).
     */
    private assertCapability(capability: Capability) {
        switch (capability) {
            case Capability.LISTEN:
                if (!this.rpiDriver.hasCapability(Capability.LISTEN)) {
                    throw new TJBotError(
                        'TJBot is not configured to listen. ' +
                            'Please check that you included the ' +
                            `${Hardware.MICROPHONE} hardware in TJBot's configuration.`
                    );
                }
                break;

            case Capability.LOOK:
                if (!this.rpiDriver.hasCapability(Capability.LOOK)) {
                    throw new TJBotError(
                        'TJBot is not configured to look. ' +
                            'Please check that you included the ' +
                            `${Hardware.CAMERA} hardware in TJBot's configuration.`
                    );
                }
                break;

            case Capability.SHINE:
                if (!this.rpiDriver.hasCapability(Capability.SHINE)) {
                    throw new TJBotError(
                        'TJBot is not configured with an LED. ' +
                            'Please check that you included the ' +
                            `${Hardware.LED_NEOPIXEL} or ${Hardware.LED_COMMON_ANODE} ` +
                            "hardware in TJBot's configuration."
                    );
                }
                break;

            case Capability.SPEAK:
                if (!this.rpiDriver.hasCapability(Capability.SPEAK)) {
                    throw new TJBotError(
                        'TJBot is not configured to speak. ' +
                            'Please check that you included the ' +
                            `${Hardware.SPEAKER} hardware in TJBot's configuration.`
                    );
                }
                break;

            case Capability.WAVE:
                if (!this.rpiDriver.hasCapability(Capability.WAVE)) {
                    throw new TJBotError(
                        'TJBot is not configured with an arm. ' +
                            'Please check that you included the ' +
                            `${Hardware.SERVO} hardware in TJBot's configuration.`
                    );
                }
                break;

            default:
                break;
        }
    }

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
    async listen(callback?: (text: string) => void): Promise<string | void> {
        // make sure we can listen
        this.assertCapability(Capability.LISTEN);

        const listenConfig = this.config.listen ?? {};
        const mode = inferSTTMode(listenConfig);

        const modelName =
            (listenConfig.backend?.local as Record<string, unknown>)?.model ?? listenConfig.model ?? '<unknown>';

        if (mode === 'streaming' && !callback) {
            throw new TJBotError(
                `STT model "${modelName}" is streaming. Call listen(callback) so TJBot can deliver partial/final transcripts.`
            );
        }

        if (mode === 'offline' && callback) {
            throw new TJBotError(`STT model "${modelName}" is offline. Call await listen() without a callback.`);
        }

        if (mode === 'streaming') {
            // Streaming: deliver partial/final via the provided callback. The promise resolves when the backend signals completion.
            return await this.rpiDriver.listenForTranscript({
                onPartialResult: (text) => callback?.(text),
                onFinalResult: (text) => callback?.(text),
            });
        }

        // Offline / single-shot: return the transcript
        return await this.rpiDriver.listenForTranscript();
    }

    /**
     * List all downloaded Sherpa-ONNX STT models on this device.
     * @returns {string[]} Array of installed model keys
     */
    static installedSTTModels(): string[] {
        const manager = ModelManager.getInstance();
        return manager.getInstalledSTTModels().map((m) => m.key);
    }

    /**
     * List supported Sherpa-ONNX STT models for this device.
     * @returns {Array<{ key: string, label: string, kind: string }>} Array of supported model info
     */
    static supportedSTTModels(): Array<{ key: string; label: string; kind: string }> {
        const manager = ModelManager.getInstance();
        return manager.getSupportedSTTModels().map((m) => ({
            key: m.key,
            label: m.label,
            kind: m.kind,
        }));
    }

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
    async look(filePath?: string): Promise<string> {
        this.assertCapability(Capability.LOOK);

        const path = await this.rpiDriver.capturePhoto(filePath);
        return path;
    }

    /**
     * Detect objects in an image using the configured vision engine.
     * @param {Buffer|string} image Image buffer or file path
     * @returns {Promise<ObjectDetectionResult[]>}
     */
    async detectObjects(image: Buffer | string): Promise<ObjectDetectionResult[]> {
        return this.rpiDriver.detectObjects(image);
    }

    /**
     * Classify an image using the configured vision engine.
     * @param {Buffer|string} image Image buffer or file path
     * @returns {Promise<ImageClassificationResult[]>}
     */
    async classifyImage(image: Buffer | string): Promise<ImageClassificationResult[]> {
        return this.rpiDriver.classifyImage(image);
    }

    /**
     * Segment an image using the configured vision engine.
     * @param {Buffer|string} image Image buffer or file path
     * @returns {Promise<ImageSegmentationResult>}
     */
    async segmentImage(image: Buffer | string): Promise<ImageSegmentationResult> {
        return this.rpiDriver.segmentImage(image);
    }

    /**
     * List all installed ONNX vision models on this device.
     * @returns {string[]} Array of installed vision model keys
     */
    static installedVisionModels(): string[] {
        const manager = ModelManager.getInstance();
        return manager.getInstalledVisionModels().map((m) => m.key);
    }

    /**
     * List supported ONNX vision models for this device.
     * @returns {Array<{ model: string, label?: string }>} Array of supported TTS model info
     */
    static supportedVisionModels(): Array<{ model: string; label?: string }> {
        const manager = ModelManager.getInstance();
        return manager.getSupportedVisionModels().map((m) => ({ model: m.key, label: m.label }));
    }

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
    async shine(color: string): Promise<void> {
        this.assertCapability(Capability.SHINE);

        // normalize the color
        let c = normalizeColor(color);

        // remove leading '#' if present
        if (c.startsWith('#')) {
            c = c.substring(1);
        }

        // shine!
        await this.rpiDriver.renderLED(c);
    }

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
    async pulse(color: string, duration: number = 1.0): Promise<void> {
        this.assertCapability(Capability.SHINE);

        if (duration < 0.5) {
            winston.warn('TJBot cannot pulse for less than 0.5 seconds, using duration of 0.5 seconds');
            duration = 0.5;
        }
        if (duration > 2.0) {
            throw new TJBotError('TJBot cannot pulse for more than 2 seconds, using duration of 2.0 seconds');
            duration = 2.0;
        }

        // number of easing steps
        const numSteps = 20;

        // quadratic in-out easing
        let ease: number[] = [];
        for (let i = 0; i < numSteps; i += 1) {
            ease.push(i);
        }

        ease = ease.map((x, i) => easeInOutQuad(i, 0, 1, ease.length));

        // normalize to 'duration' sec
        ease = ease.map((x) => x * duration);

        // convert to deltas
        const easeDelays: number[] = [];
        for (let i = 0; i < ease.length - 1; i += 1) {
            easeDelays[i] = ease[i + 1] - ease[i];
        }

        // color ramp
        const rgb = normalizeColor(color).slice(1); // remove the #
        const hex = new cm.HexRgb(rgb);

        const colorRamp: string[] = [];
        for (let i = 0; i < numSteps / 2; i += 1) {
            const l = 0.0 + (i / (numSteps / 2)) * 0.5;
            colorRamp[i] = hex.toHsl().lightness(l).toRgb().toHexString().replace('#', '0x');
        }
        winston.verbose(`💡 color ramp for pulse: ${colorRamp.join(', ')}`);

        // perform the ease
        winston.verbose(`💡 pulsing my LED to RGB color ${rgb}`);
        for (let i = 0; i < easeDelays.length; i += 1) {
            const c =
                i < colorRamp.length ? colorRamp[i] : colorRamp[colorRamp.length - 1 - (i - colorRamp.length) - 1];
            winston.verbose(`💡 pulse step ${i}: setting color to ${c}`);
            await this.shine(c);
            sleep(easeDelays[i]);
        }
    }

    /**
     * Get the list of all colors recognized by TJBot.
     * @return {array} List of all named colors recognized by `shine()` and `pulse()`.
     * @public
     */
    shineColors(): string[] {
        if (this._shineColors === undefined) {
            this._shineColors = colorToHex.all().map((elt) => elt.name);
        }
        return this._shineColors;
    }

    /**
     * Get a random color.
     * @return {string} Random named color.
     * @public
     */
    randomColor(): string {
        const colors = this.shineColors();
        const randIdx = Math.floor(Math.random() * colors.length);
        const randColor = colors[randIdx];

        return randColor;
    }

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
    async speak(message: string): Promise<void> {
        this.assertCapability(Capability.SPEAK);

        winston.info(`💬 TJBot speaking: "${message}"`);

        // Delegate to the SpeakerController which handles TTS synthesis and audio playback
        await this.rpiDriver.speak(message);
    }

    /**
     * Play a sound at the specified path.
     * @param {string} soundFile The path to the sound file to be played.
     * @async
     * @public
     */
    async play(soundFile: string): Promise<void> {
        await this.rpiDriver.playAudio(soundFile);
    }

    /**
     * List all installed Sherpa-ONNX TTS models on this device.
     * @returns {string[]} Array of installed TTS model keys
     */
    static installedTTSModels(): string[] {
        const manager = ModelManager.getInstance();
        return manager.getInstalledTTSModels().map((m) => m.key);
    }

    /**
     * List supported Sherpa-ONNX TTS models for this device.
     * @returns {Array<{ model: string, label?: string }>} Array of supported TTS model info
     */
    static supportedTTSModels(): Array<{ model: string; label?: string }> {
        const manager = ModelManager.getInstance();
        return manager.getSupportedTTSModels().map((m) => ({
            model: m.key,
            label: m.label,
        }));
    }

    /** ------------------------------------------------------------------------ */
    /** WAVE                                                                     */
    /** ------------------------------------------------------------------------ */

    /**
     * Moves TJBot's arm all the way back. If this method doesn't move the arm all the way back, the servo motor stop point defined in TJBot.Servo.ARM_BACK may need to be overridden. Valid servo values are in the range [500, 2300].
     * @throws {TJBotError} if the servo hardware is not initialized
     * @example tj.armBack()
     * @public
     */
    armBack() {
        // make sure we have an arm
        this.assertCapability(Capability.WAVE);
        winston.verbose("🦾 Moving TJBot's arm back");
        this.rpiDriver.renderServoPosition(ServoPosition.ARM_BACK);
    }

    /**
     * Raises TJBot's arm. If this method doesn't move the arm all the way back, the servo motor stop point defined in TJBot.Servo.ARM_UP may need to be overridden. Valid servo values are in the range [500, 2300].
     * @throws {TJBotError} if the servo hardware is not initialized
     * @example tj.raiseArm()
     * @public
     */
    raiseArm() {
        // make sure we have an arm
        this.assertCapability(Capability.WAVE);
        winston.verbose("🦾 Raising TJBot's arm");
        this.rpiDriver.renderServoPosition(ServoPosition.ARM_UP);
    }

    /**
     * Lowers TJBot's arm. If this method doesn't move the arm all the way back, the servo motor stop point defined in TJBot.Servo.ARM_DOWN may need to be overridden. Valid servo values are in the range [500, 2300].
     * @throws {TJBotError} if the servo hardware is not initialized
     * @example tj.lowerArm()
     * @public
     */
    lowerArm() {
        // make sure we have an arm
        this.assertCapability(Capability.WAVE);
        winston.verbose("🦾 Lowering TJBot's arm");
        this.rpiDriver.renderServoPosition(ServoPosition.ARM_DOWN);
    }

    /**
     * Waves TJBots's arm once.
     * @throws {TJBotError} if the servo hardware is not initialized
     * @public
     */
    wave(): void {
        this.assertCapability(Capability.WAVE);
        winston.verbose("🦾 Waving TJBot's arm");

        const delay = 0.2;

        this.rpiDriver.renderServoPosition(ServoPosition.ARM_UP);
        sleep(delay);

        this.rpiDriver.renderServoPosition(ServoPosition.ARM_DOWN);
        sleep(delay);

        this.rpiDriver.renderServoPosition(ServoPosition.ARM_UP);
        sleep(delay);
    }
}

/** ------------------------------------------------------------------------ */
/** MODULE EXPORTS                                                           */
/** ------------------------------------------------------------------------ */

/**
 * Export TJBot!
 */
export { TJBot };
export default TJBot;
