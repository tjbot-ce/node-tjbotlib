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
    TJBotError,
} from '../../src/utils/index.js';

describe('Utils - normalizeColor', () => {
    test('normalizes "on" to white (FFFFFF)', () => {
        const result = normalizeColor('on');
        expect(result).toBe('#FFFFFF');
    });

    test('normalizes "off" to black (000000)', () => {
        const result = normalizeColor('off');
        expect(result).toBe('#000000');
    });

    test('normalizes undefined to black (off)', () => {
        const result = normalizeColor(undefined as unknown as string);
        expect(result).toBe('#000000');
    });

    test('normalizes 6-digit hex without prefix', () => {
        const result = normalizeColor('FF0000');
        expect(result).toBe('#FF0000');
    });

    test('normalizes 6-digit hex with # prefix', () => {
        const result = normalizeColor('#FF0000');
        expect(result).toBe('#FF0000');
    });

    test('normalizes 6-digit hex with 0x prefix', () => {
        const result = normalizeColor('0xFF0000');
        expect(result).toBe('#FF0000');
    });

    test('throws error for 3-digit hex (expects 6-digit)', () => {
        expect(() => normalizeColor('F00')).toThrow(TJBotError);
    });

    test('throws error for 3-digit hex with # prefix', () => {
        expect(() => normalizeColor('#ABC')).toThrow(TJBotError);
    });

    test('normalizes lowercase hex without forcing uppercase', () => {
        const result = normalizeColor('ff00ff');
        expect(result).toBe('#ff00ff');
    });

    test('normalizes named color (red)', () => {
        const result = normalizeColor('red');
        expect(result).toMatch(/^#[0-9A-F]{6}$/);
    });

    test('normalizes named color (blue)', () => {
        const result = normalizeColor('blue');
        expect(result).toMatch(/^#[0-9A-F]{6}$/);
    });

    test('normalizes named color (green)', () => {
        const result = normalizeColor('green');
        expect(result).toMatch(/^#[0-9A-F]{6}$/);
    });

    test('throws TJBotError for invalid color name', () => {
        expect(() => normalizeColor('notarealcolor123')).toThrow(TJBotError);
        expect(() => normalizeColor('notarealcolor123')).toThrow('TJBot did not understand the specified color');
    });

    test('throws TJBotError for invalid hex format', () => {
        expect(() => normalizeColor('GGGGGG')).toThrow(TJBotError);
    });

    test('throws TJBotError for 2-digit hex', () => {
        expect(() => normalizeColor('FF')).toThrow(TJBotError);
    });

    test('throws TJBotError for 5-digit hex', () => {
        expect(() => normalizeColor('FF00F')).toThrow(TJBotError);
    });

    test('handles mixed case named colors', () => {
        const result = normalizeColor('Red');
        expect(result).toMatch(/^#[0-9A-F]{6}$/);
    });

    test('normalizes color with leading/trailing case variations', () => {
        const red = normalizeColor('red');
        const blue = normalizeColor('blue');

        expect(red).not.toBe(blue);
        expect(red).toMatch(/^#[0-9A-F]{6}$/);
        expect(blue).toMatch(/^#[0-9A-F]{6}$/);
    });
});

describe('Utils - convertHexToRgbColor', () => {
    test('converts hex with # prefix correctly', () => {
        const result = convertHexToRgbColor('#FF0000');
        expect(result).toEqual([255, 0, 0]);
    });

    test('converts other colors with # prefix', () => {
        const result = convertHexToRgbColor('#00FF00');
        expect(result).toEqual([0, 255, 0]);
    });

    test('returns array with three elements', () => {
        const result = convertHexToRgbColor('#123ABC');
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBe(3);
    });

    test('handles 3-digit hex by expanding it', () => {
        const result = convertHexToRgbColor('F00');
        expect(result).toEqual([255, 0, 0]);
    });

    test('returns array with three elements for invalid hex (values may be NaN)', () => {
        const result = convertHexToRgbColor('GGGGGG');
        // Function returns array with NaN values for invalid input
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBe(3);
    });
});

describe('Utils - isCommandAvailable', () => {
    test('returns true for available command (ls)', () => {
        const result = isCommandAvailable('ls');
        expect(result).toBe(true);
    });

    test('returns true for available command (cat)', () => {
        const result = isCommandAvailable('cat');
        expect(result).toBe(true);
    });

    test('returns true for available command (echo)', () => {
        const result = isCommandAvailable('echo');
        expect(result).toBe(true);
    });

    test('returns false for unavailable command', () => {
        const result = isCommandAvailable('notarealcommand12345xyz');
        expect(result).toBe(false);
    });

    test('returns true for node', () => {
        const result = isCommandAvailable('node');
        expect(result).toBe(true);
    });

    test('returns true for npm', () => {
        const result = isCommandAvailable('npm');
        expect(result).toBe(true);
    });

    test('handles commands with special characters safely', () => {
        // These should return false safely without throwing
        const result1 = isCommandAvailable('command-does-not-exist');
        const result2 = isCommandAvailable('another_fake_cmd');

        expect(typeof result1).toBe('boolean');
        expect(typeof result2).toBe('boolean');
    });
});

describe('Utils - sleep', () => {
    test('sleep completes without error', () => {
        expect(() => sleep(0.001)).not.toThrow();
    });

    test('sleep with 0 seconds completes', () => {
        expect(() => sleep(0)).not.toThrow();
    });

    test('sleep is a function', () => {
        expect(typeof sleep).toBe('function');
    });

    test('sleep accepts numeric argument', () => {
        expect(() => sleep(0.001)).not.toThrow();
    });
});

describe('Utils - getShineColors (curated LED colors)', () => {
    test('returns an array of color names', () => {
        const colors = getShineColors();
        expect(Array.isArray(colors)).toBe(true);
        expect(colors.length).toBeGreaterThan(0);
    });

    test('returns curated colors list', () => {
        const colors = getShineColors();
        expect(colors.length).toBeGreaterThan(0);
    });

    test('includes basic colors (red, green, blue)', () => {
        const colors = getShineColors();
        expect(colors).toContain('red');
        expect(colors).toContain('green');
        expect(colors).toContain('blue');
    });

    test('includes special colors (on, off)', () => {
        const colors = getShineColors();
        expect(colors).toContain('on');
        expect(colors).toContain('off');
    });

    test('includes multi-word colors (lightpink, darkblue, etc)', () => {
        const colors = getShineColors();
        expect(colors).toContain('lightpink');
        expect(colors).toContain('darkblue');
        expect(colors).toContain('skyblue');
    });
});

describe('Utils - normalizeColor with curated colors', () => {
    test('normalizes curated color: red', () => {
        const result = normalizeColor('red');
        expect(result).toBe('#FF0000');
    });

    test('normalizes curated color: blue', () => {
        const result = normalizeColor('blue');
        expect(result).toBe('#0000FF');
    });

    test('normalizes curated color: green', () => {
        const result = normalizeColor('green');
        expect(result).toBe('#008000');
    });

    test('normalizes curated color: purple', () => {
        const result = normalizeColor('purple');
        expect(result).toBe('#800080');
    });

    test('normalizes multi-word color without spaces: lightpink', () => {
        const result = normalizeColor('lightpink');
        expect(result).toBe('#FFB6C1');
    });

    test('normalizes multi-word color WITH spaces: light pink', () => {
        const result = normalizeColor('light pink');
        expect(result).toBe('#FFB6C1');
    });

    test('normalizes multi-word color with mixed case: Light Pink', () => {
        const result = normalizeColor('Light Pink');
        expect(result).toBe('#FFB6C1');
    });

    test('normalizes multi-word color all caps with spaces: LIGHT PINK', () => {
        const result = normalizeColor('LIGHT PINK');
        expect(result).toBe('#FFB6C1');
    });

    test('normalizes multi-word color: darkblue vs dark blue', () => {
        const result1 = normalizeColor('darkblue');
        const result2 = normalizeColor('dark blue');
        expect(result1).toBe('#00008B');
        expect(result2).toBe('#00008B');
        expect(result1).toBe(result2);
    });

    test('normalizes multi-word color: skyblue vs sky blue', () => {
        const result1 = normalizeColor('skyblue');
        const result2 = normalizeColor('sky blue');
        expect(result1).toBe('#87CEEB');
        expect(result2).toBe('#87CEEB');
        expect(result1).toBe(result2);
    });

    test('normalizes multi-word color: hotpink vs hot pink', () => {
        const result1 = normalizeColor('hotpink');
        const result2 = normalizeColor('hot pink');
        expect(result1).toBe('#FF69B4');
        expect(result2).toBe('#FF69B4');
        expect(result1).toBe(result2);
    });

    test('throws error for color not in curated list', () => {
        expect(() => normalizeColor('chartreuse')).toThrow(TJBotError);
        expect(() => normalizeColor('lavender')).toThrow(TJBotError);
    });
});
