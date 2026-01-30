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

import { strict as assert } from 'assert';
import { existsSync } from 'fs';
import { TJBot } from '../../dist/tjbot.js';
import { isCommandAvailable, formatTitle, formatSection, initWinston } from './utils.js';

const LOG_LEVEL = 'info';

async function runTest() {
    initWinston(LOG_LEVEL);
    console.log(formatTitle('TJBot Camera Hardware Test'));

    // Check for required dependencies
    console.log('Checking for required dependencies...');
    const hasRpicamStill = isCommandAvailable('rpicam-still');
    if (hasRpicamStill) {
        console.log('✓ rpicam-still command available');
    } else {
        console.log('✗ rpicam-still command not available');
        console.log('\nInstall with:');
        console.log('  sudo apt-get install rpicam-apps-lite\n');
        process.exit(1);
    }
    console.log('✓ All dependencies available\n');

    console.log(formatSection('Testing TJBot.look() API'));
    const tjbot = await TJBot.getInstance().initialize({
        log: { level: LOG_LEVEL },
        hardware: { [TJBot.Hardware.CAMERA]: true },
        see: { cameraResolution: [640, 480] },
    });

    try {
        // Test 1: Take photo with default path
        console.log('Test 1: Taking a photo via tjbot.look() (default path)');
        const photoPath1 = await tjbot.look();
        console.log(`Photo saved to: ${photoPath1}`);
        assert(existsSync(photoPath1), 'Photo file was not created at default path');
        console.log('✓ PASS - Photo file created at default path');

        // Test 2: Take photo with custom path
        console.log('\nTest 2: Taking a photo via tjbot.look() (custom path)');
        const customPath = '/tmp/tjbot-test-photo.jpg';
        const photoPath2 = await tjbot.look(customPath);
        console.log(`Photo saved to: ${photoPath2}`);
        assert(existsSync(photoPath2), 'Photo file was not created at custom path');
        assert.strictEqual(photoPath2, customPath, 'Photo path does not match requested custom path');
        console.log('✓ PASS - Photo file created at custom path');

        console.log(formatTitle('Camera Test Complete'));
        console.log('Note: Check the captured images to verify quality and settings.');
        console.log('Photo paths have been displayed above.\n');
    } catch (error) {
        console.error('\n✗ Error during TJBot.look() test:', error.message);
        console.error('\nMake sure:');
        console.error('  1. You are running on a Raspberry Pi');
        console.error('  2. rpicam-still command-line tool is installed');
        console.error('     Install with: sudo apt-get install rpicam-apps-lite');
        console.error('  3. Camera hardware is properly connected');
        console.error('  4. Camera interface is enabled in raspi-config');
        process.exit(1);
    }
}

runTest().catch((err) => {
    console.error('Unhandled error in camera test:', err);
    process.exit(1);
});
