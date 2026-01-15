#!/usr/bin/env node

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

import TJBot from '../../dist/tjbot.js';
import { confirmUser, formatTitle, formatSection, promptUser, initWinston } from './utils.js';

const LOG_LEVEL = 'info';

async function runTest() {
    initWinston(LOG_LEVEL);
    console.log(formatTitle('TJBot Servo Hardware Test'));

    // Ask user which GPIO pin the servo is connected to
    const gpioInput = await promptUser('Enter GPIO pin for servo (default: 18): ');
    const servoPin = gpioInput.trim() === '' ? 18 : parseInt(gpioInput.trim());

    const tjbot = new TJBot({
        log: { level: LOG_LEVEL },
        wave: {
            servoPin,
        },
    });

    console.log(formatSection('Testing TJBot Wave API'));

    try {
        tjbot.initialize([TJBot.Hardware.SERVO]);
        console.log(`✓ TJBot initialized with servo hardware on GPIO${tjbot.config.wave.servoPin}\n`);

        // Test 1: Arm back
        console.log('Test 1: Moving arm to BACK position');
        await tjbot.armBack();
        const result1 = await confirmUser('Did the arm move to the BACK position? (yes/no): ');
        console.log(result1 ? '✓ PASS' : '✗ FAIL');

        // Test 2: Raise arm
        console.log('\nTest 2: RAISING the arm');
        await tjbot.raiseArm();
        const result2 = await confirmUser('Did the arm RAISE UP? (yes/no): ');
        console.log(result2 ? '✓ PASS' : '✗ FAIL');

        // Test 3: Lower arm
        console.log('\nTest 3: LOWERING the arm');
        await tjbot.lowerArm();
        const result3 = await confirmUser('Did the arm LOWER DOWN? (yes/no): ');
        console.log(result3 ? '✓ PASS' : '✗ FAIL');

        // Test 4: Wave
        console.log('\nTest 4: WAVING the arm');
        tjbot.wave();
        const result4 = await confirmUser('Did the arm WAVE back and forth? (yes/no): ');
        console.log(result4 ? '✓ PASS' : '✗ FAIL');

        // Return to back position
        console.log('\nReturning arm to upward position...');
        await tjbot.raiseArm();

        console.log(formatTitle('Servo Test Complete'));
    } catch (error) {
        console.error('\n✗ Error during servo test:', error.message);
        process.exit(1);
    }
}

runTest().catch(console.error);
