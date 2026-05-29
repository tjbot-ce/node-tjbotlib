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

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import { RPiDetect } from '../../src/rpi-drivers/index.js';

describe('RPi Detection', () => {
    let readFileSyncStub: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        // Mock fs.readFileSync for testing different Pi models
        readFileSyncStub = vi.spyOn(fs, 'readFileSync');
    });

    afterEach(() => {
        readFileSyncStub.mockRestore();
    });

    test('[test_detects_raspberry_pi_3_model_correctly] detects Raspberry Pi 3 model correctly', () => {
        const pi3CpuInfo = `processor	: 0
BogoMIPS	: 102.40
Features	: half thumb fastmult vfp edsp neon vfpv4 idiva idivt vfpd32 lpae evtstrm crc32 nouserexcpd abe
CPU implementer	: 0x41
CPU architecture: 7
CPU variant	: 0xc
CPU part	: 0xd03
CPU revision	: 4

processor	: 1
BogoMIPS	: 102.40
Features	: half thumb fastmult vfp edsp neon vfpv4 idiva idivt vfpd32 lpae evtstrm crc32 nouserexcpd abe
CPU implementer	: 0x41
CPU architecture: 7
CPU variant	: 0xc
CPU part	: 0xd03
CPU revision	: 4

processor	: 2
BogoMIPS	: 102.40
Features	: half thumb fastmult vfp edsp neon vfpv4 idiva idivt vfpd32 lpae evtstrm crc32 nouserexcpd abe
CPU implementer	: 0x41
CPU architecture: 7
CPU variant	: 0xc
CPU part	: 0xd03
CPU revision	: 4

processor	: 3
BogoMIPS	: 102.40
Features	: half thumb fastmult vfp edsp neon vfpv4 idiva idivt vfpd32 lpae evtstrm crc32 nouserexcpd abe
CPU implementer	: 0x41
CPU architecture: 7
CPU variant	: 0xc
CPU part	: 0xd03
CPU revision	: 4

Hardware	: BCM2835
Revision	: a22082
Serial		: 000000001234567
Model		: Raspberry Pi 3 Model B Rev 1.2
`;
        readFileSyncStub.mockReturnValue(pi3CpuInfo);

        const model = RPiDetect.model();
        expect(model).toContain('Raspberry Pi 3');
    });

    test('[test_detect_rpi3] detect rpi3', () => {
        const pi3CpuInfo = 'Model\t\t: Raspberry Pi 3 Model B Rev 1.2';
        readFileSyncStub.mockReturnValue(pi3CpuInfo);
        expect(RPiDetect.isPi3()).toBe(true);
        expect(RPiDetect.isPi4()).toBe(false);
        expect(RPiDetect.isPi5()).toBe(false);
    });

    test('[test_detects_raspberry_pi_4_model_correctly] detects Raspberry Pi 4 model correctly', () => {
        const pi4CpuInfo = `processor	: 0
BogoMIPS	: 108.00
Features	: fp asimd evtstrm crc32 cpuid
CPU implementer	: 0x41
CPU architecture: 8
CPU variant	: 0xa
CPU part	: 0xd08
CPU revision	: 1

processor	: 1
BogoMIPS	: 108.00
Features	: fp asimd evtstrm crc32 cpuid
CPU implementer	: 0x41
CPU architecture: 8
CPU variant	: 0xa
CPU part	: 0xd08
CPU revision	: 1

processor	: 2
BogoMIPS	: 108.00
Features	: fp asimd evtstrm crc32 cpuid
CPU implementer	: 0x41
CPU architecture: 8
CPU variant	: 0xa
CPU part	: 0xd08
CPU revision	: 1

processor	: 3
BogoMIPS	: 108.00
Features	: fp asimd evtstrm crc32 cpuid
CPU implementer	: 0x41
CPU architecture: 8
CPU variant	: 0xa
CPU part	: 0xd08
CPU revision	: 1

Hardware	: BCM2711
Revision	: c03114
Serial		: 100000005678901
Model		: Raspberry Pi 4 Model B Rev 1.4
`;
        readFileSyncStub.mockReturnValue(pi4CpuInfo);

        const model = RPiDetect.model();
        expect(model).toContain('Raspberry Pi 4');
    });

    test('[test_detect_rpi4] detect rpi4', () => {
        const pi4CpuInfo = 'Model\t\t: Raspberry Pi 4 Model B Rev 1.4';
        readFileSyncStub.mockReturnValue(pi4CpuInfo);
        expect(RPiDetect.isPi3()).toBe(false);
        expect(RPiDetect.isPi4()).toBe(true);
        expect(RPiDetect.isPi5()).toBe(false);
    });

    test('[test_detects_raspberry_pi_5_model_correctly] detects Raspberry Pi 5 model correctly', () => {
        const pi5CpuInfo = `processor	: 0
BogoMIPS	: 108.00
Features	: fp asimd evtstrm crc32 cpuid asimdrdm lrcpc dcache_clean aes sha1 sha2 sha512 asimddp sha3 sm3 sm4 asimdfhm dit uscat ilrcpc flagm ssbs sb pauth dpb dgh abe doitm i8mm bf16 bfloat16 w
CPU implementer	: 0x41
CPU architecture: 8
CPU variant	: 0xa
CPU part	: 0xd0b
CPU revision	: 1

processor	: 1
BogoMIPS	: 108.00
Features	: fp asimd evtstrm crc32 cpuid asimdrdm lrcpc dcache_clean aes sha1 sha2 sha512 asimddp sha3 sm3 sm4 asimdfhm dit uscat ilrcpc flagm ssbs sb pauth dpb dgh abe doitm i8mm bf16 bfloat16 w
CPU implementer	: 0x41
CPU architecture: 8
CPU variant	: 0xa
CPU part	: 0xd0b
CPU revision	: 1

processor	: 2
BogoMIPS	: 108.00
Features	: fp asimd evtstrm crc32 cpuid asimdrdm lrcpc dcache_clean aes sha1 sha2 sha512 asimddp sha3 sm3 sm4 asimdfhm dit uscat ilrcpc flagm ssbs sb pauth dpb dgh abe doitm i8mm bf16 bfloat16 w
CPU implementer	: 0x41
CPU architecture: 8
CPU variant	: 0xa
CPU part	: 0xd0b
CPU revision	: 1

processor	: 3
BogoMIPS	: 108.00
Features	: fp asimd evtstrm crc32 cpuid asimdrdm lrcpc dcache_clean aes sha1 sha2 sha512 asimddp sha3 sm3 sm4 asimdfhm dit uscat ilrcpc flagm ssbs sb pauth dpb dgh abe doitm i8mm bf16 bfloat16 w
CPU implementer	: 0x41
CPU architecture: 8
CPU variant	: 0xa
CPU part	: 0xd0b
CPU revision	: 1

Hardware	: BCM2712
Revision	: d04165
Serial		: f23a4d8a
Model		: Raspberry Pi 5 Model B Rev 1.0
`;
        readFileSyncStub.mockReturnValue(pi5CpuInfo);

        const model = RPiDetect.model();
        expect(model).toContain('Raspberry Pi 5');
    });

    test('[test_detect_rpi5] detect rpi5', () => {
        const pi5CpuInfo = 'Model\t\t: Raspberry Pi 5 Model B Rev 1.0';
        readFileSyncStub.mockReturnValue(pi5CpuInfo);
        expect(RPiDetect.isPi3()).toBe(false);
        expect(RPiDetect.isPi4()).toBe(false);
        expect(RPiDetect.isPi5()).toBe(true);
    });

    test('[test_model_string] model string', () => {
        const pi4CpuInfo = 'Model\t\t: Raspberry Pi 4 Model B Rev 1.4';
        readFileSyncStub.mockReturnValue(pi4CpuInfo);
        expect(RPiDetect.model()).toContain('Raspberry Pi 4');
    });

    test('[test_returns_a_non_empty_model_string] returns a non-empty model string', () => {
        const model = RPiDetect.model();
        expect(typeof model).toBe('string');
        expect(model.length).toBeGreaterThan(0);
    });

    test('[test_model_string_contains_identifying_information] model string contains identifying information', () => {
        const model = RPiDetect.model();
        // Should contain some identifying info (either real RPi on actual device or fallback)
        expect(model).toMatch(/Raspberry Pi|Unknown device/i);
    });

    test('[test_is_pi3_returns_boolean] isPi3 returns boolean', () => {
        const result = RPiDetect.isPi3();
        expect(typeof result).toBe('boolean');
    });

    test('[test_is_pi4_returns_boolean] isPi4 returns boolean', () => {
        const result = RPiDetect.isPi4();
        expect(typeof result).toBe('boolean');
    });

    test('[test_is_pi5_returns_boolean] isPi5 returns boolean', () => {
        const result = RPiDetect.isPi5();
        expect(typeof result).toBe('boolean');
    });

    test('[test_each_pi_version_detector_returns_boolean] each Pi version detector returns boolean', () => {
        // Each detector should return a boolean regardless of current hardware
        const pi3 = RPiDetect.isPi3();
        const pi4 = RPiDetect.isPi4();
        const pi5 = RPiDetect.isPi5();

        // Verify all detectors return booleans
        expect(typeof pi3).toBe('boolean');
        expect(typeof pi4).toBe('boolean');
        expect(typeof pi5).toBe('boolean');
    });

    test('[test_pi_version_detection_is_consistent_with_model_string] Pi version detection is consistent with model string', () => {
        const pi3CpuInfo = 'Model\t\t: Raspberry Pi 3 Model B Rev 1.2';
        readFileSyncStub.mockReturnValue(pi3CpuInfo);

        expect(RPiDetect.model()).toContain('Raspberry Pi 3');
        expect(RPiDetect.isPi3()).toBe(true);
        expect(RPiDetect.isPi4()).toBe(false);
        expect(RPiDetect.isPi5()).toBe(false);
    });
});
