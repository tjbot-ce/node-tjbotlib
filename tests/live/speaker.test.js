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

import { writeFileSync, unlinkSync } from 'fs';
import { AudioPlayer } from '../../dist/speaker/audio-player.js';
import { isCommandAvailable, formatTitle, formatSection, initWinston } from './utils.js';
import { confirm } from '@inquirer/prompts';

const LOG_LEVEL = 'info';

async function runTest() {
    initWinston(LOG_LEVEL);
    console.log(formatTitle('TJBot Speaker Hardware Test'));

    // Check for required dependencies
    console.log('Checking for required dependencies...');

    const hasAplay = isCommandAvailable('aplay');
    if (hasAplay) {
        console.log('✓ aplay command available');
    } else {
        console.log('✗ aplay command not available');
        console.log('\nInstall with:');
        console.log('  sudo apt-get install alsa-utils\n');
        process.exit(1);
    }

    console.log('✓ All dependencies available\n');

    console.log(formatSection('Testing TJBot speaker'));

    // Create audio player directly to test playback without TTS
    const audioPlayer = new AudioPlayer();
    console.log('✓ Audio player initialized\n');

    try {
        // Test 1: Generate test audio file and play
        console.log('Test 1: Playing a test audio file');
        const testAudioPath = '/tmp/tjbot-test-beep.wav';

        // Generate a simple WAV file with an audible tone
        // This creates a 440 Hz tone that should be clearly audible
        console.log('Generating test audio file...');
        const sampleRate = 22050;
        const duration = 1; // 1 second
        const numSamples = sampleRate * duration;
        const channels = 1;
        const bytesPerSample = 2;

        const header = Buffer.alloc(44);
        header.write('RIFF', 0);
        header.writeUInt32LE(36 + numSamples * bytesPerSample, 4);
        header.write('WAVE', 8);
        header.write('fmt ', 12);
        header.writeUInt32LE(16, 16);
        header.writeUInt16LE(1, 20);
        header.writeUInt16LE(channels, 22);
        header.writeUInt32LE(sampleRate, 24);
        header.writeUInt32LE(sampleRate * bytesPerSample, 28);
        header.writeUInt16LE(bytesPerSample, 32);
        header.writeUInt16LE(bytesPerSample * 8, 34);
        header.write('data', 36);
        header.writeUInt32LE(numSamples * bytesPerSample, 40);

        const audioData = Buffer.alloc(numSamples * bytesPerSample);
        // Generate a 440 Hz tone (A4 note)
        for (let i = 0; i < numSamples; i++) {
            const sample = Math.sin((2 * Math.PI * 440 * i) / sampleRate) * 32767 * 0.5;
            audioData.writeInt16LE(Math.round(sample), i * 2);
        }
        writeFileSync(testAudioPath, Buffer.concat([header, audioData]));

        console.log(`Playing test audio: ${testAudioPath}`);

        // Play the audio using AudioPlayer directly
        await new Promise((resolve, reject) => {
            audioPlayer.once('complete', resolve);
            audioPlayer.once('error', reject);
            audioPlayer.play(testAudioPath);
        });

        const result1 = await confirm({ message: 'Did you hear audio playback?' });
        console.log(result1 ? '✓ PASS' : '✗ FAIL');

        // Clean up test audio file
        try {
            unlinkSync(testAudioPath);
            console.log('✓ Test audio file cleaned up');
        } catch (err) {
            console.log('Warning: Could not delete test audio file:', err.message);
        }
    } catch (error) {
        console.error('\n✗ Error during speaker test:', error.message);
        console.error('\nMake sure:');
        console.error('  1. You are running on a Raspberry Pi');
        console.error('  2. Optional hardware dependencies are installed');
        console.error('  3. Speaker/audio output is properly connected');
        console.error('  4. Audio output device is configured correctly');
        console.error('  5. Check available devices with: aplay -l');
        console.error('  6. TTS credentials are configured (for speak tests)');
        process.exit(1);
    }
}

runTest().catch(console.error);
