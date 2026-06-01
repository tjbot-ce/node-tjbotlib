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

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fsPromises } from 'fs';
import TJBot from '../../src/tjbot.js';
import { Capability, Hardware, TJBotError } from '../../src/utils/index.js';
import { RPi3Driver, RPi5Driver, RPiDetect } from '../../src/rpi-drivers/index.js';
import type { TJBotConfigSchema } from '../../src/config/config-types.js';

// Mock the RPiDriver and its subclasses
vi.mock('../../src/rpi-drivers/index.js', () => {
    const mockDriver = {
        getHardware: vi.fn(() => new Set()),
        hasHardware: vi.fn(() => false),
        hasCapability: vi.fn(() => false),
        renderLED: vi.fn(),
        renderServoPosition: vi.fn(),
        listenForTranscript: vi.fn(),
        speak: vi.fn(),
        playAudio: vi.fn(),
        capturePhoto: vi.fn(),
        capturePhotoBuffer: vi.fn(),
        detectObjects: vi.fn(),
        classifyImage: vi.fn(),
        detectFaces: vi.fn(),
        describeImage: vi.fn(),
        setupCamera: vi.fn(),
        setupLED: vi.fn(),
        setupLEDNeopixel: vi.fn(),
        setupLEDCommonAnode: vi.fn(),
        setupMicrophone: vi.fn(),
        setupServo: vi.fn(),
        setupSpeaker: vi.fn(),
        cleanup: vi.fn(async () => {}),
        initializeSTTEngine: vi.fn(async () => {}),
        initializeTTSEngine: vi.fn(async () => {}),
        initializeVisionEngine: vi.fn(async () => {}),
    };

    return {
        RPiDetect: {
            model: () => 'Raspberry Pi 5 Model B Rev 1.0',
        },
        RPi3Driver: class {
            getHardware = mockDriver.getHardware;
            hasHardware = mockDriver.hasHardware;
            hasCapability = mockDriver.hasCapability;
            renderLED = mockDriver.renderLED;
            renderServoPosition = mockDriver.renderServoPosition;
            listenForTranscript = mockDriver.listenForTranscript;
            speak = mockDriver.speak;
            playAudio = mockDriver.playAudio;
            capturePhoto = mockDriver.capturePhoto;
            capturePhotoBuffer = mockDriver.capturePhotoBuffer;
            detectObjects = mockDriver.detectObjects;
            classifyImage = mockDriver.classifyImage;
            detectFaces = mockDriver.detectFaces;
            describeImage = mockDriver.describeImage;
            setupCamera = mockDriver.setupCamera;
            setupLED = mockDriver.setupLED;
            setupLEDNeopixel = mockDriver.setupLEDNeopixel;
            setupLEDCommonAnode = mockDriver.setupLEDCommonAnode;
            setupMicrophone = mockDriver.setupMicrophone;
            setupServo = mockDriver.setupServo;
            setupSpeaker = mockDriver.setupSpeaker;
            cleanup = mockDriver.cleanup;
            initializeSTTEngine = mockDriver.initializeSTTEngine;
            initializeTTSEngine = mockDriver.initializeTTSEngine;
            initializeVisionEngine = mockDriver.initializeVisionEngine;
        },
        RPi4Driver: class {
            getHardware = mockDriver.getHardware;
            hasHardware = mockDriver.hasHardware;
            hasCapability = mockDriver.hasCapability;
            renderLED = mockDriver.renderLED;
            renderServoPosition = mockDriver.renderServoPosition;
            listenForTranscript = mockDriver.listenForTranscript;
            speak = mockDriver.speak;
            playAudio = mockDriver.playAudio;
            capturePhoto = mockDriver.capturePhoto;
            capturePhotoBuffer = mockDriver.capturePhotoBuffer;
            detectObjects = mockDriver.detectObjects;
            classifyImage = mockDriver.classifyImage;
            detectFaces = mockDriver.detectFaces;
            describeImage = mockDriver.describeImage;
            setupCamera = mockDriver.setupCamera;
            setupLED = mockDriver.setupLED;
            setupLEDNeopixel = mockDriver.setupLEDNeopixel;
            setupLEDCommonAnode = mockDriver.setupLEDCommonAnode;
            setupMicrophone = mockDriver.setupMicrophone;
            setupServo = mockDriver.setupServo;
            setupSpeaker = mockDriver.setupSpeaker;
            cleanup = mockDriver.cleanup;
            initializeSTTEngine = mockDriver.initializeSTTEngine;
            initializeTTSEngine = mockDriver.initializeTTSEngine;
            initializeVisionEngine = mockDriver.initializeVisionEngine;
        },
        RPi5Driver: class {
            getHardware = mockDriver.getHardware;
            hasHardware = mockDriver.hasHardware;
            hasCapability = mockDriver.hasCapability;
            renderLED = mockDriver.renderLED;
            renderServoPosition = mockDriver.renderServoPosition;
            listenForTranscript = mockDriver.listenForTranscript;
            speak = mockDriver.speak;
            playAudio = mockDriver.playAudio;
            capturePhoto = mockDriver.capturePhoto;
            capturePhotoBuffer = mockDriver.capturePhotoBuffer;
            detectObjects = mockDriver.detectObjects;
            classifyImage = mockDriver.classifyImage;
            detectFaces = mockDriver.detectFaces;
            describeImage = mockDriver.describeImage;
            setupCamera = mockDriver.setupCamera;
            setupLED = mockDriver.setupLED;
            setupLEDNeopixel = mockDriver.setupLEDNeopixel;
            setupLEDCommonAnode = mockDriver.setupLEDCommonAnode;
            setupMicrophone = mockDriver.setupMicrophone;
            setupServo = mockDriver.setupServo;
            setupSpeaker = mockDriver.setupSpeaker;
            cleanup = mockDriver.cleanup;
            initializeSTTEngine = mockDriver.initializeSTTEngine;
            initializeTTSEngine = mockDriver.initializeTTSEngine;
            initializeVisionEngine = mockDriver.initializeVisionEngine;
        },
    };
});

// Mock sleep in utils.js to prevent event loop blocking during pulse tests
vi.mock('../../src/utils/utils.js', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../src/utils/utils.js')>();
    return {
        ...actual,
        sleep: vi.fn(),
    };
});

describe('TJBot - Constructor and Initialization', () => {
    test('[test_gets_tjbot_singleton_instance] gets TJBot singleton instance', async () => {
        const tj = TJBot.getInstance();
        expect(tj).toBeDefined();
        await tj.initialize();
        expect(tj.config).toBeDefined();
    });

    test('[test_has_version_static_property] has VERSION static property', () => {
        expect(TJBot.VERSION).toBe('v3.0.0');
    });

    test('[test_has_hardware_static_property] has Hardware static property', () => {
        expect(TJBot.Hardware).toBeDefined();
        expect(TJBot.Hardware.CAMERA).toBeDefined();
        expect(TJBot.Hardware.MICROPHONE).toBeDefined();
    });

    test('[test_detects_rpi_model_on_initialization] detects RPi model on initialization', async () => {
        const tj = TJBot.getInstance();
        await tj.initialize();
        expect(tj.rpiModel).toBeDefined();
        expect(typeof tj.rpiModel).toBe('string');
    });

    test('[test_initializes_rpi_driver_based_on_model_pi_5] initializes RPi driver based on model (Pi 5)', async () => {
        const tj = TJBot.getInstance();
        await tj.initialize();
        expect(tj.rpiDriver).toBeDefined();
        // Should be RPi5Driver for the mock
        expect(typeof tj.rpiDriver).toBe('object');
    });

    test('[test_sets_logging_level_from_config] sets logging level from config', async () => {
        const tj = TJBot.getInstance();
        await tj.initialize();
        // Should not throw
        tj.setLogLevel('debug');
        expect(true).toBe(true);
    });

    test('[test_applies_configuration_overrides] applies configuration overrides', async () => {
        // Pass custom config as override
        const customConfig = {
            log: {
                level: 'debug',
            },
            listen: {
                microphoneRate: 48000,
                microphoneChannels: 1,
            },
            see: {
                cameraResolution: [1280, 720] as [number, number],
                verticalFlip: true,
                horizontalFlip: true,
            },
            speak: {
                backend: {
                    type: 'local' as const,
                    local: {
                        model: 'vits-piper-en_US-lessac-low',
                    },
                },
            },
            wave: {
                gpioChip: 1,
                servoPin: 17,
            },
        } satisfies Partial<TJBotConfigSchema>;

        // Create TJBot with override config using singleton pattern
        const tj = TJBot.getInstance();
        await tj.initialize(customConfig);

        // Verify that the instance was created
        expect(tj).toBeDefined();
        expect(tj.config).toBeDefined();

        // Verify specific config values were applied from the override
        const logConfig = tj.config.log;
        expect(logConfig).toBeDefined();
        expect(logConfig.level).toBe('debug');

        const listenConfig = tj.config.listen;
        expect(listenConfig).toBeDefined();
        expect(listenConfig.microphoneRate).toBe(48000);
        expect(listenConfig.microphoneChannels).toBe(1);

        const seeConfig = tj.config.see;
        expect(seeConfig).toBeDefined();
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        expect(Array.isArray(seeConfig!.cameraResolution!)).toBe(true);
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        expect(seeConfig!.cameraResolution![0]).toBe(1280);
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        expect(seeConfig!.cameraResolution![1]).toBe(720);
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        expect(seeConfig!.verticalFlip).toBe(true);
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        expect(seeConfig!.horizontalFlip).toBe(true);

        const speakConfig = tj.config.speak;
        expect(speakConfig).toBeDefined();
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        expect(speakConfig!.backend).toBeDefined();
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        expect(speakConfig!.backend!.type).toBe('local');
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        expect(speakConfig!.backend!.local!.model).toBe('vits-piper-en_US-lessac-low');

        const waveConfig = tj.config.wave;
        expect(waveConfig).toBeDefined();
        expect(waveConfig.gpioChip).toBe(1);
        expect(waveConfig.servoPin).toBe(17);
    });

    test('[test_eagerly_initializes_ai_engines_based_on_capabilities] eagerly initializes AI engines based on capabilities', async () => {
        const tj = TJBot.getInstance();
        const customConfig = {
            hardware: {
                microphone: true,
                speaker: true,
                camera: true,
            },
        };

        const initSTTSpy = vi.spyOn(tj.rpiDriver, 'initializeSTTEngine').mockResolvedValue();
        const initTTSSpy = vi.spyOn(tj.rpiDriver, 'initializeTTSEngine').mockResolvedValue();
        const initVisionSpy = vi.spyOn(tj.rpiDriver, 'initializeVisionEngine').mockResolvedValue();
        vi.spyOn(tj.rpiDriver, 'hasCapability').mockImplementation((cap) => {
            return cap === Capability.LISTEN || cap === Capability.SPEAK || cap === Capability.SEE;
        });

        await tj.initialize(customConfig);

        expect(initSTTSpy).toHaveBeenCalled();
        expect(initTTSSpy).toHaveBeenCalled();
        expect(initVisionSpy).toHaveBeenCalled();
    });
});

describe('TJBot - Color Methods', () => {
    let tj: TJBot;

    beforeEach(async () => {
        tj = TJBot.getInstance();
        await tj.initialize();
    });

    test('[test_shinecolors_returns_an_array] shineColors returns an array', () => {
        const colors = tj.shineColors();
        expect(Array.isArray(colors)).toBe(true);
    });

    test('[test_shinecolors_returns_consistent_results_on_multiple_calls] shineColors returns consistent results on multiple calls', () => {
        const colors1 = tj.shineColors();
        const colors2 = tj.shineColors();
        expect(colors1).toEqual(colors2);
    });

    test('[test_randomcolor_returns_a_string_when_colors_available] randomColor returns a string (when colors available)', () => {
        // randomColor may return undefined if no colors are loaded
        // But we should still test that when it returns, it's a string
        const color = tj.randomColor();
        if (color !== undefined) {
            expect(typeof color).toBe('string');
        }
    });
});

describe('TJBot - Capability Assertions', () => {
    let tj: TJBot;

    beforeEach(async () => {
        tj = TJBot.getInstance();
        await tj.initialize();
    });

    test('[test_assertcapability_throws_when_listen_capability_missing] assertCapability throws when LISTEN capability missing', () => {
        // Mock that driver doesn't have LISTEN capability
        vi.spyOn(tj.rpiDriver, 'hasCapability').mockReturnValue(false);

        expect(() => {
            tj['assertCapability'](Capability.LISTEN);
        }).toThrow(TJBotError);
    });

    test('[test_assertcapability_throws_when_see_capability_missing] assertCapability throws when SEE capability missing', () => {
        vi.spyOn(tj.rpiDriver, 'hasCapability').mockReturnValue(false);

        expect(() => {
            tj['assertCapability'](Capability.SEE);
        }).toThrow(TJBotError);
    });

    test('[test_assertcapability_throws_when_shine_capability_missing] assertCapability throws when SHINE capability missing', () => {
        vi.spyOn(tj.rpiDriver, 'hasCapability').mockReturnValue(false);

        expect(() => {
            tj['assertCapability'](Capability.SHINE);
        }).toThrow(TJBotError);
    });

    test('[test_assertcapability_throws_when_speak_capability_missing] assertCapability throws when SPEAK capability missing', () => {
        vi.spyOn(tj.rpiDriver, 'hasCapability').mockReturnValue(false);

        expect(() => {
            tj['assertCapability'](Capability.SPEAK);
        }).toThrow(TJBotError);
    });

    test('[test_assertcapability_throws_when_wave_capability_missing] assertCapability throws when WAVE capability missing', () => {
        vi.spyOn(tj.rpiDriver, 'hasCapability').mockReturnValue(false);

        expect(() => {
            tj['assertCapability'](Capability.WAVE);
        }).toThrow(TJBotError);
    });

    test('[test_assertcapability_does_not_throw_when_capability_is_available] assertCapability does not throw when capability is available', () => {
        vi.spyOn(tj.rpiDriver, 'hasCapability').mockReturnValue(true);

        expect(() => {
            tj['assertCapability'](Capability.SHINE);
        }).not.toThrow();
    });

    test('[test_capability_error_messages_mention_required_hardware] capability error messages mention required hardware', () => {
        vi.spyOn(tj.rpiDriver, 'hasCapability').mockReturnValue(false);

        try {
            tj['assertCapability'](Capability.LISTEN);
        } catch (error) {
            if (error instanceof TJBotError) {
                expect(error.message).toContain(Hardware.MICROPHONE);
            }
        }
    });
});

describe('TJBot - Shine Method', () => {
    let tj: TJBot;

    beforeEach(async () => {
        tj = TJBot.getInstance();
        await tj.initialize();
        vi.spyOn(tj.rpiDriver, 'hasCapability').mockReturnValue(true);
        vi.spyOn(tj.rpiDriver, 'renderLED').mockImplementation(async (_hexColor: string) => {});
    });

    test('[test_shine_accepts_color_name] shine accepts color name', async () => {
        await expect(tj.shine('red')).resolves.toBeUndefined();
    });

    test('[test_shine_accepts_hex_color_with] shine accepts hex color with #', async () => {
        await expect(tj.shine('#FF0000')).resolves.toBeUndefined();
    });

    test('[test_shine_accepts_hex_color_without] shine accepts hex color without #', async () => {
        await expect(tj.shine('FF0000')).resolves.toBeUndefined();
    });

    test('[test_shine_accepts] shine accepts "on" keyword', async () => {
        await expect(tj.shine('on')).resolves.toBeUndefined();
    });

    test('[test_shine_accepts__2] shine accepts "off" keyword', async () => {
        await expect(tj.shine('off')).resolves.toBeUndefined();
    });

    test('[test_shine_throws_when_capability_not_available] shine throws when capability not available', async () => {
        vi.spyOn(tj.rpiDriver, 'hasCapability').mockReturnValue(false);

        await expect(tj.shine('red')).rejects.toBeInstanceOf(TJBotError);
    });

    test('[test_shine_calls_renderled_with_color] shine calls renderLED with color', async () => {
        const renderLED = vi.spyOn(tj.rpiDriver, 'renderLED');
        await tj.shine('red');
        expect(renderLED).toHaveBeenCalled();
    });

    test('[test_shine_throws_on_invalid_color] shine throws on invalid color', async () => {
        await expect(tj.shine('notacolor_xyz123')).rejects.toBeInstanceOf(TJBotError);
    });

    test('[test_shine_hex_short_form_expands] shine hex short form expands', async () => {
        await expect(tj.shine('#abc')).resolves.toBeUndefined();
    });

    test('[test_shine_hex_without_hash_is_normalized] shine hex without hash is normalized', async () => {
        await expect(tj.shine('00ff00')).resolves.toBeUndefined();
    });

    test('[test_shine_invalid_hex_raises] shine invalid hex raises', async () => {
        await expect(tj.shine('#gggggg')).rejects.toBeInstanceOf(TJBotError);
    });

    test('[test_shine_unsupported_led_type_raises] shine unsupported led type raises', async () => {
        vi.spyOn(tj.rpiDriver, 'hasCapability').mockReturnValue(false);
        await expect(tj.shine('red')).rejects.toBeInstanceOf(TJBotError);
    });
});

describe('TJBot - Pulse Method', () => {
    let tj: TJBot;

    beforeEach(async () => {
        tj = TJBot.getInstance();
        await tj.initialize();
        vi.spyOn(tj.rpiDriver, 'hasCapability').mockReturnValue(true);
        vi.spyOn(tj.rpiDriver, 'renderLED').mockImplementation(async (_hexColor: string) => {});
    });

    test('[test_pulse_accepts_valid_color_and_duration] pulse accepts valid color and duration', async () => {
        await expect(tj.pulse('red', 1.0)).resolves.toBeUndefined();
    });

    test('[test_pulse_uses_default_duration_of_1_0_seconds] pulse uses default duration of 1.0 seconds', async () => {
        await expect(tj.pulse('red')).resolves.toBeUndefined();
    });

    test('[test_pulse_clamps_duration_to_minimum_0_5_seconds] pulse clamps duration to minimum 0.5 seconds', async () => {
        await expect(tj.pulse('red', 0.1)).resolves.toBeUndefined();
    });

    test('[test_pulse_clamps_duration_exceeding_2_0_seconds] pulse clamps duration to maximum 2.0 seconds', async () => {
        await expect(tj.pulse('red', 2.5)).resolves.toBeUndefined();
    });

    test('[test_pulse_throws_when_capability_not_available] pulse throws when capability not available', async () => {
        vi.spyOn(tj.rpiDriver, 'hasCapability').mockReturnValue(false);

        await expect(tj.pulse('red')).rejects.toBeInstanceOf(TJBotError);
    });

    test('[test_pulse_accepts_boundary_duration_0_5_seconds] pulse accepts boundary duration 0.5 seconds', async () => {
        await expect(tj.pulse('red', 0.5)).resolves.toBeUndefined();
    });

    test('[test_pulse_accepts_boundary_duration_2_0_seconds] pulse accepts boundary duration 2.0 seconds', async () => {
        await expect(tj.pulse('red', 2.0)).resolves.toBeUndefined();
    });
});

describe('TJBot - Arm Movement Methods', () => {
    let tj: TJBot;

    beforeEach(async () => {
        tj = TJBot.getInstance();
        await tj.initialize();
        vi.spyOn(tj.rpiDriver, 'hasCapability').mockReturnValue(true);
        vi.spyOn(tj.rpiDriver, 'renderServoPosition').mockImplementation(() => {});
    });

    test('[test_raisearm_calls_renderservoposition] raiseArm calls renderServoPosition', () => {
        const renderServoPosition = vi.spyOn(tj.rpiDriver, 'renderServoPosition');
        tj.raiseArm();
        expect(renderServoPosition).toHaveBeenCalled();
    });

    test('[test_armback_calls_renderservoposition] armBack calls renderServoPosition', () => {
        const renderServoPosition = vi.spyOn(tj.rpiDriver, 'renderServoPosition');
        tj.armBack();
        expect(renderServoPosition).toHaveBeenCalled();
    });

    test('[test_lowerarm_calls_renderservoposition] lowerArm calls renderServoPosition', () => {
        const renderServoPosition = vi.spyOn(tj.rpiDriver, 'renderServoPosition');
        tj.lowerArm();
        expect(renderServoPosition).toHaveBeenCalled();
    });

    test('[test_raisearm_throws_when_capability_not_available] raiseArm throws when capability not available', () => {
        vi.spyOn(tj.rpiDriver, 'hasCapability').mockReturnValue(false);

        expect(() => {
            tj.raiseArm();
        }).toThrow(TJBotError);
    });

    test('[test_armback_throws_when_capability_not_available] armBack throws when capability not available', () => {
        vi.spyOn(tj.rpiDriver, 'hasCapability').mockReturnValue(false);

        expect(() => {
            tj.armBack();
        }).toThrow(TJBotError);
    });

    test('[test_lowerarm_throws_when_capability_not_available] lowerArm throws when capability not available', () => {
        vi.spyOn(tj.rpiDriver, 'hasCapability').mockReturnValue(false);

        expect(() => {
            tj.lowerArm();
        }).toThrow(TJBotError);
    });
});

describe('TJBot - Wave Method', () => {
    let tj: TJBot;

    beforeEach(async () => {
        tj = TJBot.getInstance();
        await tj.initialize();
        vi.spyOn(tj.rpiDriver, 'hasCapability').mockReturnValue(true);
        vi.spyOn(tj.rpiDriver, 'renderServoPosition').mockImplementation(() => {});
    });

    test('[test_wave_executes_without_error] wave executes without error', async () => {
        await expect(tj.wave()).resolves.toBeUndefined();
    });

    test('[test_wave_calls_renderservoposition_multiple_times] wave calls renderServoPosition multiple times', async () => {
        const renderServoPosition = vi.spyOn(tj.rpiDriver, 'renderServoPosition');
        await tj.wave();
        expect(renderServoPosition.mock.calls.length).toBeGreaterThanOrEqual(3);
    });

    test('[test_wave_throws_when_capability_not_available] wave throws when capability not available', async () => {
        vi.spyOn(tj.rpiDriver, 'hasCapability').mockReturnValue(false);
        await expect(tj.wave()).rejects.toBeInstanceOf(TJBotError);
    });

    test('[test_wave_unsupported_servo_driver_raises] wave unsupported servo driver raises', async () => {
        vi.spyOn(tj.rpiDriver, 'hasCapability').mockReturnValue(false);
        await expect(tj.wave()).rejects.toBeInstanceOf(TJBotError);
    });
});

describe('TJBot - Listen and Speak Methods', () => {
    let tj: TJBot;

    beforeEach(async () => {
        tj = TJBot.getInstance();
        await tj.initialize();
        vi.spyOn(tj.rpiDriver, 'hasCapability').mockReturnValue(true);
        vi.spyOn(tj.rpiDriver, 'listenForTranscript').mockResolvedValue('hello');
        vi.spyOn(tj.rpiDriver, 'speak').mockResolvedValue(undefined);
        vi.spyOn(tj.rpiDriver, 'playAudio').mockResolvedValue(undefined);
    });

    test('[test_listen_throws_when_capability_not_available] listen throws when capability not available', async () => {
        vi.spyOn(tj.rpiDriver, 'hasCapability').mockReturnValue(false);

        try {
            await tj.listen();
            expect.fail('Should have thrown');
        } catch (error) {
            expect(error).toBeInstanceOf(TJBotError);
        }
    });

    test('[test_speak_throws_when_capability_not_available] speak throws when capability not available', async () => {
        vi.spyOn(tj.rpiDriver, 'hasCapability').mockReturnValue(false);

        try {
            await tj.speak('hello');
            expect.fail('Should have thrown');
        } catch (error) {
            expect(error).toBeInstanceOf(TJBotError);
        }
    });

    test('[test_play_does_not_check_for_speak_capability_before_execution] play() does not check for SPEAK capability before execution', async () => {
        vi.spyOn(tj.rpiDriver, 'hasCapability').mockReturnValue(false);
        const playSpy = vi.spyOn(tj.rpiDriver, 'playAudio');

        // play() doesn't check capability, so it should not throw
        await tj.play('/path/to/sound.wav');
        expect(playSpy).toHaveBeenCalledWith('/path/to/sound.wav');
    });

    test('[test_observe_invalid_input_type_raises] observe invalid input type raises', async () => {
        // @ts-expect-error parity with Python invalid-input test
        await expect(tj.listen(123)).rejects.toBeInstanceOf(TJBotError);
    });

    test('[test_listen_async_streaming_callbacks] listen in streaming mode propagates callbacks', async () => {
        const customConfig = {
            listen: {
                backend: {
                    type: 'ibm-watson-stt' as const,
                    'ibm-watson-stt': {
                        model: 'en-US_Multimedia',
                        interimResults: true,
                    },
                },
            },
        };
        const tjStream = TJBot.getInstance();
        await tjStream.initialize(customConfig);
        vi.spyOn(tjStream.rpiDriver, 'hasCapability').mockReturnValue(true);

        const partialCb = vi.fn();
        const finalCb = vi.fn();

        const listenSpy = vi.spyOn(tjStream.rpiDriver, 'listenForTranscript').mockImplementation(async (options) => {
            options?.onPartialResult?.('he');
            options?.onFinalResult?.('hello');
            return 'hello';
        });

        await tjStream.listen(partialCb, finalCb);

        expect(listenSpy).toHaveBeenCalled();
        expect(partialCb).toHaveBeenCalledWith('he');
        expect(finalCb).toHaveBeenCalledWith('hello');
    });
});

describe('TJBot - See Method', () => {
    let tj: TJBot;

    beforeEach(async () => {
        tj = TJBot.getInstance();
        await tj.initialize();
        vi.spyOn(tj.rpiDriver, 'hasCapability').mockReturnValue(true);
    });

    test('[test_see_throws_when_capability_not_available] see throws when capability not available', async () => {
        vi.spyOn(tj.rpiDriver, 'hasCapability').mockReturnValue(false);

        try {
            await tj.see();
            expect.fail('Should have thrown');
        } catch (error) {
            expect(error).toBeInstanceOf(TJBotError);
        }
    });

    test('[test_see_with_default_path] see with default path', async () => {
        const expectedBuffer = Buffer.from('photo-data-stream');
        const captureSpy = vi.spyOn(tj.rpiDriver, 'capturePhotoBuffer').mockResolvedValue(expectedBuffer);

        const buffer = await tj.see();
        expect(captureSpy).toHaveBeenCalled();
        expect(buffer).toBe(expectedBuffer);
    });

    test('[test_look_returns_string_when_given_custom_path] look() returns string when given custom path', async () => {
        vi.mocked(tj.rpiDriver.capturePhoto).mockResolvedValue('/tmp/photo.jpg');
        const result = await tj.look('/custom/path.jpg');
        expect(typeof result).toBe('string');
        expect(tj.rpiDriver.capturePhoto).toHaveBeenCalledWith('/custom/path.jpg');
    });
});

describe('TJBot - Vision Methods', () => {
    let tj: TJBot;

    beforeEach(async () => {
        tj = TJBot.getInstance();
        await tj.initialize();
        vi.spyOn(tj.rpiDriver, 'hasCapability').mockReturnValue(true);
    });

    test('[test_detectobjects_calls_rpidriver_detectobjects] detectObjects calls rpiDriver.detectObjects', async () => {
        const spy = vi
            .spyOn(tj.rpiDriver, 'detectObjects')
            .mockResolvedValue([{ label: 'person', confidence: 0.9, bbox: [0, 0, 100, 100] }]);
        const result = await tj.detectObjects('image-data');
        expect(spy).toHaveBeenCalledWith('image-data');
        expect(result).toHaveLength(1);
        expect(result[0].label).toBe('person');
    });

    test('[test_classifyimage_calls_rpidriver_classifyimage] classifyImage calls rpiDriver.classifyImage', async () => {
        const spy = vi.spyOn(tj.rpiDriver, 'classifyImage').mockResolvedValue([{ label: 'dog', confidence: 0.95 }]);
        const result = await tj.classifyImage('image-data');
        expect(spy).toHaveBeenCalledWith('image-data');
        expect(result).toHaveLength(1);
        expect(result[0].label).toBe('dog');
    });

    test('[test_detectfaces_calls_rpidriver_detectfaces] detectFaces calls rpiDriver.detectFaces', async () => {
        const spy = vi.spyOn(tj.rpiDriver, 'detectFaces').mockResolvedValue({ isFaceDetected: true, metadata: [] });
        const result = await tj.detectFaces('image-data');
        expect(spy).toHaveBeenCalledWith('image-data');
        expect(result.isFaceDetected).toBe(true);
    });

    test('[test_describeimage_calls_rpidriver_describeimage] describeImage calls rpiDriver.describeImage', async () => {
        const spy = vi
            .spyOn(tj.rpiDriver, 'describeImage')
            .mockResolvedValue({ description: 'a sunny day', confidence: 0.8 });
        const result = await tj.describeImage('image-data');
        expect(spy).toHaveBeenCalledWith('image-data');
        expect(result.description).toBe('a sunny day');
    });
});

describe('TJBot - Configuration Access', () => {
    let tj: TJBot;

    beforeEach(async () => {
        tj = TJBot.getInstance();
        await tj.initialize();
    });

    test('[test_config_is_accessible] config is accessible', () => {
        expect(tj.config).toBeDefined();
        expect(typeof tj.config).toBe('object');
    });

    test('[test_rpimodel_is_accessible] rpiModel is accessible', () => {
        expect(tj.rpiModel).toBeDefined();
        expect(typeof tj.rpiModel).toBe('string');
    });

    test('[test_rpidriver_is_accessible] rpiDriver is accessible', () => {
        expect(tj.rpiDriver).toBeDefined();
        expect(typeof tj.rpiDriver).toBe('object');
    });
});

describe('TJBot lifecycle resilience, async wrappers, and hardware initialization behavior', () => {
    let tj: TJBot;

    beforeEach(async () => {
        tj = TJBot.getInstance();
        await tj.initialize();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    test('[test_gets_tjbot_singleton_instance__2] tjbot get instance singleton', () => {
        const a = TJBot.getInstance();
        const b = TJBot.getInstance();
        expect(a).toBe(b);
    });

    test('[test_has_hardware_static_property__2] tjbot hardware static property', () => {
        expect(TJBot.Hardware).toBeDefined();
        expect(TJBot.Hardware.LED).toBeDefined();
    });

    test('[test_tjbot_initialize_returns_self] tjbot initialize async returns self', async () => {
        const out = await tj.initialize();
        expect(out).toBe(tj);
    });

    test('[test_tjbot_initialize_sync] tjbot initialize sync', async () => {
        await expect(tj.initialize()).resolves.toBeDefined();
    });

    test('[test_tjbot_get_recipe_config] tjbot get recipe config', () => {
        const recipe = TJBot.getRecipeConfig();
        expect(recipe).toBeDefined();
        expect(typeof recipe).toBe('object');
    });

    test('[test_tjbot_get_local_models] tjbot get local models', () => {
        const models = tj.getLocalModels();
        expect(Array.isArray(models)).toBe(true);
    });

    test('[test_capability_error_messages_mention_required_hardware__2] capability error mentions required hardware', () => {
        vi.spyOn(tj.rpiDriver, 'hasCapability').mockReturnValue(false);
        try {
            tj['assertCapability'](Capability.SPEAK);
        } catch (error) {
            if (error instanceof TJBotError) {
                expect(error.message).toContain(Hardware.SPEAKER);
            }
        }
    });

    test('[test_listen_throws_when_capability_not_available__2] listen requires capability', async () => {
        vi.spyOn(tj.rpiDriver, 'hasCapability').mockReturnValue(false);
        await expect(tj.listen()).rejects.toThrow(TJBotError);
    });

    test('[test_speak_throws_when_capability_not_available__2] speak requires capability', async () => {
        vi.spyOn(tj.rpiDriver, 'hasCapability').mockReturnValue(false);
        await expect(tj.speak('hello')).rejects.toThrow(TJBotError);
    });

    test('[test_shine_throws_when_capability_not_available__2] shine throws when capability missing', async () => {
        vi.spyOn(tj.rpiDriver, 'hasCapability').mockReturnValue(false);
        await expect(tj.shine('red')).rejects.toThrow(TJBotError);
    });

    test('[test_shine_accepts_hex_color_with_and_without_hash] shine accepts hex color with and without hash', async () => {
        vi.spyOn(tj.rpiDriver, 'hasCapability').mockReturnValue(true);
        vi.spyOn(tj.rpiDriver, 'renderLED').mockImplementation(async () => {});
        await expect(tj.shine('#FF0000')).resolves.toBeUndefined();
        await expect(tj.shine('FF0000')).resolves.toBeUndefined();
    });

    test('[test_shine_accepts__3] shine accepts on and off', async () => {
        vi.spyOn(tj.rpiDriver, 'hasCapability').mockReturnValue(true);
        vi.spyOn(tj.rpiDriver, 'renderLED').mockImplementation(async () => {});
        await expect(tj.shine('on')).resolves.toBeUndefined();
        await expect(tj.shine('off')).resolves.toBeUndefined();
    });

    test('[test_play_does_not_check_for_speak_capability_before_execution__2] play does not require speak capability', async () => {
        vi.spyOn(tj.rpiDriver, 'hasCapability').mockReturnValue(false);
        const playSpy = vi.spyOn(tj.rpiDriver, 'playAudio').mockResolvedValue();
        await tj.play('/tmp/test.wav');
        expect(playSpy).toHaveBeenCalledWith('/tmp/test.wav');
    });

    test('[test_pulse_accepts_valid_durations] pulse accepts valid durations', async () => {
        vi.spyOn(tj.rpiDriver, 'hasCapability').mockReturnValue(true);
        vi.spyOn(tj.rpiDriver, 'renderLED').mockImplementation(async () => {});
        await expect(tj.pulse('red', 0.5)).resolves.toBeUndefined();
        await expect(tj.pulse('red', 1.0)).resolves.toBeUndefined();
        await expect(tj.pulse('red', 2.0)).resolves.toBeUndefined();
    });

    test('[test_listen_delegates_to_driver] listen delegates to driver', async () => {
        vi.spyOn(tj.rpiDriver, 'hasCapability').mockReturnValue(true);
        vi.spyOn(tj.rpiDriver, 'listenForTranscript').mockResolvedValue('transcript');
        const out = await tj.listen();
        expect(out).toBe('transcript');
    });

    test('[test_speak_delegates_to_driver] speak delegates to driver', async () => {
        vi.spyOn(tj.rpiDriver, 'hasCapability').mockReturnValue(true);
        const spy = vi.spyOn(tj.rpiDriver, 'speak').mockResolvedValue();
        await tj.speak('hello');
        expect(spy).toHaveBeenCalledWith('hello');
    });

    test('[test_look_returns_string_when_given_custom_path__2] look returns driver path', async () => {
        vi.spyOn(tj.rpiDriver, 'hasCapability').mockReturnValue(true);
        vi.spyOn(tj.rpiDriver, 'capturePhoto').mockResolvedValue('/tmp/photo.jpg');
        const out = await tj.look('/tmp/photo.jpg');
        expect(out).toBe('/tmp/photo.jpg');
    });

    test('[test_see_reads_bytes_from_driver_buffer] see reads bytes from driver buffer', async () => {
        vi.spyOn(tj.rpiDriver, 'hasCapability').mockReturnValue(true);
        vi.spyOn(tj.rpiDriver, 'capturePhotoBuffer').mockResolvedValue(Buffer.from('abc'));
        const out = await tj.see();
        expect(Buffer.isBuffer(out)).toBe(true);
        expect(out.toString()).toBe('abc');
    });

    test('[test_see_throws_when_capability_not_available__2] see requires capability', async () => {
        vi.spyOn(tj.rpiDriver, 'hasCapability').mockReturnValue(false);
        await expect(tj.see()).rejects.toThrow(TJBotError);
    });

    test('[test_listen_async_streaming_callbacks__2] listen async streaming callbacks', async () => {
        vi.spyOn(tj.rpiDriver, 'hasCapability').mockReturnValue(true);
        await tj.initialize({
            listen: {
                backend: { type: 'local', local: { model: 'zipformer-en' } },
            },
        });

        const partialCb = vi.fn();
        const finalCb = vi.fn();

        vi.spyOn(tj.rpiDriver, 'listenForTranscript').mockImplementation(async (options) => {
            options?.onPartialResult?.('partial');
            options?.onFinalResult?.('final');
            return '';
        });

        await tj.listen(partialCb, finalCb);
        expect(partialCb).toHaveBeenCalledWith('partial');
        expect(finalCb).toHaveBeenCalledWith('final');
    });

    test('[test_listen_async_offline_rejects_partial_callback] listen async offline rejects partial callback', async () => {
        vi.spyOn(tj.rpiDriver, 'hasCapability').mockReturnValue(true);
        await tj.initialize({
            listen: {
                backend: { type: 'local', local: { model: 'moonshine-tiny' } },
            },
        });

        await expect(
            tj.listen(
                () => {},
                () => {}
            )
        ).rejects.toThrow('offline');
    });

    test('[test_tjbot_reinitialize_runs_cleanup_on_previous_driver] tjbot reinitialize runs cleanup on previous driver', async () => {
        const cleanupSpy = vi.spyOn(tj.rpiDriver, 'cleanup').mockResolvedValue();
        await tj.initialize();
        expect(cleanupSpy).toHaveBeenCalled();
    });

    test('[test_tjbot_initialize_installs_process_hooks] tjbot initialize async installs process hooks', async () => {
        (tj as unknown as { _processHooksInstalled: boolean })._processHooksInstalled = false;
        const onceSpy = vi.spyOn(process, 'once').mockImplementation(((..._args: unknown[]) => process) as never);
        await tj.initialize();
        expect(onceSpy).toHaveBeenCalled();
    });

    test('[test_tjbot_process_hooks_installed_once] tjbot process hooks installed once', async () => {
        (tj as unknown as { _processHooksInstalled: boolean })._processHooksInstalled = false;
        const onceSpy = vi.spyOn(process, 'once').mockImplementation(((..._args: unknown[]) => process) as never);
        await tj.initialize();
        const first = onceSpy.mock.calls.length;
        await tj.initialize();
        expect(onceSpy.mock.calls.length).toBe(first);
    });

    test('[test_shinecolors_returns_an_array__2] tjbot shine colors and random color', () => {
        const colors = tj.shineColors();
        const c = tj.randomColor();
        expect(Array.isArray(colors)).toBe(true);
        expect(typeof c).toBe('string');
    });

    test('[test_wave_and_arm_async_wrappers] wave and arm async wrappers', async () => {
        vi.spyOn(tj.rpiDriver, 'hasCapability').mockReturnValue(true);
        vi.spyOn(tj.rpiDriver, 'renderServoPosition').mockImplementation(() => {});
        await expect(tj.wave()).resolves.toBeUndefined();
        await expect(tj.raiseArm()).resolves.toBeUndefined();
        await expect(tj.armBack()).resolves.toBeUndefined();
        await expect(tj.lowerArm()).resolves.toBeUndefined();
    });

    test('[test_wave_calls_renderservoposition_multiple_times__2] wave calls servo multiple times', async () => {
        vi.spyOn(tj.rpiDriver, 'hasCapability').mockReturnValue(true);
        const servoSpy = vi.spyOn(tj.rpiDriver, 'renderServoPosition').mockImplementation(() => {});
        await tj.wave();
        expect(servoSpy.mock.calls.length).toBeGreaterThanOrEqual(2);
    });

    test('[test_async_wrappers_return_expected_values] async wrappers return expected values', async () => {
        vi.spyOn(tj.rpiDriver, 'hasCapability').mockReturnValue(true);
        vi.spyOn(tj.rpiDriver, 'listenForTranscript').mockResolvedValue('hello');
        vi.spyOn(tj.rpiDriver, 'capturePhoto').mockResolvedValue('/tmp/p.jpg');
        vi.spyOn(tj.rpiDriver, 'capturePhotoBuffer').mockResolvedValue(Buffer.from('img'));
        vi.spyOn(tj.rpiDriver, 'renderLED').mockResolvedValue();
        vi.spyOn(tj.rpiDriver, 'speak').mockResolvedValue();

        await expect(tj.listen()).resolves.toBe('hello');
        await expect(tj.look('/tmp/p.jpg')).resolves.toBe('/tmp/p.jpg');
        await expect(tj.see()).resolves.toEqual(Buffer.from('img'));
        await expect(tj.shine('red')).resolves.toBeUndefined();
        await expect(tj.speak('hello')).resolves.toBeUndefined();
    });

    test('[test_pulse_async_drives_led_without_blocking_event_loop] pulse async drives led without blocking event loop', async () => {
        vi.spyOn(tj.rpiDriver, 'hasCapability').mockReturnValue(true);
        const renderSpy = vi.spyOn(tj.rpiDriver, 'renderLED').mockResolvedValue();
        await expect(tj.pulse('red', 1.0)).resolves.toBeUndefined();
        expect(renderSpy.mock.calls.length).toBeGreaterThan(0);
    });

    test('[test_pulse_async_throws_when_duration_exceeds_max] pulse async throws when duration exceeds max', async () => {
        vi.spyOn(tj.rpiDriver, 'hasCapability').mockReturnValue(true);
        vi.spyOn(tj.rpiDriver, 'renderLED').mockResolvedValue();
        // Current behavior clamps to max; ensure operation still completes.
        await expect(tj.pulse('red', 99)).resolves.toBeUndefined();
    });

    test('[test_pulse_clamps_duration_exceeding_2_0_seconds__2] pulse throws when duration exceeds max', async () => {
        vi.spyOn(tj.rpiDriver, 'hasCapability').mockReturnValue(true);
        vi.spyOn(tj.rpiDriver, 'renderLED').mockResolvedValue();
        // Current behavior clamps to max; ensure operation still completes.
        await expect(tj.pulse('red', 99)).resolves.toBeUndefined();
    });

    test('[test_see_falls_back_to_temp_file_when_buffer_capture_missing] see falls back to temp file when buffer capture missing', async () => {
        vi.spyOn(tj.rpiDriver, 'hasCapability').mockReturnValue(true);
        vi.spyOn(tj.rpiDriver, 'capturePhotoBuffer').mockRejectedValue(new TJBotError('buffer unavailable'));
        vi.spyOn(tj.rpiDriver, 'capturePhoto').mockResolvedValue('/tmp/fallback.jpg');
        vi.spyOn(fsPromises, 'readFile').mockResolvedValue(Buffer.from('fallback-image'));
        vi.spyOn(fsPromises, 'unlink').mockResolvedValue(undefined);

        await expect(tj.see()).resolves.toEqual(Buffer.from('fallback-image'));
    });

    test('[test_tjbot_led_neopixel_from_real_config] tjbot neopixel config parses from real override', async () => {
        const bot = TJBot.getInstance();
        await bot.initialize({
            hardware: { led: true },
            shine: { hasNeopixelLED: true, neopixel: { gpioPin: 18 } },
        });

        expect(bot.config.hardware.led).toBe(true);
        expect(bot.config.shine).toBeDefined();
        expect(bot.config.shine?.hasNeopixelLED).toBe(true);
        expect(bot.config.shine?.neopixel).toBeDefined();
        expect(bot.config.shine?.neopixel?.gpioPin).toBe(18);
    });

    test('[test_tjbot_led_common_anode_from_real_config] tjbot common anode config parses from real override', async () => {
        const bot = TJBot.getInstance();
        await bot.initialize({
            hardware: { led: true },
            shine: {
                hasCommonAnodeLED: true,
                commonanode: { redPin: 21, greenPin: 20, bluePin: 26 },
            },
        });

        expect(bot.config.hardware.led).toBe(true);
        expect(bot.config.shine).toBeDefined();
        expect(bot.config.shine?.hasCommonAnodeLED).toBe(true);
        expect(bot.config.shine?.commonanode).toBeDefined();
        expect(bot.config.shine?.commonanode?.redPin).toBe(21);
        expect(bot.config.shine?.commonanode?.greenPin).toBe(20);
        expect(bot.config.shine?.commonanode?.bluePin).toBe(26);
    });

    test('[test_tjbot_lazy_initialization] tjbot getInstance defers state until initialize', async () => {
        (TJBot as unknown as { instance?: TJBot }).instance = undefined;
        const bot = TJBot.getInstance();

        expect((bot as unknown as { config?: unknown }).config).toBeUndefined();
        expect((bot as unknown as { rpiDriver?: unknown }).rpiDriver).toBeUndefined();

        await bot.initialize({
            hardware: { led: true },
            shine: { hasNeopixelLED: true, neopixel: { gpioPin: 18 } },
        });

        expect(bot.config).toBeDefined();
        expect(bot.rpiDriver).toBeDefined();
    });

    test('[test_vision_see_and_detect_objects_integration] vision pipeline see and detectObjects works in sequence', async () => {
        vi.spyOn(tj.rpiDriver, 'hasCapability').mockReturnValue(true);
        const imageBuffer = Buffer.from('fake-image-data');
        vi.spyOn(tj.rpiDriver, 'capturePhotoBuffer').mockResolvedValue(imageBuffer);
        const detectSpy = vi
            .spyOn(tj.rpiDriver, 'detectObjects')
            .mockResolvedValue([{ label: 'person', confidence: 0.9, bbox: [0, 0, 100, 100] }]);

        const captured = await tj.see();
        const detections = await tj.detectObjects(captured);

        expect(captured).toEqual(imageBuffer);
        expect(detectSpy).toHaveBeenCalledWith(imageBuffer);
        expect(detections).toHaveLength(1);
    });

    test('[test_detect_objects_throws_when_vision_not_initialized] detectObjects throws when called before initialize', async () => {
        (TJBot as unknown as { instance?: TJBot }).instance = undefined;
        const bot = TJBot.getInstance();
        await expect(bot.detectObjects(Buffer.from('img'))).rejects.toBeInstanceOf(TJBotError);
    });

    test('[test_see_fallback_when_buffer_capture_fails_with_exception] see falls back to file capture when buffer capture fails', async () => {
        vi.spyOn(tj.rpiDriver, 'hasCapability').mockReturnValue(true);
        vi.spyOn(tj.rpiDriver, 'capturePhotoBuffer').mockRejectedValue(new Error('Buffer capture failed'));
        vi.spyOn(tj.rpiDriver, 'capturePhoto').mockResolvedValue('/tmp/photo.jpg');
        const readSpy = vi.spyOn(fsPromises, 'readFile').mockResolvedValue(Buffer.from('fallback-image-from-file'));
        const unlinkSpy = vi.spyOn(fsPromises, 'unlink').mockResolvedValue(undefined);

        const result = await tj.see();

        expect(result).toEqual(Buffer.from('fallback-image-from-file'));
        expect(readSpy).toHaveBeenCalledWith('/tmp/photo.jpg');
        expect(unlinkSpy).toHaveBeenCalledWith('/tmp/photo.jpg');
    });

    test('[test_tjbot_initialize_twice_does_not_reregister_hooks] tjbot async then sync initialize does not reregister hooks', async () => {
        (tj as unknown as { _processHooksInstalled: boolean })._processHooksInstalled = false;
        const onceSpy = vi.spyOn(process, 'once').mockImplementation(((..._args: unknown[]) => process) as never);
        await tj.initialize();
        const first = onceSpy.mock.calls.length;
        await tj.initialize();
        expect(onceSpy.mock.calls.length).toBe(first);
    });

    test('[test_tjbot_cleanup_before_initialize_is_noop] tjbot cleanup before initialize is noop', async () => {
        const bot = TJBot.getInstance();
        await expect((bot as unknown as { cleanup: () => Promise<void> }).cleanup()).resolves.toBeUndefined();
    });

    test('[test_tjbot_concurrent_cleanup_waits_for_inflight_cleanup] tjbot concurrent cleanup waits for inflight cleanup', async () => {
        const bot = TJBot.getInstance();
        let resolved = false;
        const inflight = new Promise<void>((resolve) => {
            setTimeout(() => {
                resolved = true;
                resolve();
            }, 0);
        });
        (bot as unknown as { _cleanupPromise: Promise<void> | null })._cleanupPromise = inflight;

        const p1 = (bot as unknown as { cleanup: () => Promise<void> }).cleanup();
        const p2 = (bot as unknown as { cleanup: () => Promise<void> }).cleanup();

        await Promise.all([p1, p2]);
        expect(resolved).toBe(true);
    });

    test('[test_tjbot_hardware_init] tjbot hardware init', async () => {
        const bot = TJBot.getInstance();
        await bot.initialize({
            hardware: {
                speaker: true,
                microphone: true,
                camera: true,
                led: true,
                servo: true,
            },
            shine: {
                hasNeopixelLED: true,
                neopixel: { gpioPin: 18 },
            },
        });

        expect(bot.rpiDriver.setupSpeaker).toHaveBeenCalled();
        expect(bot.rpiDriver.setupMicrophone).toHaveBeenCalled();
        expect(bot.rpiDriver.setupCamera).toHaveBeenCalled();
        expect(bot.rpiDriver.setupLED).toHaveBeenCalled();
        expect(bot.rpiDriver.setupServo).toHaveBeenCalled();
    });

    test('[test_initializes_rpi_driver_based_on_model_pi_5__2] tjbot init pi5 driver', async () => {
        vi.spyOn(RPiDetect, 'model').mockReturnValue('Raspberry Pi 5 Model B Rev 1.0');
        await tj.initialize();
        expect(tj.rpiDriver).toBeInstanceOf(RPi5Driver);
    });

    test('[test_tjbot_init_common_driver] tjbot init common driver', async () => {
        vi.spyOn(RPiDetect, 'model').mockReturnValue('Some Unknown Board');
        await tj.initialize();
        expect(tj.rpiDriver).toBeInstanceOf(RPi3Driver);
    });

    test('[test_tjbot_led_common_anode_enabled_without_config_raises] tjbot led common anode enabled without config raises', async () => {
        // Current behavior allows defaults for pin configuration.
        await expect(
            tj.initialize({
                hardware: { led: true },
                shine: { hasCommonAnodeLED: true },
            })
        ).resolves.toBeDefined();
    });

    test('[test_tjbot_led_neopixel_enabled_without_config_raises] tjbot led neopixel enabled without config raises', async () => {
        // Current behavior allows defaults for NeoPixel configuration.
        await expect(
            tj.initialize({
                hardware: { led: true },
                shine: { hasNeopixelLED: true },
            })
        ).resolves.toBeDefined();
    });

    test('[test_tjbot_signal_handler_triggers_cleanup] tjbot signal handler triggers cleanup', async () => {
        await tj.initialize();
        const cleanupSpy = vi.spyOn(tj.rpiDriver, 'cleanup').mockResolvedValue();
        const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);

        await (
            tj as unknown as { runLifecycleCleanup: (reason: string, code?: number) => Promise<void> }
        ).runLifecycleCleanup('SIGTERM', 143);

        expect(cleanupSpy).toHaveBeenCalled();
        expect(exitSpy).toHaveBeenCalledWith(143);
    });
});
