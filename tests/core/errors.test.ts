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
import { TJBotError } from '../../src/utils/index.js';

describe('TJBotError', () => {
    test('creates error with message only', () => {
        const message = 'Test error message';
        const error = new TJBotError(message);

        expect(error).toBeInstanceOf(Error);
        expect(error).toBeInstanceOf(TJBotError);
        expect(error.message).toBe(message);
        expect(error.name).toBe('TJBotError');
    });

    test('creates error with code option', () => {
        const message = 'Test error';
        const code = 'INVALID_CONFIG';
        const error = new TJBotError(message, { code });

        expect(error.code).toBe(code);
        expect(error.message).toBe(message);
    });

    test('creates error with context option', () => {
        const message = 'Test error';
        const context = { userId: 123, action: 'initialize' };
        const error = new TJBotError(message, { context });

        expect(error.context).toEqual(context);
        expect(error.message).toBe(message);
    });

    test('creates error with cause option', () => {
        const originalError = new Error('Original error');
        const message = 'Wrapped error';
        const error = new TJBotError(message, { cause: originalError });

        expect(error.cause).toBe(originalError);
        expect(error.message).toBe(message);
    });

    test('creates error with all options', () => {
        const originalError = new Error('Original');
        const message = 'Full error';
        const code = 'FULL_ERROR';
        const context = { field: 'value' };

        const error = new TJBotError(message, {
            code,
            context,
            cause: originalError,
        });

        expect(error.message).toBe(message);
        expect(error.code).toBe(code);
        expect(error.context).toEqual(context);
        expect(error.cause).toBe(originalError);
        expect(error.name).toBe('TJBotError');
    });

    test('has stack trace', () => {
        const error = new TJBotError('Error with stack');

        expect(error.stack).toBeDefined();
        expect(error.stack).toContain('TJBotError');
        expect(error.stack).toContain('Error with stack');
    });

    test('maintains stack trace through chaining', () => {
        const cause = new Error('Root cause');
        const error = new TJBotError('Chained error', { cause });

        expect(error.stack).toBeDefined();
        expect(error.cause).toBe(cause);
        expect(error.cause?.stack).toBeDefined();
    });

    test('undefined options create error without extra properties', () => {
        const error = new TJBotError('Simple error', undefined);

        expect(error.code).toBeUndefined();
        expect(error.context).toBeUndefined();
        expect(error.cause).toBeUndefined();
        expect(error.message).toBe('Simple error');
    });

    test('error can be thrown and caught', () => {
        const errorMessage = 'Throwable error';

        expect(() => {
            throw new TJBotError(errorMessage);
        }).toThrow(TJBotError);

        expect(() => {
            throw new TJBotError(errorMessage);
        }).toThrow(errorMessage);
    });

    test('error is an instance of Error', () => {
        const error = new TJBotError('Test');

        expect(error instanceof Error).toBe(true);
        expect(error instanceof TJBotError).toBe(true);
    });
});
