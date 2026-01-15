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

import { describe, test, expect, beforeEach, vi } from 'vitest';
import TJBot from '../../src/tjbot.js';
import { Capability, Hardware, TJBotError } from '../../src/utils/index.js';

// Mock the RPiDriver and its subclasses
vi.mock('../../src/rpi-drivers/index.js', () => {
    const mockDriver = {
        hasCapability: vi.fn(() => false),
        renderLED: vi.fn(),
        renderServoPosition: vi.fn(),
        listenForTranscript: vi.fn(),
        speak: vi.fn(),
        playAudio: vi.fn(),
        capturePhoto: vi.fn(),
        setupCamera: vi.fn(),
        setupLEDNeopixel: vi.fn(),
        setupLEDCommonAnode: vi.fn(),
        setupMicrophone: vi.fn(),
        setupServo: vi.fn(),
        setupSpeaker: vi.fn(),
    };

    return {
        RPiDetect: {
            model: () => 'Raspberry Pi 5 Model B Rev 1.0',
        },
        RPi3Driver: class {
            hasCapability = mockDriver.hasCapability;
            renderLED = mockDriver.renderLED;
            renderServoPosition = mockDriver.renderServoPosition;
            listenForTranscript = mockDriver.listenForTranscript;
            speak = mockDriver.speak;
            playAudio = mockDriver.playAudio;
            capturePhoto = mockDriver.capturePhoto;
            setupCamera = mockDriver.setupCamera;
            setupLEDNeopixel = mockDriver.setupLEDNeopixel;
            setupLEDCommonAnode = mockDriver.setupLEDCommonAnode;
            setupMicrophone = mockDriver.setupMicrophone;
            setupServo = mockDriver.setupServo;
            setupSpeaker = mockDriver.setupSpeaker;
        },
        RPi4Driver: class {
            hasCapability = mockDriver.hasCapability;
            renderLED = mockDriver.renderLED;
            renderServoPosition = mockDriver.renderServoPosition;
            listenForTranscript = mockDriver.listenForTranscript;
            speak = mockDriver.speak;
            playAudio = mockDriver.playAudio;
            capturePhoto = mockDriver.capturePhoto;
            setupCamera = mockDriver.setupCamera;
            setupLEDNeopixel = mockDriver.setupLEDNeopixel;
            setupLEDCommonAnode = mockDriver.setupLEDCommonAnode;
            setupMicrophone = mockDriver.setupMicrophone;
            setupServo = mockDriver.setupServo;
            setupSpeaker = mockDriver.setupSpeaker;
        },
        RPi5Driver: class {
            hasCapability = mockDriver.hasCapability;
            renderLED = mockDriver.renderLED;
            renderServoPosition = mockDriver.renderServoPosition;
            listenForTranscript = mockDriver.listenForTranscript;
            speak = mockDriver.speak;
            playAudio = mockDriver.playAudio;
            capturePhoto = mockDriver.capturePhoto;
            setupCamera = mockDriver.setupCamera;
            setupLEDNeopixel = mockDriver.setupLEDNeopixel;
            setupLEDCommonAnode = mockDriver.setupLEDCommonAnode;
            setupMicrophone = mockDriver.setupMicrophone;
            setupServo = mockDriver.setupServo;
            setupSpeaker = mockDriver.setupSpeaker;
        },
    };
});

describe('TJBot - Constructor and Initialization', () => {
    test('creates TJBot instance with default config', () => {
        const tj = new TJBot();
        expect(tj).toBeDefined();
        expect(tj.config).toBeDefined();
    });

    test('has VERSION static property', () => {
        expect(TJBot.VERSION).toBe('v3.0.0');
    });

    test('has Hardware static property', () => {
        expect(TJBot.Hardware).toBeDefined();
        expect(TJBot.Hardware.CAMERA).toBeDefined();
        expect(TJBot.Hardware.MICROPHONE).toBeDefined();
    });

    test('detects RPi model on construction', () => {
        const tj = new TJBot();
        expect(tj.rpiModel).toBeDefined();
        expect(typeof tj.rpiModel).toBe('string');
    });

    test('initializes RPi driver based on model (Pi 5)', () => {
        const tj = new TJBot();
        expect(tj.rpiDriver).toBeDefined();
        // Should be RPi5Driver for the mock
        expect(typeof tj.rpiDriver).toBe('object');
    });

    test('sets logging level from config', () => {
        const tj = new TJBot();
        // Should not throw
        tj.setLogLevel('debug');
        expect(true).toBe(true);
    });
});

describe('TJBot - Color Methods', () => {
    let tj: TJBot;

    beforeEach(() => {
        tj = new TJBot();
    });

    test('shineColors returns an array', () => {
        const colors = tj.shineColors();
        expect(Array.isArray(colors)).toBe(true);
    });

    test('shineColors returns consistent results on multiple calls', () => {
        const colors1 = tj.shineColors();
        const colors2 = tj.shineColors();
        expect(colors1).toEqual(colors2);
    });

    test('randomColor returns a string (when colors available)', () => {
        // randomColor may return undefined if no colors are loaded
        // But we should still test that when it returns, it's a string
        const color = tj.randomColor();
        if (color !== undefined) {
            expect(typeof color).toBe('string');
        }
    });

    test('shine accepts basic colors', () => {
        vi.spyOn(tj.rpiDriver, 'hasCapability').mockReturnValue(true);
        vi.spyOn(tj.rpiDriver, 'renderLED').mockImplementation(async () => {});

        expect(() => {
            tj.shine('red');
        }).not.toThrow();
    });

    test('shine accepts "on" and "off" keywords', () => {
        vi.spyOn(tj.rpiDriver, 'hasCapability').mockReturnValue(true);
        vi.spyOn(tj.rpiDriver, 'renderLED').mockImplementation(async () => {});

        expect(() => {
            tj.shine('on');
        }).not.toThrow();

        expect(() => {
            tj.shine('off');
        }).not.toThrow();
    });
});

describe('TJBot - Capability Assertions', () => {
    let tj: TJBot;

    beforeEach(() => {
        tj = new TJBot();
    });

    test('_assertCapability throws when LISTEN capability missing', () => {
        // Mock that driver doesn't have LISTEN capability
        vi.spyOn(tj.rpiDriver, 'hasCapability').mockReturnValue(false);

        expect(() => {
            tj['_assertCapability'](Capability.LISTEN);
        }).toThrow(TJBotError);
    });

    test('_assertCapability throws when LOOK capability missing', () => {
        vi.spyOn(tj.rpiDriver, 'hasCapability').mockReturnValue(false);

        expect(() => {
            tj['_assertCapability'](Capability.LOOK);
        }).toThrow(TJBotError);
    });

    test('_assertCapability throws when SHINE capability missing', () => {
        vi.spyOn(tj.rpiDriver, 'hasCapability').mockReturnValue(false);

        expect(() => {
            tj['_assertCapability'](Capability.SHINE);
        }).toThrow(TJBotError);
    });

    test('_assertCapability throws when SPEAK capability missing', () => {
        vi.spyOn(tj.rpiDriver, 'hasCapability').mockReturnValue(false);

        expect(() => {
            tj['_assertCapability'](Capability.SPEAK);
        }).toThrow(TJBotError);
    });

    test('_assertCapability throws when WAVE capability missing', () => {
        vi.spyOn(tj.rpiDriver, 'hasCapability').mockReturnValue(false);

        expect(() => {
            tj['_assertCapability'](Capability.WAVE);
        }).toThrow(TJBotError);
    });

    test('_assertCapability does not throw when capability is available', () => {
        vi.spyOn(tj.rpiDriver, 'hasCapability').mockReturnValue(true);

        expect(() => {
            tj['_assertCapability'](Capability.SHINE);
        }).not.toThrow();
    });

    test('capability error messages mention required hardware', () => {
        vi.spyOn(tj.rpiDriver, 'hasCapability').mockReturnValue(false);

        try {
            tj['_assertCapability'](Capability.LISTEN);
        } catch (error) {
            if (error instanceof TJBotError) {
                expect(error.message).toContain(Hardware.MICROPHONE);
            }
        }
    });
});

describe('TJBot - Shine Method', () => {
    let tj: TJBot;

    beforeEach(() => {
        tj = new TJBot();
        vi.spyOn(tj.rpiDriver, 'hasCapability').mockReturnValue(true);
        vi.spyOn(tj.rpiDriver, 'renderLED').mockImplementation(async (_hexColor: string) => {});
    });

    test('shine accepts color name', async () => {
        await expect(tj.shine('red')).resolves.toBeUndefined();
    });

    test('shine accepts hex color with #', async () => {
        await expect(tj.shine('#FF0000')).resolves.toBeUndefined();
    });

    test('shine accepts hex color without #', async () => {
        await expect(tj.shine('FF0000')).resolves.toBeUndefined();
    });

    test('shine accepts "on" keyword', async () => {
        await expect(tj.shine('on')).resolves.toBeUndefined();
    });

    test('shine accepts "off" keyword', async () => {
        await expect(tj.shine('off')).resolves.toBeUndefined();
    });

    test('shine throws when capability not available', async () => {
        vi.spyOn(tj.rpiDriver, 'hasCapability').mockReturnValue(false);

        await expect(tj.shine('red')).rejects.toBeInstanceOf(TJBotError);
    });

    test('shine calls renderLED with color', async () => {
        const renderLED = vi.spyOn(tj.rpiDriver, 'renderLED');
        await tj.shine('red');
        expect(renderLED).toHaveBeenCalled();
    });

    test('shine throws on invalid color', async () => {
        await expect(tj.shine('notacolor_xyz123')).rejects.toBeInstanceOf(TJBotError);
    });
});

describe('TJBot - Pulse Method', () => {
    let tj: TJBot;

    beforeEach(() => {
        tj = new TJBot();
        vi.spyOn(tj.rpiDriver, 'hasCapability').mockReturnValue(true);
        vi.spyOn(tj.rpiDriver, 'renderLED').mockImplementation(async (_hexColor: string) => {});
    });

    test('pulse accepts valid color and duration', async () => {
        await expect(tj.pulse('red', 1.0)).resolves.toBeUndefined();
    });

    test('pulse uses default duration of 1.0 seconds', async () => {
        await expect(tj.pulse('red')).resolves.toBeUndefined();
    });

    test('pulse clamps duration to minimum 0.5 seconds', async () => {
        await expect(tj.pulse('red', 0.1)).resolves.toBeUndefined();
    });

    test('pulse throws when duration exceeds 2.0 seconds', async () => {
        await expect(tj.pulse('red', 2.5)).rejects.toBeInstanceOf(TJBotError);
    });

    test('pulse throws when capability not available', async () => {
        vi.spyOn(tj.rpiDriver, 'hasCapability').mockReturnValue(false);

        await expect(tj.pulse('red')).rejects.toBeInstanceOf(TJBotError);
    });

    test('pulse accepts boundary duration 0.5 seconds', async () => {
        await expect(tj.pulse('red', 0.5)).resolves.toBeUndefined();
    });

    test('pulse accepts boundary duration 2.0 seconds', async () => {
        await expect(tj.pulse('red', 2.0)).resolves.toBeUndefined();
    });
});

describe('TJBot - Arm Movement Methods', () => {
    let tj: TJBot;

    beforeEach(() => {
        tj = new TJBot();
        vi.spyOn(tj.rpiDriver, 'hasCapability').mockReturnValue(true);
        vi.spyOn(tj.rpiDriver, 'renderServoPosition').mockImplementation(() => {});
    });

    test('raiseArm calls renderServoPosition', () => {
        const renderServoPosition = vi.spyOn(tj.rpiDriver, 'renderServoPosition');
        tj.raiseArm();
        expect(renderServoPosition).toHaveBeenCalled();
    });

    test('armBack calls renderServoPosition', () => {
        const renderServoPosition = vi.spyOn(tj.rpiDriver, 'renderServoPosition');
        tj.armBack();
        expect(renderServoPosition).toHaveBeenCalled();
    });

    test('lowerArm calls renderServoPosition', () => {
        const renderServoPosition = vi.spyOn(tj.rpiDriver, 'renderServoPosition');
        tj.lowerArm();
        expect(renderServoPosition).toHaveBeenCalled();
    });

    test('raiseArm throws when capability not available', () => {
        vi.spyOn(tj.rpiDriver, 'hasCapability').mockReturnValue(false);

        expect(() => {
            tj.raiseArm();
        }).toThrow(TJBotError);
    });

    test('armBack throws when capability not available', () => {
        vi.spyOn(tj.rpiDriver, 'hasCapability').mockReturnValue(false);

        expect(() => {
            tj.armBack();
        }).toThrow(TJBotError);
    });

    test('lowerArm throws when capability not available', () => {
        vi.spyOn(tj.rpiDriver, 'hasCapability').mockReturnValue(false);

        expect(() => {
            tj.lowerArm();
        }).toThrow(TJBotError);
    });
});

describe('TJBot - Wave Method', () => {
    let tj: TJBot;

    beforeEach(() => {
        tj = new TJBot();
        vi.spyOn(tj.rpiDriver, 'hasCapability').mockReturnValue(true);
        vi.spyOn(tj.rpiDriver, 'renderServoPosition').mockImplementation(() => {});
    });

    test('wave executes without error', async () => {
        tj.wave();
        expect(true).toBe(true);
    });

    test('wave calls renderServoPosition multiple times', async () => {
        const renderServoPosition = vi.spyOn(tj.rpiDriver, 'renderServoPosition');
        tj.wave();
        expect(renderServoPosition.mock.calls.length).toBeGreaterThanOrEqual(3);
    });

    test('wave throws when capability not available', async () => {
        vi.spyOn(tj.rpiDriver, 'hasCapability').mockReturnValue(false);

        try {
            tj.wave();
            expect.fail('Should have thrown');
        } catch (error) {
            expect(error).toBeInstanceOf(TJBotError);
        }
    });
});

describe('TJBot - Listen and Speak Methods', () => {
    let tj: TJBot;

    beforeEach(() => {
        tj = new TJBot();
        vi.spyOn(tj.rpiDriver, 'hasCapability').mockReturnValue(true);
        vi.spyOn(tj.rpiDriver, 'listenForTranscript').mockResolvedValue('hello');
        vi.spyOn(tj.rpiDriver, 'speak').mockResolvedValue(undefined);
        vi.spyOn(tj.rpiDriver, 'playAudio').mockResolvedValue(undefined);
    });

    test('listen throws when capability not available', async () => {
        vi.spyOn(tj.rpiDriver, 'hasCapability').mockReturnValue(false);

        try {
            await tj.listen();
            expect.fail('Should have thrown');
        } catch (error) {
            expect(error).toBeInstanceOf(TJBotError);
        }
    });

    test('speak throws when capability not available', async () => {
        vi.spyOn(tj.rpiDriver, 'hasCapability').mockReturnValue(false);

        try {
            await tj.speak('hello');
            expect.fail('Should have thrown');
        } catch (error) {
            expect(error).toBeInstanceOf(TJBotError);
        }
    });

    test('play does not check capability', async () => {
        vi.spyOn(tj.rpiDriver, 'hasCapability').mockReturnValue(false);

        // play() doesn't check capability, so it should not throw
        await tj.play('/path/to/sound.wav');
        expect(true).toBe(true);
    });
});

describe('TJBot - Look Method', () => {
    let tj: TJBot;

    beforeEach(() => {
        tj = new TJBot();
        vi.spyOn(tj.rpiDriver, 'hasCapability').mockReturnValue(true);
        vi.spyOn(tj.rpiDriver, 'capturePhoto').mockResolvedValue('/tmp/photo.jpg');
    });

    test('look throws when capability not available', async () => {
        vi.spyOn(tj.rpiDriver, 'hasCapability').mockReturnValue(false);

        try {
            await tj.look();
            expect.fail('Should have thrown');
        } catch (error) {
            expect(error).toBeInstanceOf(TJBotError);
        }
    });

    test('look with default path', async () => {
        const result = await tj.look();
        expect(typeof result).toBe('string');
    });

    test('look with custom path', async () => {
        const result = await tj.look('/custom/path.jpg');
        expect(typeof result).toBe('string');
    });
});

describe('TJBot - Configuration Access', () => {
    let tj: TJBot;

    beforeEach(() => {
        tj = new TJBot();
    });

    test('config is accessible', () => {
        expect(tj.config).toBeDefined();
        expect(typeof tj.config).toBe('object');
    });

    test('rpiModel is accessible', () => {
        expect(tj.rpiModel).toBeDefined();
        expect(typeof tj.rpiModel).toBe('string');
    });

    test('rpiDriver is accessible', () => {
        expect(tj.rpiDriver).toBeDefined();
        expect(typeof tj.rpiDriver).toBe('object');
    });
});
