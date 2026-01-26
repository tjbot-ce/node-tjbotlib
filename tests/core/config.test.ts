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

import { describe, test, expect } from 'vitest';
import { TJBotConfig } from '../../dist/config/tjbot-config.js';
import { tjbotConfigSchema, sttBackendTypeSchema, ttsBackendTypeSchema } from '../../dist/config/config-types.js';

// ============================================================================
// Zod Schema Tests (only those exported from config-types)
// ============================================================================

describe('Zod Schema Validation - Backend Types', () => {
    test('sttBackendTypeSchema accepts local', () => {
        const result = sttBackendTypeSchema.safeParse('local');
        expect(result.success).toBe(true);
    });

    test('sttBackendTypeSchema accepts ibm-watson-stt', () => {
        const result = sttBackendTypeSchema.safeParse('ibm-watson-stt');
        expect(result.success).toBe(true);
    });

    test('sttBackendTypeSchema rejects invalid type', () => {
        const result = sttBackendTypeSchema.safeParse('invalid-type');
        expect(result.success).toBe(false);
    });

    test('ttsBackendTypeSchema accepts local', () => {
        const result = ttsBackendTypeSchema.safeParse('local');
        expect(result.success).toBe(true);
    });

    test('ttsBackendTypeSchema accepts ibm-watson-tts', () => {
        const result = ttsBackendTypeSchema.safeParse('ibm-watson-tts');
        expect(result.success).toBe(true);
    });

    test('ttsBackendTypeSchema rejects invalid type', () => {
        const result = ttsBackendTypeSchema.safeParse('invalid-type');
        expect(result.success).toBe(false);
    });
});

describe('Zod Schema Validation - Complete TJBot Config', () => {
    test('accepts minimal config', () => {
        const result = tjbotConfigSchema.safeParse({});
        expect(result.success).toBe(true);
    });

    test('accepts config with log section', () => {
        const result = tjbotConfigSchema.safeParse({
            log: { level: 'debug' },
        });
        expect(result.success).toBe(true);
    });

    test('accepts config with listen section', () => {
        const result = tjbotConfigSchema.safeParse({
            listen: {
                device: 'default',
                microphoneRate: 44100,
                microphoneChannels: 2,
            },
        });
        expect(result.success).toBe(true);
    });

    test('accepts config with see section', () => {
        const result = tjbotConfigSchema.safeParse({
            see: {
                cameraResolution: [1920, 1080],
                verticalFlip: false,
                horizontalFlip: true,
            },
        });
        expect(result.success).toBe(true);
    });

    test('accepts config with shine section', () => {
        const result = tjbotConfigSchema.safeParse({
            shine: {
                neopixel: { gpioPin: 18 },
                commonanode: { redPin: 19, greenPin: 13, bluePin: 12 },
            },
        });
        expect(result.success).toBe(true);
    });

    test('accepts config with speak section', () => {
        const result = tjbotConfigSchema.safeParse({
            speak: {
                backend: { type: 'local' },
            },
        });
        expect(result.success).toBe(true);
    });

    test('accepts config with wave section', () => {
        const result = tjbotConfigSchema.safeParse({
            wave: { gpioChip: 0, servoPin: 7 },
        });
        expect(result.success).toBe(true);
    });

    test('accepts complete config with all sections', () => {
        const result = tjbotConfigSchema.safeParse({
            log: { level: 'debug' },
            listen: { microphoneRate: 44100 },
            see: { cameraResolution: [1920, 1080] },
            shine: { neopixel: { gpioPin: 18 } },
            speak: { backend: { type: 'local' } },
            wave: { gpioChip: 0 },
            recipe: { recipeKey: 'recipeValue' },
        });
        expect(result.success).toBe(true);
    });

    test('accepts config with extra properties (loose)', () => {
        const result = tjbotConfigSchema.safeParse({
            log: { level: 'info' },
            customField: 'customValue',
        });
        expect(result.success).toBe(true);
    });

    test('recipe field accepts any object', () => {
        const result = tjbotConfigSchema.safeParse({
            recipe: {
                key1: 'value1',
                key2: { nested: 'value' },
                key3: [1, 2, 3],
            },
        });
        expect(result.success).toBe(true);
    });

    test('rejects invalid cameraResolution (string)', () => {
        const result = tjbotConfigSchema.safeParse({
            see: { cameraResolution: '1920x1080' },
        });
        expect(result.success).toBe(false);
    });
});

// ============================================================================
// TJBotConfig Class Tests
// ============================================================================

describe('TJBotConfig - Instantiation', () => {
    test('creates config instance without user config', () => {
        const config = new TJBotConfig();
        expect(config).toBeDefined();
        expect(config.config).toBeDefined();
    });

    test('has all expected properties', () => {
        const config = new TJBotConfig();
        expect(config.log).toBeDefined();
        expect(config.listen).toBeDefined();
        expect(config.see).toBeDefined();
        expect(config.shine).toBeDefined();
        expect(config.speak).toBeDefined();
        expect(config.wave).toBeDefined();
        expect(config.recipe).toBeDefined();
    });

    test('initializes empty objects for missing sections', () => {
        const config = new TJBotConfig();
        // Log should at least exist as an object
        expect(typeof config.log).toBe('object');
        expect(typeof config.recipe).toBe('object');
    });
});

describe('TJBotConfig - User Config Loading', () => {
    test('loads and merges user config', () => {
        const customConfig = {
            log: {
                level: 'debug',
            },
            listen: {
                microphoneRate: 48000,
            },
            wave: {
                gpioChip: 1,
                servoPin: 17,
            },
        };

        const config = new TJBotConfig(customConfig);

        expect(config.log.level).toBe('debug');
        expect(config.listen.microphoneRate).toBe(48000);
        expect(config.wave.gpioChip).toBe(1);
        expect(config.wave.servoPin).toBe(17);
    });

    test('merges user config with defaults', () => {
        const customConfig = {
            log: {
                level: 'debug',
            },
        };

        const config = new TJBotConfig(customConfig);

        // User override
        expect(config.log.level).toBe('debug');
        // Default values should still exist
        expect(config.listen).toBeDefined();
        expect(config.see).toBeDefined();
    });

    test('handles non-existent user config file', () => {
        const config = new TJBotConfig();
        // Should not throw, just use defaults
        expect(config).toBeDefined();
    });
});

describe('TJBotConfig - Invalid Config', () => {
    test('throws error for invalid config values', () => {
        const invalidConfig: Record<string, unknown> = {
            see: {
                cameraResolution: 'not a tuple',
            },
        };

        expect(() => {
            new TJBotConfig(invalidConfig);
        }).toThrow();
    });
});

describe('TJBotConfig - Config Access', () => {
    test('get() method returns config values', () => {
        const config = new TJBotConfig();
        const logValue = config.get('log');
        expect(logValue).toBeDefined();
        expect(typeof logValue).toBe('object');
    });

    test('get() returns undefined for missing keys', () => {
        const config = new TJBotConfig();
        const value = config.get('nonExistentKey');
        expect(value).toBeUndefined();
    });

    test('direct property access works', () => {
        const customConfig = {
            listen: {
                device: 'hw:1,0',
                microphoneRate: 48000,
            },
        };

        const config = new TJBotConfig(customConfig);

        expect(config.listen.device).toBe('hw:1,0');
        expect(config.listen.microphoneRate).toBe(48000);
    });
});

describe('TJBotConfig - Complex Configurations', () => {
    test('handles nested backend configuration', () => {
        const complexConfig: Record<string, unknown> = {
            listen: {
                backend: {
                    type: 'ibm-watson-stt' as const,
                    'ibm-watson-stt': {
                        model: 'en-US_Multimedia',
                        inactivityTimeout: 30,
                        backgroundAudioSuppression: 0.4,
                    },
                },
            },
            speak: {
                backend: {
                    type: 'ibm-watson-tts' as const,
                    'ibm-watson-tts': {
                        voice: 'en-US_MichaelV3Voice',
                    },
                },
            },
        };

        const config = new TJBotConfig(complexConfig);

        expect(config.listen.backend?.type).toBe('ibm-watson-stt');
        expect(config.listen.backend?.['ibm-watson-stt']?.model).toBe('en-US_Multimedia');
        expect(config.speak.backend?.type).toBe('ibm-watson-tts');
        expect(config.speak.backend?.['ibm-watson-tts']?.voice).toBe('en-US_MichaelV3Voice');
    });

    test('handles both LED types in config', () => {
        const ledConfig = {
            shine: {
                neopixel: {
                    gpioPin: 18,
                    spiInterface: '/dev/spidev0.0',
                },
                commonanode: {
                    redPin: 19,
                    greenPin: 13,
                    bluePin: 12,
                },
            },
        };

        const config = new TJBotConfig(ledConfig);

        expect(config.shine.neopixel?.gpioPin).toBe(18);
        expect(config.shine.commonanode?.redPin).toBe(19);
        expect(config.shine.commonanode?.greenPin).toBe(13);
        expect(config.shine.commonanode?.bluePin).toBe(12);
    });

    test('handles recipe configuration', () => {
        const recipeConfig = {
            recipe: {
                enabled: true,
                timeout: 5000,
                custom_setting: 'value',
            },
        };

        const config = new TJBotConfig(recipeConfig);

        expect(config.recipe.enabled).toBe(true);
        expect(config.recipe.timeout).toBe(5000);
        expect(config.recipe.custom_setting).toBe('value');
    });
});
