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

import { describe, expect, test } from 'vitest';
import {
    convertHexToRgbColor,
    getShineColors,
    isCommandAvailable,
    normalizeColor,
    sleep,
    sleepSync,
    TJBotError,
} from '../../src/utils/index.js';

describe('Utils - normalizeColor', () => {
    test('[test_normalizes_on_to_white_ffffff] normalizes "on" to white (FFFFFF)', () => {
        const result = normalizeColor('on');
        expect(result).toBe('#FFFFFF');
    });

    test('[test_normalizes_off_to_black_000000] normalizes "off" to black (000000)', () => {
        const result = normalizeColor('off');
        expect(result).toBe('#000000');
    });

    test('[test_normalizes_undefined_to_black_off] normalizes undefined to black (off)', () => {
        const result = normalizeColor(undefined as unknown as string);
        expect(result).toBe('#000000');
    });

    test('[test_normalizes_6_digit_hex_without_prefix] normalizes 6-digit hex without prefix', () => {
        const result = normalizeColor('FF0000');
        expect(result).toBe('#FF0000');
    });

    test('[test_normalizes_6_digit_hex_with_prefix] normalizes 6-digit hex with # prefix', () => {
        const result = normalizeColor('#FF0000');
        expect(result).toBe('#FF0000');
    });

    test('[test_normalizes_6_digit_hex_with_0x_prefix] normalizes 6-digit hex with 0x prefix', () => {
        const result = normalizeColor('0xFF0000');
        expect(result).toBe('#FF0000');
    });

    test('[test_expands_3_digit_hex_to_6_digit_abc_aabbcc] expands 3-digit hex to 6-digit (#abc → #aabbcc)', () => {
        expect(normalizeColor('F00')).toBe('#FF0000');
    });

    test('[test_expands_3_digit_hex_with_prefix_abc_aabbcc] expands 3-digit hex with # prefix (#ABC → #AABBCC)', () => {
        expect(normalizeColor('#ABC')).toBe('#AABBCC');
    });

    test('[test_normalizes_lowercase_hex_without_forcing_uppercase] normalizes lowercase hex without forcing uppercase', () => {
        const result = normalizeColor('ff00ff');
        expect(result).toBe('#ff00ff');
    });

    test('[test_normalizes_named_color_red] normalizes named color (red)', () => {
        const result = normalizeColor('red');
        expect(result).toMatch(/^#[0-9A-F]{6}$/);
    });

    test('[test_normalizes_named_color_blue] normalizes named color (blue)', () => {
        const result = normalizeColor('blue');
        expect(result).toMatch(/^#[0-9A-F]{6}$/);
    });

    test('[test_normalizes_named_color_green] normalizes named color (green)', () => {
        const result = normalizeColor('green');
        expect(result).toMatch(/^#[0-9A-F]{6}$/);
    });

    test('[test_throws_tjboterror_for_invalid_color_name] throws TJBotError for invalid color name', () => {
        expect(() => normalizeColor('notarealcolor123')).toThrow(TJBotError);
        expect(() => normalizeColor('notarealcolor123')).toThrow('TJBot did not understand the specified color');
    });

    test('[test_throws_tjboterror_for_invalid_hex_format] throws TJBotError for invalid hex format', () => {
        expect(() => normalizeColor('GGGGGG')).toThrow(TJBotError);
    });

    test('[test_throws_tjboterror_for_2_digit_hex] throws TJBotError for 2-digit hex', () => {
        expect(() => normalizeColor('FF')).toThrow(TJBotError);
    });

    test('[test_throws_tjboterror_for_5_digit_hex] throws TJBotError for 5-digit hex', () => {
        expect(() => normalizeColor('FF00F')).toThrow(TJBotError);
    });

    test('[test_handles_mixed_case_named_colors] handles mixed case named colors', () => {
        const result = normalizeColor('Red');
        expect(result).toMatch(/^#[0-9A-F]{6}$/);
    });

    test('[test_normalizes_color_with_leading_trailing_case_variations] normalizes color with leading/trailing case variations', () => {
        const red = normalizeColor('red');
        const blue = normalizeColor('blue');

        expect(red).not.toBe(blue);
        expect(red).toMatch(/^#[0-9A-F]{6}$/);
        expect(blue).toMatch(/^#[0-9A-F]{6}$/);
    });
});

describe('Utils - convertHexToRgbColor', () => {
    test('[test_converts_hex_with_prefix_correctly] converts hex with # prefix correctly', () => {
        const result = convertHexToRgbColor('#FF0000');
        expect(result).toEqual([255, 0, 0]);
    });

    test('[test_converts_other_colors_with_prefix] converts other colors with # prefix', () => {
        const result = convertHexToRgbColor('#00FF00');
        expect(result).toEqual([0, 255, 0]);
    });

    test('[test_returns_array_with_three_elements] returns array with three elements', () => {
        const result = convertHexToRgbColor('#123ABC');
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBe(3);
    });

    test('[test_handles_3_digit_hex_by_expanding_it] handles 3-digit hex by expanding it', () => {
        const result = convertHexToRgbColor('F00');
        expect(result).toEqual([255, 0, 0]);
    });

    test('[test_returns_array_with_three_elements_for_invalid_hex_values_may_be_nan] returns array with three elements for invalid hex (values may be NaN)', () => {
        const result = convertHexToRgbColor('GGGGGG');
        // Function returns array with NaN values for invalid input
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBe(3);
    });
});

describe('Utils - isCommandAvailable', () => {
    test('[test_returns_true_for_available_command_ls] returns true for available command (ls)', () => {
        const result = isCommandAvailable('ls');
        expect(result).toBe(true);
    });

    test('[test_returns_true_for_available_command_cat] returns true for available command (cat)', () => {
        const result = isCommandAvailable('cat');
        expect(result).toBe(true);
    });

    test('[test_returns_true_for_available_command_echo] returns true for available command (echo)', () => {
        const result = isCommandAvailable('echo');
        expect(result).toBe(true);
    });

    test('[test_returns_false_for_unavailable_command] returns false for unavailable command', () => {
        const result = isCommandAvailable('notarealcommand12345xyz');
        expect(result).toBe(false);
    });

    test('[test_returns_true_for_node] returns true for node', () => {
        const result = isCommandAvailable('node');
        expect(result).toBe(true);
    });

    test('[test_returns_true_for_npm] returns true for npm', () => {
        const result = isCommandAvailable('npm');
        expect(result).toBe(true);
    });

    test('[test_handles_commands_with_special_characters_safely] handles commands with special characters safely', () => {
        // These should return false safely without throwing
        const result1 = isCommandAvailable('command-does-not-exist');
        const result2 = isCommandAvailable('another_fake_cmd');

        expect(typeof result1).toBe('boolean');
        expect(typeof result2).toBe('boolean');
    });
});

describe('Utils - sleep', () => {
    test('[test_sleep] sleep', async () => {
        await expect(sleep(0.001)).resolves.toBeUndefined();
    });

    test('[test_sleep_completes_without_error] sleep completes without error', async () => {
        await expect(sleep(0.001)).resolves.toBeUndefined();
    });

    test('[test_sleep_with_0_seconds_completes] sleep with 0 seconds completes', async () => {
        await expect(sleep(0)).resolves.toBeUndefined();
    });

    test('[test_sleep_is_a_function] sleep is a function', () => {
        expect(typeof sleep).toBe('function');
    });

    test('[test_sleep_accepts_numeric_argument] sleep accepts numeric argument', async () => {
        await expect(sleep(0.001)).resolves.toBeUndefined();
    });
});

describe('Utils - sleepSync', () => {
    test('[test_sleepsync] sleepSync', () => {
        expect(() => sleepSync(0.001)).not.toThrow();
    });

    test('[test_sleepsync_with_0_seconds_completes] sleepSync with 0 seconds completes', () => {
        expect(() => sleepSync(0)).not.toThrow();
    });
});

describe('Utils - getShineColors (curated LED colors)', () => {
    test('[test_returns_an_array_of_color_names] returns an array of color names', () => {
        const colors = getShineColors();
        expect(Array.isArray(colors)).toBe(true);
        expect(colors.length).toBeGreaterThan(0);
    });

    test('[test_returns_curated_colors_list] returns curated colors list', () => {
        const colors = getShineColors();
        expect(colors.length).toBeGreaterThan(0);
    });

    test('[test_includes_basic_colors_red_green_blue] includes basic colors (red, green, blue)', () => {
        const colors = getShineColors();
        expect(colors).toContain('red');
        expect(colors).toContain('green');
        expect(colors).toContain('blue');
    });

    test('[test_includes_special_colors_on_off] includes special colors (on, off)', () => {
        const colors = getShineColors();
        expect(colors).toContain('on');
        expect(colors).toContain('off');
    });

    test('[test_includes_multi_word_colors_lightpink_darkblue_etc] includes multi-word colors (lightpink, darkblue, etc)', () => {
        const colors = getShineColors();
        expect(colors).toContain('lightpink');
        expect(colors).toContain('darkblue');
        expect(colors).toContain('skyblue');
    });
});

describe('Utility aliases for Python parity naming', () => {
    test('[test_convert_hex_to_rgb] convert hex to rgb', () => {
        expect(convertHexToRgbColor('#ffffff')).toEqual([255, 255, 255]);
    });

    test('[test_normalize_color] normalize color', () => {
        expect(normalizeColor('red')).toBe('#FF0000');
    });

    test('[test_is_command_available] is command available', () => {
        expect(isCommandAvailable('ls')).toBe(true);
        expect(isCommandAvailable('nonexistentcommand12345')).toBe(false);
    });
});

describe('Utils - normalizeColor with curated colors', () => {
    test('[test_normalizes_curated_color_red] normalizes curated color: red', () => {
        const result = normalizeColor('red');
        expect(result).toBe('#FF0000');
    });

    test('[test_normalizes_curated_color_blue] normalizes curated color: blue', () => {
        const result = normalizeColor('blue');
        expect(result).toBe('#0000FF');
    });

    test('[test_normalizes_curated_color_green] normalizes curated color: green', () => {
        const result = normalizeColor('green');
        expect(result).toBe('#008000');
    });

    test('[test_normalizes_curated_color_purple] normalizes curated color: purple', () => {
        const result = normalizeColor('purple');
        expect(result).toBe('#800080');
    });

    test('[test_normalizes_multi_word_color_without_spaces_lightpink] normalizes multi-word color without spaces: lightpink', () => {
        const result = normalizeColor('lightpink');
        expect(result).toBe('#FFB6C1');
    });

    test('[test_normalizes_multi_word_color_with_spaces_light_pink] normalizes multi-word color WITH spaces: light pink', () => {
        const result = normalizeColor('light pink');
        expect(result).toBe('#FFB6C1');
    });

    test('[test_normalizes_multi_word_color_with_mixed_case_light_pink] normalizes multi-word color with mixed case: Light Pink', () => {
        const result = normalizeColor('Light Pink');
        expect(result).toBe('#FFB6C1');
    });

    test('[test_normalizes_multi_word_color_all_caps_with_spaces_light_pink] normalizes multi-word color all caps with spaces: LIGHT PINK', () => {
        const result = normalizeColor('LIGHT PINK');
        expect(result).toBe('#FFB6C1');
    });

    test('[test_normalizes_multi_word_color_darkblue_vs_dark_blue] normalizes multi-word color: darkblue vs dark blue', () => {
        const result1 = normalizeColor('darkblue');
        const result2 = normalizeColor('dark blue');
        expect(result1).toBe('#00008B');
        expect(result2).toBe('#00008B');
        expect(result1).toBe(result2);
    });

    test('[test_normalizes_multi_word_color_skyblue_vs_sky_blue] normalizes multi-word color: skyblue vs sky blue', () => {
        const result1 = normalizeColor('skyblue');
        const result2 = normalizeColor('sky blue');
        expect(result1).toBe('#87CEEB');
        expect(result2).toBe('#87CEEB');
        expect(result1).toBe(result2);
    });

    test('[test_normalizes_multi_word_color_hotpink_vs_hot_pink] normalizes multi-word color: hotpink vs hot pink', () => {
        const result1 = normalizeColor('hotpink');
        const result2 = normalizeColor('hot pink');
        expect(result1).toBe('#FF69B4');
        expect(result2).toBe('#FF69B4');
        expect(result1).toBe(result2);
    });

    test('[test_throws_error_for_color_not_in_curated_list] throws error for color not in curated list', () => {
        expect(() => normalizeColor('chartreuse')).toThrow(TJBotError);
        expect(() => normalizeColor('lavender')).toThrow(TJBotError);
    });
});
