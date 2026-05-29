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
import { Capability, Hardware } from '../../src/utils/index.js';

describe('Constants - Capability Enum', () => {
    test('[test_capability_enums] capability enums', () => {
        expect(Capability.LISTEN).toBe('listen');
        expect(Capability.SEE).toBe('see');
        expect(Capability.SHINE).toBe('shine');
        expect(Capability.SPEAK).toBe('speak');
        expect(Capability.WAVE).toBe('wave');
    });

    test('[test_capability_enum_has_all_expected_values] Capability enum has all expected values', () => {
        expect(Capability.LISTEN).toBe('listen');
        expect(Capability.SEE).toBe('see');
        expect(Capability.SHINE).toBe('shine');
        expect(Capability.SPEAK).toBe('speak');
        expect(Capability.WAVE).toBe('wave');
    });

    test('[test_capability_enum_values_are_strings] Capability enum values are strings', () => {
        Object.values(Capability).forEach((value) => {
            expect(typeof value).toBe('string');
        });
    });

    test('[test_capability_enum_has_correct_number_of_values] Capability enum has correct number of values', () => {
        const values = Object.values(Capability);
        expect(values.length).toBe(5);
    });

    test('[test_capability_enum_values_are_unique] Capability enum values are unique', () => {
        const values = Object.values(Capability);
        const uniqueValues = new Set(values);
        expect(uniqueValues.size).toBe(values.length);
    });

    test('[test_capability_can_be_used_as_object_keys] Capability can be used as object keys', () => {
        const capabilityMap: Record<string, boolean> = {};
        capabilityMap[Capability.LISTEN] = true;
        capabilityMap[Capability.SPEAK] = true;

        expect(capabilityMap[Capability.LISTEN]).toBe(true);
        expect(capabilityMap[Capability.SPEAK]).toBe(true);
        expect(capabilityMap[Capability.SHINE]).toBeUndefined();
    });
});

describe('Constants - Hardware Enum', () => {
    test('[test_hardware_enums] hardware enums', () => {
        expect(Hardware.CAMERA).toBe('camera');
        expect(Hardware.LED).toBe('led');
        expect(Hardware.MICROPHONE).toBe('microphone');
        expect(Hardware.SERVO).toBe('servo');
        expect(Hardware.SPEAKER).toBe('speaker');
    });

    test('[test_hardware_enum_values_are_strings] Hardware enum values are strings', () => {
        Object.values(Hardware).forEach((value) => {
            expect(typeof value).toBe('string');
        });
    });

    test('[test_hardware_enum_values_are_unique] Hardware enum values are unique', () => {
        const values = Object.values(Hardware);
        const uniqueValues = new Set(values);
        expect(uniqueValues.size).toBe(values.length);
    });

    test('[test_hardware_can_be_used_as_object_keys] Hardware can be used as object keys', () => {
        const hardwareMap: Record<string, boolean> = {};
        hardwareMap[Hardware.CAMERA] = true;
        hardwareMap[Hardware.SPEAKER] = false;

        expect(hardwareMap[Hardware.CAMERA]).toBe(true);
        expect(hardwareMap[Hardware.SPEAKER]).toBe(false);
        expect(hardwareMap[Hardware.MICROPHONE]).toBeUndefined();
    });
});

describe('Cross-enum consistency', () => {
    test('[test_all_enums_are_exported_and_accessible] all enums are exported and accessible', () => {
        expect(Capability).toBeDefined();
        expect(Hardware).toBeDefined();
    });

    test('[test_enum_values_have_no_spaces] enum values have no spaces', () => {
        const allValues = [...Object.values(Capability), ...Object.values(Hardware)];

        allValues.forEach((value) => {
            expect(value).not.toContain(' ');
        });
    });

    test('[test_enum_values_use_lowercase_or_snake_case] enum values use lowercase or snake_case', () => {
        const allValues = [...Object.values(Capability), ...Object.values(Hardware)];

        allValues.forEach((value) => {
            expect(value).toMatch(/^[a-z_]+$/);
        });
    });
});
