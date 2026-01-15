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

import { MicrophoneController } from '../../dist/microphone/index.js';
import { sleep, isCommandAvailable, formatTitle, formatSection, initWinston } from './utils.js';
import fs from 'fs';
import os from 'os';
import path from 'path';

const LOG_LEVEL = 'info';

async function runTest() {
    initWinston(LOG_LEVEL);

    console.log(formatTitle('TJBot Microphone Hardware Test'));

    // Check for required dependencies
    console.log('Checking for required dependencies...');

    const hasArecord = isCommandAvailable('arecord');
    if (hasArecord) {
        console.log('✓ arecord command available');
    } else {
        console.log('✗ arecord command not available');
        console.log('\nInstall with:');
        console.log('  sudo apt-get install alsa-utils\n');
        process.exit(1);
    }

    console.log('✓ All dependencies available\n');

    console.log(formatSection('Testing TJBot microphone'));

    // Create and initialize microphone controller directly
    const microphone = new MicrophoneController();
    const rate = 44100;
    const channels = 2;
    // Auto-detect device (or could pass a specific device like 'plughw:2,0')
    microphone.initialize(rate, channels);

    console.log('✓ Microphone initialized\n');

    try {
        // Record audio to file and verify data was written
        console.log('Recording 5 seconds of audio to verify data capture...\n');
        const tempDir = os.tmpdir();
        const audioFile = path.join(tempDir, `tjbot_test_${Date.now()}.raw`);
        console.log(`Recording to: ${audioFile}`);

        // Start microphone and pipe to file
        microphone.start();

        // Get the microphone input stream
        const micStream = microphone.getInputStream();
        const writeStream = fs.createWriteStream(audioFile);

        // Pipe mic data to file
        micStream.pipe(writeStream);

        console.log('Recording... Please make some noise (speak, clap, etc.)');
        await sleep(5000); // Record for 5 seconds

        // Stop recording
        micStream.unpipe(writeStream);
        microphone.stop();

        // Wait for the write stream to finish
        await new Promise((resolve) => {
            writeStream.end(resolve);
        });

        console.log('Recording complete.\n');

        // Check if file exists and has data
        let testPassed = false;
        if (fs.existsSync(audioFile)) {
            const stats = fs.statSync(audioFile);
            const fileSizeKB = (stats.size / 1024).toFixed(2);
            console.log(`✓ File created: ${audioFile}`);
            console.log(`✓ File size: ${fileSizeKB} KB (${stats.size} bytes)`);

            // For 5 seconds of audio at 44.1kHz, stereo, 16-bit, we expect roughly:
            // 44100 samples/sec * 2 bytes/sample * 2 channels * 5 seconds = 882,000 bytes
            // We'll check if we have at least 50KB to account for buffering variations
            if (stats.size > 50000) {
                console.log('✓ File contains substantial audio data');

                // Read a sample of the data to check it's not all zeros
                const buffer = Buffer.alloc(Math.min(1000, stats.size));
                const fd = fs.openSync(audioFile, 'r');
                fs.readSync(fd, buffer, 0, buffer.length, 0);
                fs.closeSync(fd);

                // Check if the buffer contains non-zero data
                let hasNonZeroData = false;
                for (let i = 0; i < buffer.length; i++) {
                    if (buffer[i] !== 0) {
                        hasNonZeroData = true;
                        break;
                    }
                }

                if (hasNonZeroData) {
                    console.log('✓ File contains non-zero audio data (likely actual sound)');
                    testPassed = true;
                } else {
                    console.log('✗ File appears to contain only zeros (no audio data)');
                }
            } else {
                console.log(`✗ File size too small (${fileSizeKB} KB < 50 KB expected)`);
            }

            // Clean up temp file
            try {
                fs.unlinkSync(audioFile);
                console.log('✓ Temporary file cleaned up');
            } catch (err) {
                console.log('Warning: Could not delete temporary file:', err.message);
            }
        } else {
            console.log('✗ File was not created');
        }

        console.log(testPassed ? '✓ PASS' : '✗ FAIL');

        console.log(formatTitle('Microphone Test Complete'));
        if (testPassed) {
            console.log('Microphone is working correctly!\n');
        } else {
            console.log('Microphone test failed. Possible causes:');
            console.log('  - No microphone connected');
            console.log('  - Microphone not set as default recording device');
            console.log('  - Check with: arecord -l');
            console.log('  - Test manually: arecord -d 5 test.wav && aplay test.wav\n');
            process.exit(1);
        }
    } catch (error) {
        console.error('\n✗ Error during microphone test:', error.message);
        process.exit(1);
    }
}

runTest().catch(console.error);
