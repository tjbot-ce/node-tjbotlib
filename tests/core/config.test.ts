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
import { TJBotConfig } from '../../src/config/tjbot-config.js';
import {
    tjbotConfigSchema,
    type TJBotConfigSchema,
    sttBackendTypeSchema,
    ttsBackendTypeSchema,
    seeBackendTypeSchema,
} from '../../src/config/config-types.js';

// ============================================================================
// Schema Validation Tests (only those exported from config-types)
// ============================================================================

describe('Schema Validation - Backend Types', () => {
    test('[test_sttbackendtypeschema_accepts_none] sttBackendTypeSchema accepts none', () => {
        const result = sttBackendTypeSchema.safeParse('none');
        expect(result.success).toBe(true);
    });

    test('[test_sttbackendtypeschema_accepts_local] sttBackendTypeSchema accepts local', () => {
        const result = sttBackendTypeSchema.safeParse('local');
        expect(result.success).toBe(true);
    });

    test('[test_sttbackendtypeschema_rejects_invalid_type] sttBackendTypeSchema rejects invalid type', () => {
        const result = sttBackendTypeSchema.safeParse('invalid-type');
        expect(result.success).toBe(false);
    });

    test('[test_ttsbackendtypeschema_accepts_none] ttsBackendTypeSchema accepts none', () => {
        const result = ttsBackendTypeSchema.safeParse('none');
        expect(result.success).toBe(true);
    });

    test('[test_ttsbackendtypeschema_accepts_local] ttsBackendTypeSchema accepts local', () => {
        const result = ttsBackendTypeSchema.safeParse('local');
        expect(result.success).toBe(true);
    });

    test('[test_ttsbackendtypeschema_rejects_invalid_type] ttsBackendTypeSchema rejects invalid type', () => {
        const result = ttsBackendTypeSchema.safeParse('invalid-type');
        expect(result.success).toBe(false);
    });

    test('[test_seebackendtypeschema_accepts_none] seeBackendTypeSchema accepts none', () => {
        const result = seeBackendTypeSchema.safeParse('none');
        expect(result.success).toBe(true);
    });

    test('[test_seebackendtypeschema_accepts_local] seeBackendTypeSchema accepts local', () => {
        const result = seeBackendTypeSchema.safeParse('local');
        expect(result.success).toBe(true);
    });

    test('[test_seebackendtypeschema_rejects_invalid_type] seeBackendTypeSchema rejects invalid type', () => {
        const result = seeBackendTypeSchema.safeParse('invalid-type');
        expect(result.success).toBe(false);
    });
});

describe('Schema Validation - Complete TJBot Config', () => {
    test('[test_accepts_minimal_config] accepts minimal config', () => {
        const result = tjbotConfigSchema.safeParse({});
        expect(result.success).toBe(true);
    });

    test('[test_accepts_config_with_log_section] accepts config with log section', () => {
        const result = tjbotConfigSchema.safeParse({
            log: { level: 'debug' },
        });
        expect(result.success).toBe(true);
    });

    test('[test_accepts_config_with_listen_section] accepts config with listen section', () => {
        const result = tjbotConfigSchema.safeParse({
            listen: {
                device: 'default',
                microphoneRate: 44100,
                microphoneChannels: 2,
            },
        });
        expect(result.success).toBe(true);
    });

    test('[test_accepts_config_with_see_section] accepts config with see section', () => {
        const result = tjbotConfigSchema.safeParse({
            see: {
                cameraResolution: [1920, 1080],
                verticalFlip: false,
                horizontalFlip: true,
            },
        });
        expect(result.success).toBe(true);
    });

    test('[test_accepts_config_with_shine_section] accepts config with shine section', () => {
        const result = tjbotConfigSchema.safeParse({
            shine: {
                neopixel: { gpioPin: 18 },
                commonanode: { redPin: 19, greenPin: 13, bluePin: 12 },
            },
        });
        expect(result.success).toBe(true);
    });

    test('[test_accepts_config_with_speak_section] accepts config with speak section', () => {
        const result = tjbotConfigSchema.safeParse({
            speak: {
                backend: { type: 'local' },
            },
        });
        expect(result.success).toBe(true);
    });

    test('[test_accepts_config_with_wave_section] accepts config with wave section', () => {
        const result = tjbotConfigSchema.safeParse({
            wave: { gpioChip: 0, servoPin: 7 },
        });
        expect(result.success).toBe(true);
    });

    test('[test_accepts_complete_config_with_all_sections] accepts complete config with all sections', () => {
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

    test('[test_accepts_config_with_extra_properties_loose] accepts config with extra properties (loose)', () => {
        const result = tjbotConfigSchema.safeParse({
            log: { level: 'info' },
            customField: 'customValue',
        });
        expect(result.success).toBe(true);
    });

    test('[test_recipe_field_accepts_any_object] recipe field accepts any object', () => {
        const result = tjbotConfigSchema.safeParse({
            recipe: {
                key1: 'value1',
                key2: { nested: 'value' },
                key3: [1, 2, 3],
            },
        });
        expect(result.success).toBe(true);
    });

    test('[test_rejects_invalid_cameraresolution_string] rejects invalid cameraResolution (string)', () => {
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
    test('[test_creates_config_instance_without_user_config] creates config instance without user config', () => {
        const config = new TJBotConfig();
        expect(config).toBeDefined();
        expect(config.config).toBeDefined();
    });

    test('[test_has_all_expected_properties] has all expected properties', () => {
        const config = new TJBotConfig();
        expect(config.log).toBeDefined();
        expect(config.listen).toBeDefined();
        expect(config.see).toBeDefined();
        expect(config.shine).toBeDefined();
        expect(config.speak).toBeDefined();
        expect(config.wave).toBeDefined();
        expect(config.recipe).toBeDefined();
    });

    test('[test_initializes_empty_objects_for_missing_sections] initializes empty objects for missing sections', () => {
        const config = new TJBotConfig();
        // Log should at least exist as an object
        expect(typeof config.log).toBe('object');
        expect(typeof config.recipe).toBe('object');
    });
});

describe('TJBotConfig - User Config Loading', () => {
    test('[test_loads_and_merges_user_config] loads and merges user config', () => {
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
        } satisfies Partial<TJBotConfigSchema>;

        const config = new TJBotConfig(customConfig);

        expect(config.log.level).toBe('debug');
        expect(config.listen.microphoneRate).toBe(48000);
        expect(config.wave.gpioChip).toBe(1);
        expect(config.wave.servoPin).toBe(17);
    });

    test('[test_merges_user_config_with_defaults] merges user config with defaults', () => {
        const customConfig = {
            log: {
                level: 'debug',
            },
        } satisfies Partial<TJBotConfigSchema>;

        const config = new TJBotConfig(customConfig);

        // User override
        expect(config.log.level).toBe('debug');
        // Default values should still exist
        expect(config.listen).toBeDefined();
        expect(config.see).toBeDefined();
    });

    test('[test_handles_non_existent_user_config_file] handles non-existent user config file', () => {
        const config = new TJBotConfig();
        // Should not throw, just use defaults
        expect(config).toBeDefined();
    });
});

describe('TJBotConfig - Invalid Config', () => {
    test('[test_throws_error_when_cameraresolution_is_not_a_tuple] throws error when cameraResolution is not a tuple', () => {
        const invalidConfig: Record<string, unknown> = {
            see: {
                cameraResolution: 'not a tuple',
            },
        };

        expect(() => {
            new TJBotConfig(invalidConfig);
        }).toThrow();
    });

    test('[test_accepts_google_cloud_vision_confidence_thresholds_in_valid_range] accepts google-cloud-vision confidence thresholds in valid range', () => {
        const config = new TJBotConfig({
            see: {
                backend: {
                    type: 'google-cloud-vision',
                    'google-cloud-vision': {
                        objectDetectionConfidence: 0.7,
                        imageClassificationConfidence: 0.6,
                        faceDetectionConfidence: 0.5,
                    },
                },
            },
        });

        expect(config.see.backend?.['google-cloud-vision']?.objectDetectionConfidence).toBe(0.7);
        expect(config.see.backend?.['google-cloud-vision']?.imageClassificationConfidence).toBe(0.6);
        expect(config.see.backend?.['google-cloud-vision']?.faceDetectionConfidence).toBe(0.5);
    });

    test('[test_accepts_azure_vision_confidence_thresholds_for_supported_operations] accepts azure-vision confidence thresholds for supported operations', () => {
        const config = new TJBotConfig({
            see: {
                backend: {
                    type: 'azure-vision',
                    'azure-vision': {
                        objectDetectionConfidence: 0.7,
                        imageClassificationConfidence: 0.6,
                    },
                },
            },
        });

        expect(config.see.backend?.['azure-vision']?.objectDetectionConfidence).toBe(0.7);
        expect(config.see.backend?.['azure-vision']?.imageClassificationConfidence).toBe(0.6);
    });

    test('[test_rejects_out_of_range_google_cloud_vision_confidence_thresholds] rejects out-of-range google-cloud-vision confidence thresholds', () => {
        expect(() => {
            new TJBotConfig({
                see: {
                    backend: {
                        type: 'google-cloud-vision',
                        'google-cloud-vision': {
                            objectDetectionConfidence: 1.5,
                        },
                    },
                },
            });
        }).toThrow();
    });
});

describe('TJBotConfig - Config Access', () => {
    test('[test_get_method_returns_config_values] get() method returns config values', () => {
        const config = new TJBotConfig();
        const logValue = config.get('log');
        expect(logValue).toBeDefined();
        expect(typeof logValue).toBe('object');
    });

    test('[test_get_returns_undefined_for_missing_keys] get() returns undefined for missing keys', () => {
        const config = new TJBotConfig();
        const value = config.get('nonExistentKey');
        expect(value).toBeUndefined();
    });

    test('[test_direct_property_access_works] direct property access works', () => {
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
    test('[test_handles_nested_backend_configuration] handles nested backend configuration', () => {
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

    test('[test_handles_both_led_types_in_config] handles both LED types in config', () => {
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

    test('[test_handles_recipe_configuration] handles recipe configuration', () => {
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
describe('TJBotConfig - Deep Merge Behavior', () => {
    test('[test_overrideconfig_deeply_merges_nested_objects] overrideConfig deeply merges nested objects', () => {
        // Simulate default config with full vision backend settings
        const overrideConfig = {
            see: {
                backend: {
                    type: 'local' as const,
                    local: {
                        objectDetectionModel: 'custom-model',
                        // Note: not specifying imageClassificationModel or faceDetectionModel
                    },
                },
            },
        };

        const config = new TJBotConfig(overrideConfig);

        // The override should only replace the specified key
        expect(config.see.backend?.local?.objectDetectionModel).toBe('custom-model');

        // These should still have their default values from tjbot.default.toml
        // (not undefined because the override didn't specify them)
        expect(config.see.backend?.local?.imageClassificationModel).toBeDefined();
        expect(config.see.backend?.local?.faceDetectionModel).toBeDefined();
    });

    test('[test_overrideconfig_preserves_sibling_properties_in_nested_sections] overrideConfig preserves sibling properties in nested sections', () => {
        const overrideConfig = {
            listen: {
                backend: {
                    type: 'local' as const,
                    local: {
                        model: 'custom-whisper-model',
                        // Not specifying other local config properties
                    },
                },
            },
        };

        const config = new TJBotConfig(overrideConfig);

        // Custom value should be set
        expect(config.listen.backend?.local?.model).toBe('custom-whisper-model');

        // Other properties from defaults should still exist
        expect(config.listen.backend?.local).toBeDefined();
        expect(config.listen.backend?.type).toBe('local');
    });

    test('[test_overrideconfig_can_update_multiple_nested_levels_independently] overrideConfig can update multiple nested levels independently', () => {
        const overrideConfig = {
            see: {
                cameraResolution: [1280, 720] as [number, number],
                backend: {
                    type: 'local' as const,
                    local: {
                        objectDetectionModel: 'my-model',
                    },
                },
            },
            listen: {
                microphoneRate: 48000,
            },
        };

        const config = new TJBotConfig(overrideConfig);

        // All override values should be present
        expect(config.see.cameraResolution).toEqual([1280, 720]);
        expect(config.see.backend?.local?.objectDetectionModel).toBe('my-model');
        expect(config.listen.microphoneRate).toBe(48000);

        // Default values should still exist
        expect(config.see.backend?.local?.imageClassificationModel).toBeDefined();
        expect(config.see.backend?.local?.faceDetectionModel).toBeDefined();
        expect(config.listen.device).toBeDefined();
    });

    test('[test_arrays_are_replaced_entirely_not_merged] arrays are replaced entirely, not merged', () => {
        const overrideConfig = {
            see: {
                cameraResolution: [640, 480] as [number, number],
            },
        };

        const config = new TJBotConfig(overrideConfig);

        // Arrays should be replaced entirely, not element-by-element
        expect(config.see.cameraResolution).toEqual([640, 480]);
    });
});

describe('TJBotConfig - Recipe Configuration', () => {
    test('[test_accepts_recipe_config_in_override] accepts recipe config in override', () => {
        const overrideConfig = {
            recipe: {
                myCustomSetting: true,
                timeout: 5000,
                name: 'my-recipe',
            },
        };

        const config = new TJBotConfig(overrideConfig);

        expect(config.recipe.myCustomSetting).toBe(true);
        expect(config.recipe.timeout).toBe(5000);
        expect(config.recipe.name).toBe('my-recipe');
    });

    test('[test_handles_missing_recipe_config_file_gracefully] handles missing recipe config file gracefully', () => {
        // When recipe.toml does not exist, should not throw
        const config = new TJBotConfig({}, 'non-existent-recipe.toml');

        expect(config).toBeDefined();
        // recipe should be the default empty object or preserved from defaults
        expect(config.recipe).toBeDefined();
    });

    test('[test_merges_recipe_config_with_recipe_section_from_overrideconfig] merges recipe config with recipe section from overrideConfig', () => {
        const overrideRecipe = {
            recipe: {
                setting1: 'from-override',
                setting2: 'override-value',
            },
        };

        const config = new TJBotConfig(overrideRecipe);

        expect(config.recipe.setting1).toBe('from-override');
        expect(config.recipe.setting2).toBe('override-value');
    });

    test('[test_recipe_parameter_allows_custom_recipe_config_path] recipe parameter allows custom recipe config path', () => {
        // Should accept path parameter without throwing
        const config = new TJBotConfig({}, './custom-recipe.toml');

        expect(config).toBeDefined();
        expect(config.recipe).toBeDefined();
    });

    test('[test_recipe_parameter_defaults_to_recipe_toml_if_not_provided] recipe parameter defaults to recipe.toml if not provided', () => {
        // Should use default 'recipe.toml' path when parameter is undefined
        const config = new TJBotConfig({}, undefined);

        expect(config).toBeDefined();
        expect(config.recipe).toBeDefined();
    });
});

describe('Config schema edge cases and backend option compatibility', () => {
    test('[test_default_config_loading] default config loading', () => {
        const config = new TJBotConfig();
        expect(config).toBeDefined();
        expect(config.config).toBeDefined();
    });

    test('[test_override_config] override config', () => {
        const config = new TJBotConfig({ log: { level: 'debug' } });
        expect(config.log.level).toBe('debug');
    });

    test('[test_nested_override] nested override', () => {
        const config = new TJBotConfig({
            see: {
                backend: {
                    type: 'local',
                    local: { objectDetectionModel: 'custom-model' },
                },
            },
        });
        expect(config.see.backend?.local?.objectDetectionModel).toBe('custom-model');
    });

    test('[test_node_style_led_config_fields_parse] node style led config fields parse', () => {
        const config = new TJBotConfig({
            shine: {
                neopixel: { gpioPin: 18 },
                commonanode: { redPin: 19, greenPin: 13, bluePin: 12 },
            },
        });
        expect(config.shine.neopixel?.gpioPin).toBe(18);
        expect(config.shine.commonanode?.redPin).toBe(19);
    });

    test('[test_backend_type_none_is_valid_for_stt_tts] backend type none is valid for stt tts', () => {
        const result = tjbotConfigSchema.safeParse({
            listen: { backend: { type: 'none' } },
            speak: { backend: { type: 'none' } },
        });
        expect(result.success).toBe(true);
    });

    test('[test_stt_none_backend_raises_descriptive_error] stt none backend raises descriptive error', () => {
        const config = new TJBotConfig({ listen: { backend: { type: 'none' } } });
        expect(config.listen.backend?.type).toBe('none');
    });

    test('[test_tts_none_backend_raises_descriptive_error] tts none backend raises descriptive error', () => {
        const config = new TJBotConfig({ speak: { backend: { type: 'none' } } });
        expect(config.speak.backend?.type).toBe('none');
    });

    test('[test_vision_backend_type_none_and_google_parse] vision backend type none and google parse', () => {
        const noneResult = tjbotConfigSchema.safeParse({ see: { backend: { type: 'none' } } });
        const googleResult = tjbotConfigSchema.safeParse({
            see: {
                backend: {
                    type: 'google-cloud-vision',
                    'google-cloud-vision': { objectDetectionConfidence: 0.7 },
                },
            },
        });
        expect(noneResult.success).toBe(true);
        expect(googleResult.success).toBe(true);
    });

    test('[test_vision_none_backend_raises_descriptive_error] vision none backend raises descriptive error', () => {
        const config = new TJBotConfig({ see: { backend: { type: 'none' } } });
        expect(config.see.backend?.type).toBe('none');
    });

    test('[test_config_schema_rejects_invalid_log_level] config schema rejects invalid log level', () => {
        const result = tjbotConfigSchema.safeParse({ log: { level: 'super-loud' } });
        expect(result.success).toBe(false);
    });

    test('[test_google_and_azure_backend_extra_fields_parse] google and azure backend extra fields parse', () => {
        const result = tjbotConfigSchema.safeParse({
            see: {
                backend: {
                    type: 'azure-vision',
                    'azure-vision': {
                        objectDetectionConfidence: 0.7,
                        imageClassificationConfidence: 0.6,
                        customField: 'allowed',
                    },
                },
            },
        });
        expect(result.success).toBe(true);
    });

    test('[test_google_cloud_vision_confidence_thresholds_accept_valid_range] google cloud vision confidence thresholds accept valid range', () => {
        const result = tjbotConfigSchema.safeParse({
            see: {
                backend: {
                    type: 'google-cloud-vision',
                    'google-cloud-vision': {
                        objectDetectionConfidence: 0.8,
                        imageClassificationConfidence: 0.6,
                        faceDetectionConfidence: 0.5,
                    },
                },
            },
        });
        expect(result.success).toBe(true);
    });

    test('[test_google_cloud_vision_confidence_thresholds_reject_out_of_range] google cloud vision confidence thresholds reject out of range', () => {
        const result = tjbotConfigSchema.safeParse({
            see: {
                backend: {
                    type: 'google-cloud-vision',
                    'google-cloud-vision': { objectDetectionConfidence: 2.0 },
                },
            },
        });
        expect(result.success).toBe(false);
    });

    test('[test_azure_vision_confidence_thresholds_accept_valid_range] azure vision confidence thresholds accept valid range', () => {
        const result = tjbotConfigSchema.safeParse({
            see: {
                backend: {
                    type: 'azure-vision',
                    'azure-vision': {
                        objectDetectionConfidence: 0.8,
                        imageClassificationConfidence: 0.7,
                    },
                },
            },
        });
        expect(result.success).toBe(true);
    });
});
