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
import { TJBotConfig } from './config/tjbot-config.js';
import { RPi3Driver, RPi4Driver, RPi5Driver, RPiDetect } from './rpi-drivers/index.js';
import { ServoPosition } from './servo/index.js';
import { inferSTTMode } from './stt/stt-utils.js';
import { Capability, getShineColors, Hardware, initWinston, ModelRegistry, normalizeColor, sleep as asyncSleep, TJBotError, } from './utils/index.js';
import { getLogger } from './utils/logging.js';
// node modules
import cm from 'color-model';
import { promises as fsPromises, readFileSync } from 'fs';
import { easeInOutQuad } from 'js-easing-functions';
import { dirname, join } from 'path';
import temp from 'temp';
import { fileURLToPath } from 'url';
const logger = getLogger(import.meta.url);
// Read version from package.json
const DIRNAME = dirname(fileURLToPath(import.meta.url));
const PACKAGE_JSON = JSON.parse(readFileSync(join(DIRNAME, '../package.json'), 'utf-8'));
// Configure winston logging at module load time so all internals share one logger format.
initWinston('info');
/**
 * Class representing a TJBot
 */
class TJBot {
    /**
     * TJBot library version
     * @readonly
     */
    static VERSION = `v${PACKAGE_JSON.version}`;
    /**
     * Singleton instance
     * @private
     */
    static instance;
    /**
     * Hardware list
     * @readonly
     */
    static Hardware = Hardware;
    /**
     * TJBot configuration
     */
    config;
    /**
     * Raspberry Pi model on which TJBot is running
     * @example "Raspberry Pi 5"
     */
    rpiModel;
    /**
     * Raspberry Pi hardware driver
     */
    rpiDriver;
    /**
     * Cache of the colors recognized by TJBot
     */
    _shineColors = [];
    /**
     * Flag to track if TJBot has been initialized
     */
    _initialized = false;
    /**
     * Promise for in-flight cleanup operation, if any.
     */
    _cleanupPromise = null;
    /**
     * Guard to ensure process lifecycle hooks are installed only once.
     */
    _processHooksInstalled = false;
    /**
     * Private constructor.
     * @private
     */
    constructor() {
        // automatically track and clean up temporary files
        temp.track();
    }
    /**
     * Get the singleton instance of TJBot.
     * @returns {TJBot} The singleton TJBot instance
     * @public
     */
    static getInstance() {
        if (!TJBot.instance) {
            TJBot.instance = new TJBot();
        }
        return TJBot.instance;
    }
    /**
     * Get recipe-specific configuration. This method can be used before calling `TJBot.getInstance().initialize()`
     * in case a recipe needs to dynamically determine which hardware components should be configured.
     * @param {string=} recipeConfigPath (optional) Path to recipe configuration file (default: recipe.toml in current working directory)
     * @return {Record<string, unknown>} The recipe configuration as a key-value object. If no recipe configuration file is found, returns an empty object.
     *
     */
    static getRecipeConfig(recipeConfigPath = 'recipe.toml') {
        const config = new TJBotConfig(undefined, recipeConfigPath);
        return config.recipe;
    }
    /**
     * Initialize TJBot with configuration. Can be called multiple times to reconfigure.
     * Performs cleanup of previous initialization, loads configuration, detects hardware,
     * initializes all configured hardware and AI models eagerly.
     * @param {Partial<TJBotConfigSchema>=} overrideConfig (optional) Configuration object to overlay on top of loaded config.
     * @param {string=} recipeConfigPath (optional) Path to recipe configuration file (default: recipe.toml in current working directory)
     * @throws {TJBotError} if configuration file cannot be loaded, is invalid, or cleanup fails
     * @public
     */
    async initialize(overrideConfig, recipeConfigPath) {
        logger.info('Initializing TJBot...');
        this.installProcessCleanupHooks();
        // Cleanup previous initialization if any
        if (this._initialized) {
            logger.info('Cleaning up previous initialization...');
            await this.cleanup();
        }
        // Load configuration
        this.config = new TJBotConfig(overrideConfig, recipeConfigPath);
        // Update log level from config
        const logConfig = this.config.log;
        if (logConfig && logConfig.level) {
            logger.level = logConfig.level;
        }
        // Detect Raspberry Pi model and instantiate driver
        this.rpiModel = RPiDetect.model();
        logger.info(`Detected hardware: ${this.rpiModel}`);
        if (this.rpiModel.startsWith('Raspberry Pi 3')) {
            this.rpiDriver = new RPi3Driver();
        }
        else if (this.rpiModel.startsWith('Raspberry Pi 4')) {
            this.rpiDriver = new RPi4Driver();
        }
        else if (this.rpiModel.startsWith('Raspberry Pi 5')) {
            this.rpiDriver = new RPi5Driver();
        }
        else {
            logger.warn('TJBot is running on unsupported Raspberry Pi hardware. Resorting to RPi3 hardware driver, but errors may occur.');
            this.rpiDriver = new RPi3Driver();
        }
        logger.verbose(`TJBot library version ${TJBot.VERSION}`);
        logger.debug(`TJBot configuration:\n${JSON.stringify(this.config, null, 2)}`);
        // Initialize hardware
        await this.initializeHardware();
        // Eagerly initialize AI models (if configured)
        await this.initializeAIModels();
        this._initialized = true;
        logger.info('TJBot initialization complete');
        return this;
    }
    /**
     * Initialize hardware devices
     * @private
     */
    async initializeHardware() {
        const hwConfig = this.config.hardware;
        if (!hwConfig || Object.keys(hwConfig).length === 0) {
            logger.debug('No hardware configured');
            return;
        }
        const hardwareToInit = [];
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
        if (hwConfig.led) {
            hardwareToInit.push(Hardware.LED);
        }
        if (hwConfig.servo) {
            hardwareToInit.push(Hardware.SERVO);
        }
        if (hardwareToInit.length === 0) {
            return;
        }
        logger.info('Initializing hardware...');
        for (const device of hardwareToInit) {
            switch (device) {
                case Hardware.CAMERA: {
                    const config = this.config.see;
                    this.rpiDriver.setupCamera(config);
                    break;
                }
                case Hardware.LED: {
                    const shineConfig = this.config.shine;
                    const hasNeopixel = shineConfig?.hasNeopixelLED ?? false;
                    const hasCommonAnode = shineConfig?.hasCommonAnodeLED ?? false;
                    if (!hasNeopixel && !hasCommonAnode) {
                        throw new TJBotError('LED hardware enabled but no LED type configured. Set shine.hasNeopixelLED or shine.hasCommonAnodeLED to true in your tjbot configuration file (~/.tjbot/tjbot.toml).');
                    }
                    if (hasNeopixel) {
                        logger.info('Setting up NeoPixel LED ' +
                            '[' +
                            (shineConfig?.neopixel?.gpioPin ? `pin: ${shineConfig?.neopixel?.gpioPin}` : '') +
                            ' ' +
                            (shineConfig?.neopixel?.spiInterface
                                ? `SPI: ${shineConfig.neopixel?.spiInterface}`
                                : '') +
                            ']');
                    }
                    if (hasCommonAnode) {
                        logger.info(`Setting up Common Anode LED [r/g/b pins: ${shineConfig?.commonanode?.redPin}/${shineConfig?.commonanode?.greenPin}/${shineConfig?.commonanode?.bluePin}]`);
                    }
                    await this.rpiDriver.setupLED(shineConfig);
                    break;
                }
                case Hardware.MICROPHONE: {
                    const config = this.config.listen;
                    logger.info(`Setting up microphone [device: ${config?.device || 'default'}]`);
                    this.rpiDriver.setupMicrophone(config);
                    break;
                }
                case Hardware.SERVO: {
                    const config = this.config.wave;
                    logger.info(`Setting up servo [pin: ${config?.servoPin}]`);
                    this.rpiDriver.setupServo(config);
                    break;
                }
                case Hardware.SPEAKER: {
                    const config = this.config.speak;
                    logger.info(`Setting up speaker [device: ${config?.device || 'default'}]`);
                    this.rpiDriver.setupSpeaker(config);
                    break;
                }
                default:
                    break;
            }
        }
    }
    /**
     * Eagerly initialize local AI models (STT, TTS, Vision) if configured
     * @private
     */
    async initializeAIModels() {
        // Initialize STT engine if microphone is configured
        if (this.rpiDriver.hasCapability(Capability.LISTEN)) {
            logger.info('Initializing STT engine...');
            await this.rpiDriver.initializeSTTEngine();
        }
        // Initialize TTS engine if speaker is configured
        if (this.rpiDriver.hasCapability(Capability.SPEAK)) {
            logger.info('Initializing TTS engine...');
            await this.rpiDriver.initializeTTSEngine();
        }
        // Initialize Vision engine if camera is configured
        if (this.rpiDriver.hasCapability(Capability.SEE)) {
            logger.info('Initializing Vision engine...');
            await this.rpiDriver.initializeVisionEngine();
        }
    }
    /**
     * Clean up all resources. Called automatically before re-initialization.
     * @throws {TJBotError} if cleanup fails
     * @private
     */
    async cleanup() {
        if (this._cleanupPromise) {
            return this._cleanupPromise;
        }
        this._cleanupPromise = (async () => {
            try {
                if (this.rpiDriver) {
                    await this.rpiDriver.cleanup();
                }
                this._initialized = false;
            }
            catch (error) {
                throw new TJBotError('Failed to clean up TJBot resources', {
                    cause: error instanceof Error ? error : new Error(String(error)),
                });
            }
            finally {
                this._cleanupPromise = null;
            }
        })();
        return this._cleanupPromise;
    }
    /**
     * Install process lifecycle hooks so TJBot hardware resources are cleaned up
     * automatically when a recipe exits or is interrupted.
     */
    installProcessCleanupHooks() {
        if (this._processHooksInstalled) {
            return;
        }
        this._processHooksInstalled = true;
        process.once('beforeExit', () => {
            void this.runLifecycleCleanup('beforeExit');
        });
        process.once('SIGINT', () => {
            void this.runLifecycleCleanup('SIGINT', 130);
        });
        process.once('SIGTERM', () => {
            void this.runLifecycleCleanup('SIGTERM', 143);
        });
        process.once('SIGHUP', () => {
            void this.runLifecycleCleanup('SIGHUP', 129);
        });
        process.once('uncaughtException', (err) => {
            logger.error(`uncaughtException: ${err instanceof Error ? (err.stack ?? err.message) : String(err)}`);
            void this.runLifecycleCleanup('uncaughtException', 1);
        });
        process.once('unhandledRejection', (reason) => {
            logger.error(`unhandledRejection: ${reason instanceof Error ? (reason.stack ?? reason.message) : String(reason)}`);
            void this.runLifecycleCleanup('unhandledRejection', 1);
        });
    }
    /**
     * Best-effort automatic cleanup path used by process lifecycle hooks.
     * Uses a timeout in fatal/signal scenarios so process termination does not hang.
     */
    async runLifecycleCleanup(reason, exitCode) {
        const CLEANUP_TIMEOUT_MS = 3000;
        if (exitCode === undefined) {
            try {
                await this.cleanup();
            }
            catch (err) {
                logger.warn(`automatic cleanup failed during ${reason}: ${String(err)}`);
            }
            process.exit(0);
            return;
        }
        process.exitCode = exitCode;
        try {
            await Promise.race([
                this.cleanup(),
                new Promise((resolve) => setTimeout(resolve, CLEANUP_TIMEOUT_MS)),
            ]);
        }
        catch (err) {
            logger.warn(`automatic cleanup failed during ${reason}: ${String(err)}`);
        }
        finally {
            process.exit(exitCode);
        }
    }
    /**
     * Change the level of TJBot's logging.
     * @param {string} level Logging level (see Winston's [list of logging levels](https://github.com/winstonjs/winston?tab=readme-ov-file#using-logging-levels))
     * @public
     */
    setLogLevel(level) {
        logger.level = level;
    }
    /**
     * Assert that TJBot is able to perform a specified capability.
     * @private
     * @param {string} capability The capability assert (see TJBot.prototype.capabilities).
     */
    assertCapability(capability) {
        if (!this._initialized) {
            throw new TJBotError('TJBot has not been initialized. Please call await tj.initialize() before using TJBot.');
        }
        logger.debug(`Asserting capability: ${capability}`);
        logger.silly(`TJBot capabilities: ${Array.from(this.rpiDriver.getHardware()).join(', ')}`);
        switch (capability) {
            case Capability.LISTEN:
                if (!this.rpiDriver.hasCapability(Capability.LISTEN)) {
                    throw new TJBotError('TJBot is not configured to listen. ' +
                        'Please check that you included the ' +
                        `${Hardware.MICROPHONE} hardware in TJBot's configuration.`);
                }
                break;
            case Capability.SEE:
                if (!this.rpiDriver.hasCapability(Capability.SEE)) {
                    throw new TJBotError('TJBot is not configured to see. ' +
                        'Please check that you included the ' +
                        `${Hardware.CAMERA} hardware in TJBot's configuration.`);
                }
                break;
            case Capability.SHINE:
                if (!this.rpiDriver.hasCapability(Capability.SHINE)) {
                    throw new TJBotError('TJBot is not configured with an LED. ' +
                        'Please check that you included the ' +
                        `${Hardware.LED} ` +
                        "hardware in TJBot's configuration.");
                }
                break;
            case Capability.SPEAK:
                if (!this.rpiDriver.hasCapability(Capability.SPEAK)) {
                    throw new TJBotError('TJBot is not configured to speak. ' +
                        'Please check that you included the ' +
                        `${Hardware.SPEAKER} hardware in TJBot's configuration.`);
                }
                break;
            case Capability.WAVE:
                if (!this.rpiDriver.hasCapability(Capability.WAVE)) {
                    throw new TJBotError('TJBot is not configured with an arm. ' +
                        'Please check that you included the ' +
                        `${Hardware.SERVO} hardware in TJBot's configuration.`);
                }
                break;
            default:
                break;
        }
    }
    /**
     * Sleep for the specified number of seconds.
     * @param sec Number of seconds to sleep
     */
    async sleep(sec) {
        await asyncSleep(sec);
    }
    /** ------------------------------------------------------------------------ */
    /** LOCAL AI/ML MODELS                                                       */
    /** ------------------------------------------------------------------------ */
    /**
     * List the AI/ML models on this device.
     * @returns {string[]} Array of installed model keys
     */
    getLocalModels(modelType, installedOnly = true) {
        const registry = ModelRegistry.getInstance();
        const models = registry.lookupModels(modelType, installedOnly);
        return models.map((model) => model.key);
    }
    async listen(onPartialResultOrTimeout, onFinalResult, timeout) {
        // make sure we can listen
        this.assertCapability(Capability.LISTEN);
        const isStreamingCall = typeof onPartialResultOrTimeout === 'function';
        const onPartialResult = isStreamingCall ? onPartialResultOrTimeout : undefined;
        const timeoutSec = isStreamingCall ? timeout : onPartialResultOrTimeout;
        const abortSignal = timeoutSec !== undefined ? AbortSignal.timeout(timeoutSec * 1000) : undefined;
        const listenConfig = this.config.listen ?? {};
        const mode = inferSTTMode(listenConfig);
        const modelName = listenConfig.backend?.local?.model ?? '<unknown>';
        if (mode === 'streaming' && !onPartialResult) {
            throw new TJBotError(`STT model "${modelName}" is streaming. Call listen(onPartialResult, onFinalResult) so TJBot can deliver partial/final transcripts.`);
        }
        if (mode === 'offline' && onPartialResult) {
            throw new TJBotError(`STT model "${modelName}" is offline. Call await listen() without a callback.`);
        }
        if (mode === 'streaming') {
            // Streaming: deliver partial/final via the provided callback. The promise resolves when the backend signals completion.
            return await this.rpiDriver.listenForTranscript({
                onPartialResult: (text) => onPartialResult?.(text),
                onFinalResult: (text) => onFinalResult?.(text),
                abortSignal,
            });
        }
        // Offline / single-shot: return the transcript
        const message = await this.rpiDriver.listenForTranscript({ abortSignal });
        logger.info(`Heard: "${message}"`);
        return message;
    }
    /** ------------------------------------------------------------------------ */
    /** SEE                                                                      */
    /** ------------------------------------------------------------------------ */
    /**
     * Capture an image and return it as a buffer.
     * @return {Promise<Buffer>} The captured image as a buffer.
     * @throws {TJBotError} if the camera hardware is not initialized
     * @public
     */
    async see() {
        this.assertCapability(Capability.SEE);
        try {
            const buffer = await this.rpiDriver.capturePhotoBuffer();
            return buffer;
        }
        catch {
            const photoPath = await this.rpiDriver.capturePhoto();
            try {
                return await fsPromises.readFile(photoPath);
            }
            finally {
                // Best-effort cleanup for temporary capture paths.
                await fsPromises.unlink(photoPath).catch(() => { });
            }
        }
    }
    /**
     * Capture an image and save it in the given path.
     * @param  {string=} filePath (optional) Path at which to save the photo file. If not
     * specified, photo will be saved in a temp location.
     * @return {string} Path at which the photo was saved.
     * @throws {TJBotError} if the camera hardware is not initialized
     * @public
     */
    async look(filePath) {
        this.assertCapability(Capability.SEE);
        const path = await this.rpiDriver.capturePhoto(filePath);
        return path;
    }
    /**
     * Detect objects in an image using the configured vision engine.
     * @param {Buffer|string} image Image buffer or file path
     * @returns {Promise<ObjectDetectionResult[]>}
     */
    async detectObjects(image) {
        this.assertCapability(Capability.SEE);
        return this.rpiDriver.detectObjects(image);
    }
    /**
     * Classify an image using the configured vision engine.
     * @param {Buffer|string} image Image buffer or file path
     * @returns {Promise<ImageClassificationResult[]>}
     */
    async classifyImage(image) {
        this.assertCapability(Capability.SEE);
        return this.rpiDriver.classifyImage(image);
    }
    /**
     * Detect faces in an image using the configured vision engine.
     * @param {Buffer|string} image Image buffer or file path
     * @returns {Promise<{isFaceDetected: boolean, metadata: FaceDetectionMetadata[]}>}
     */
    async detectFaces(image) {
        this.assertCapability(Capability.SEE);
        return this.rpiDriver.detectFaces(image);
    }
    /**
     * Describe an image using the configured vision engine (Azure only).
     * @param {Buffer|string} image Image buffer or file path
     * @returns {Promise<ImageDescriptionResult>}
     */
    async describeImage(image) {
        this.assertCapability(Capability.SEE);
        return this.rpiDriver.describeImage(image);
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
    async shine(color) {
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
    async pulse(color, duration = 1.0) {
        this.assertCapability(Capability.SHINE);
        if (duration < 0.5) {
            logger.warn('TJBot cannot pulse for less than 0.5 seconds, using duration of 0.5 seconds');
            duration = 0.5;
        }
        if (duration > 2.0) {
            logger.warn('TJBot cannot pulse for more than 2 seconds, using duration of 2.0 seconds');
            duration = 2.0;
        }
        // number of easing steps
        const numSteps = 20;
        // quadratic in-out easing
        let ease = [];
        for (let i = 0; i < numSteps; i += 1) {
            ease.push(i);
        }
        ease = ease.map((x, i) => easeInOutQuad(i, 0, 1, ease.length));
        // normalize to 'duration' sec
        ease = ease.map((x) => x * duration);
        // convert to deltas
        const easeDelays = [];
        for (let i = 0; i < ease.length - 1; i += 1) {
            easeDelays[i] = ease[i + 1] - ease[i];
        }
        // color ramp
        const rgb = normalizeColor(color).slice(1); // remove the #
        const hex = new cm.HexRgb(rgb);
        const colorRamp = [];
        for (let i = 0; i < numSteps / 2; i += 1) {
            const l = 0.0 + (i / (numSteps / 2)) * 0.5;
            colorRamp[i] = hex.toHsl().lightness(l).toRgb().toHexString().replace('#', '0x');
        }
        logger.silly(`color ramp for pulse: ${colorRamp.join(', ')}`);
        // perform the ease
        logger.verbose(`pulsing my LED to RGB color ${rgb}`);
        for (let i = 0; i < easeDelays.length; i += 1) {
            const c = i < colorRamp.length ? colorRamp[i] : colorRamp[colorRamp.length - 1 - (i - colorRamp.length) - 1];
            logger.silly(`pulse step ${i}: setting color to ${c}`);
            await this.shine(c);
            await asyncSleep(easeDelays[i]);
        }
    }
    /**
     * Get the list of all colors recognized by TJBot.
     * @return {array} List of all named colors recognized by `shine()` and `pulse()`.
     * @public
     */
    shineColors() {
        if (this._shineColors.length === 0) {
            this._shineColors = getShineColors();
        }
        return this._shineColors;
    }
    /**
     * Get a random color.
     * @return {string} Random named color.
     * @public
     */
    randomColor() {
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
     * @public
     */
    async speak(message) {
        this.assertCapability(Capability.SPEAK);
        logger.info(`Speaking: "${message}"`);
        // Delegate to the SpeakerController which handles TTS synthesis and audio playback
        await this.rpiDriver.speak(message);
    }
    /**
     * Play a sound at the specified path.
     * @param {string} soundFile The path to the sound file to be played.
     * @public
     */
    async play(soundFile) {
        logger.info(`Playing sound: ${soundFile}`);
        await this.rpiDriver.playAudio(soundFile);
    }
    /** ------------------------------------------------------------------------ */
    /** WAVE                                                                     */
    /** ------------------------------------------------------------------------ */
    /**
     * Moves TJBot's arm all the way back. If this method doesn't move the arm all the way back, the servo motor stop point defined in TJBot.Servo.ARM_BACK may need to be overridden. Valid servo values are in the range [500, 2300].
     * @throws {TJBotError} if the servo hardware is not initialized
     * @returns {Promise<void>} Resolves when the arm is fully back.
     * @example tj.armBack()
     * @public
     */
    armBack() {
        this.assertCapability(Capability.WAVE);
        logger.info("Moving TJBot's arm back");
        return new Promise((resolve) => {
            this.rpiDriver.renderServoPosition(ServoPosition.ARM_BACK);
            resolve();
        });
    }
    /**
     * Raises TJBot's arm. If this method doesn't move the arm all the way back, the servo motor stop point defined in TJBot.Servo.ARM_UP may need to be overridden. Valid servo values are in the range [500, 2300].
     * @throws {TJBotError} if the servo hardware is not initialized
     * @returns {Promise<void>} Resolves when the arm is fully raised.
     * @example tj.raiseArm()
     * @public
     */
    async raiseArm() {
        this.assertCapability(Capability.WAVE);
        logger.info("Raising TJBot's arm");
        return new Promise((resolve) => {
            this.rpiDriver.renderServoPosition(ServoPosition.ARM_UP);
            resolve();
        });
    }
    /**
     * Lowers TJBot's arm. If this method doesn't move the arm all the way back, the servo motor stop point defined in TJBot.Servo.ARM_DOWN may need to be overridden. Valid servo values are in the range [500, 2300].
     * @throws {TJBotError} if the servo hardware is not initialized
     * @returns {Promise<void>} Resolves when the arm is fully lowered.
     * @example tj.lowerArm()
     * @public
     */
    async lowerArm() {
        this.assertCapability(Capability.WAVE);
        logger.info("Lowering TJBot's arm");
        return new Promise((resolve) => {
            this.rpiDriver.renderServoPosition(ServoPosition.ARM_DOWN);
            resolve();
        });
    }
    /**
     * Waves TJBots's arm once.
     * @throws {TJBotError} if the servo hardware is not initialized
     * @returns {Promise<void>} Resolves when the wave is complete.
     * @example tj.wave()
     * @public
     */
    async wave() {
        this.assertCapability(Capability.WAVE);
        logger.verbose("Waving TJBot's arm");
        const delay = 0.2;
        this.rpiDriver.renderServoPosition(ServoPosition.ARM_UP);
        await asyncSleep(delay);
        this.rpiDriver.renderServoPosition(ServoPosition.ARM_DOWN);
        await asyncSleep(delay);
        this.rpiDriver.renderServoPosition(ServoPosition.ARM_UP);
        await asyncSleep(delay);
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
//# sourceMappingURL=tjbot.js.map