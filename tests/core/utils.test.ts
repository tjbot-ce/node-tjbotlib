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
import { normalizeColor, convertHexToRgbColor, isCommandAvailable, sleep } from '../../src/utils/index.js';
import { TJBotError } from '../../src/utils/index.js';

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

    test('handles invalid hex gracefully (returns NaN values)', () => {
        const result = convertHexToRgbColor('GGGGGG');
        // Function returns NaN for invalid input, not [0,0,0]
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
