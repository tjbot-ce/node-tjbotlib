/**
 * Copyright 2025 IBM Corp. All Rights Reserved.
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

import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        // Test files from core tests directory (and subdirectories)
        include: ['tests/core/**/*.test.{js,ts}'],

        // Exclude all live hardware tests
        exclude: ['tests/live/**', 'node_modules/**'],

        // Setup file for native module mocks
        setupFiles: ['tests/core/setup.ts'],

        // Coverage configuration
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html', 'lcov'],
            include: ['src/**/*.ts'],
            exclude: [
                'src/**/*.d.ts',
                'src/@types/**', // Exclude type definitions
                // Exclude hardware-specific modules (tested via live tests only)
                'src/camera/**',
                'src/led/**',
                'src/microphone/**',
                'src/servo/**',
                'src/speaker/**',
                'src/stt/**',
                'src/tts/**',
            ],
            thresholds: {
                statements: 45,
                branches: 25,
                functions: 40,
                lines: 45,
            },
        },

        // Global test setup
        globals: true,
    },
});
