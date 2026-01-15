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
import TJBot from '../../dist/tjbot.js';
import { CameraController } from '../../dist/camera/index.js';
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

    // Test TJBot.look() API
    console.log(formatSection('Testing TJBot Look API'));

    const tjbot = new TJBot({ log: { level: LOG_LEVEL } });

    try {
        tjbot.initialize([TJBot.Hardware.CAMERA]);
        console.log('✓ TJBot initialized with camera hardware\n');

        // Test 1: Take photo with default path via tjbot.look()
        console.log('\nTest 1: Taking a photo via tjbot.look() (default path)');
        const photoPath1 = await tjbot.look();
        console.log(`Photo saved to: ${photoPath1}`);

        assert(existsSync(photoPath1), 'Photo file was not created at default path');
        console.log('✓ PASS - Photo file created');

        // Test 2: Take photo with custom path via tjbot.look()
        console.log('\nTest 2: Taking a photo via tjbot.look() (custom path)');
        const customPath = '/tmp/tjbot-test-photo.jpg';
        const photoPath2 = await tjbot.look(customPath);
        console.log(`Photo saved to: ${photoPath2}`);

        assert(existsSync(photoPath2), 'Photo file was not created at custom path');
        assert.strictEqual(photoPath2, customPath, 'Photo path does not match requested custom path');
        console.log('✓ PASS - Photo file created at custom path');

        // Test 3: Multiple photos via tjbot.look()
        console.log('\nTest 3: Taking multiple photos in sequence via tjbot.look()');
        const photo3 = await tjbot.look();
        console.log(`Photo 3: ${photo3}`);
        const photo4 = await tjbot.look();
        console.log(`Photo 4: ${photo4}`);

        assert(existsSync(photo3), 'Photo 3 file was not created');
        assert(existsSync(photo4), 'Photo 4 file was not created');
        assert.notStrictEqual(photo3, photo4, 'Multiple photos should have different paths');
        console.log('✓ PASS - Multiple photos captured successfully');
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

    // Test CameraController API directly
    console.log(formatSection('Testing CameraController API'));

    try {
        // Test 1: Initialize CameraController with default settings
        console.log('\nTest 1: Initializing CameraController');
        const camera = new CameraController();
        console.log('✓ CameraController initialized');

        // Test 2: Initialize with custom configuration
        console.log('\nTest 2: Initializing CameraController with custom configuration');
        camera.initialize([1280, 720], true, false);
        console.log('✓ CameraController configured with custom resolution and flips');

        // Test 3: Capture photo with default temp path
        console.log('\nTest 3: Capturing photo via CameraController (default temp path)');
        const tempPhotoPath = await camera.capturePhoto();
        console.log(`Photo saved to: ${tempPhotoPath}`);

        assert(existsSync(tempPhotoPath), 'Photo file was not created at temp path');
        console.log('✓ PASS - Photo file created at temp path');

        // Test 4: Capture photo with specified path
        console.log('\nTest 4: Capturing photo via CameraController (specified path)');
        const specifiedPath = '/tmp/tjbot-controller-test.jpg';
        const specifiedPhotoPath = await camera.capturePhoto(specifiedPath);
        console.log(`Photo saved to: ${specifiedPhotoPath}`);

        assert(existsSync(specifiedPhotoPath), 'Photo file was not created at specified path');
        assert.strictEqual(specifiedPhotoPath, specifiedPath, 'Photo path does not match requested path');
        console.log('✓ PASS - Photo file created at specified path');

        // Test 5: Cleanup
        console.log('\nTest 5: Cleaning up resources');
        camera.cleanup();
        console.log('✓ CameraController cleaned up');

        console.log(formatTitle('Camera Test Complete'));
        console.log('Note: Check the captured images to verify quality and settings.');
        console.log('Photo paths have been displayed above.\n');
    } catch (error) {
        console.error('\n✗ Error during CameraController test:', error.message);
        console.error('\nMake sure:');
        console.error('  1. You are running on a Raspberry Pi');
        console.error('  2. rpicam-still command-line tool is installed');
        console.error('     Install with: sudo apt-get install rpicam-apps-lite');
        console.error('  3. Camera hardware is properly connected');
        console.error('  4. Camera interface is enabled in raspi-config');
        process.exit(1);
    }
}

runTest().catch(console.error);
