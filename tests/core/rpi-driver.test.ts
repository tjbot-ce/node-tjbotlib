/**
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
import { RPiBaseHardwareDriver } from '../../src/rpi-drivers/rpi-driver.js';
import { ServoPosition } from '../../src/servo/index.js';
import { Capability, Hardware, TJBotError } from '../../src/utils/index.js';

class DummyDriver extends RPiBaseHardwareDriver {
    setupLEDCommonAnode(): void {}

    async setupLEDNeopixel(): Promise<void> {}

    setupServo(): void {}

    renderLEDCommonAnode(): void {}

    async renderLEDNeopixel(): Promise<void> {}

    renderServoPosition(_position: ServoPosition): void {}
}

describe('RPi base driver capability and hardware set behavior', () => {
    test('[test_get_hardware_returns_copy_of_initialized_hardware] get hardware returns copy of initialized hardware', () => {
        const driver = new DummyDriver();
        driver.initializedHardware.add(Hardware.CAMERA);
        driver.initializedHardware.add(Hardware.SPEAKER);

        const copy = driver.getHardware();
        expect(copy).toEqual(new Set([Hardware.CAMERA, Hardware.SPEAKER]));

        copy.add(Hardware.SERVO);
        expect(driver.initializedHardware.has(Hardware.SERVO)).toBe(false);
    });

    test('[test_has_capability_uses_initialized_hardware_set] has capability uses initialized hardware set', () => {
        const driver = new DummyDriver();
        driver.initializedHardware.add(Hardware.MICROPHONE);

        expect(driver.hasCapability(Capability.LISTEN)).toBe(true);
        expect(driver.hasCapability(Capability.SPEAK)).toBe(false);
    });

    test('[test_has_hardware_led_unified_checks_led_variants] has hardware led unified checks led variants', () => {
        const driver = new DummyDriver();
        expect(driver.hasHardware(Hardware.LED)).toBe(false);
        driver.initializedHardware.add(Hardware.LED);
        expect(driver.hasHardware(Hardware.LED)).toBe(true);
    });

    test('[test_capture_photo_buffer_raises_when_camera_not_initialized] capture photo buffer raises when camera not initialized', async () => {
        const driver = new DummyDriver();
        await expect(driver.capturePhotoBuffer()).rejects.toThrow(TJBotError);
    });
});
