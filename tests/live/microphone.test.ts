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

import { select } from '@inquirer/prompts';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { MicrophoneController } from '../../src/microphone/index.js';
import { initWinston } from '../../src/utils/logging.js';
import { formatSection, formatTitle, isCommandAvailable, listAlsaDevices, sleep } from './utils.js';

async function promptDeviceChoice(): Promise<string | undefined> {
    const devices = listAlsaDevices('arecord');
    if (devices.length === 0) {
        console.log('ℹ️  No ALSA devices found; using system default');
        return undefined;
    }
    if (devices.length === 1) {
        console.log(`ℹ️  Using single ALSA device: ${devices[0].name}`);
        return devices[0].value;
    }
    return select({
        message: 'Select audio input device:',
        choices: devices,
        default: devices[0].value,
    });
}

// ── VU meter helpers ──────────────────────────────────────────────────────────

const BAR_WIDTH = 40;
// Gain applied before clamping to [0,1]. Typical USB mic RMS ≈ 0.01–0.05;
// multiplying by 10 maps quiet speech to the lower third of the bar.
const GAIN = 10;

/**
 * Compute RMS of a 16-bit signed little-endian PCM buffer, scaled to [0, 1].
 */
function computeRMS(buffer: Buffer): number {
    const sampleCount = Math.floor(buffer.length / 2);
    if (sampleCount === 0) return 0;
    let sumSquares = 0;
    for (let i = 0; i < sampleCount; i++) {
        const sample = buffer.readInt16LE(i * 2) / 32768.0;
        sumSquares += sample * sample;
    }
    return Math.min(Math.sqrt(sumSquares / sampleCount) * GAIN, 1.0);
}

/**
 * Overwrite the current terminal line with an ASCII VU meter.
 * @param level  Instantaneous RMS level [0, 1]
 * @param peak   Peak-hold level [0, 1]
 * @param secondsLeft Countdown seconds remaining
 */
function renderVUMeter(level: number, peak: number, secondsLeft: number): void {
    const filled = Math.round(level * BAR_WIDTH);
    const peakPos = Math.min(Math.round(peak * BAR_WIDTH), BAR_WIDTH - 1);

    let bar = '';
    for (let i = 0; i < BAR_WIDTH; i++) {
        if (i < filled) {
            bar += '\u2588'; // █
        } else if (i === peakPos && peakPos >= filled) {
            bar += '\u258c'; // ▌ peak-hold marker
        } else {
            bar += '\u2591'; // ░
        }
    }

    const pct = String(Math.round(level * 100)).padStart(3);
    const pkPct = String(Math.round(peak * 100)).padStart(3);
    process.stdout.write(
        `\r\u23f1  ${String(secondsLeft).padStart(2)}s \u2502 \ud83c\udfa4 [${bar}] ${pct}% \u2502 peak: ${pkPct}%  `
    );
}

const LOG_LEVEL = 'info';
const DURATION_S = 10;

async function runTest(): Promise<void> {
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

    const selectedDevice = await promptDeviceChoice();

    // Create and initialize microphone controller directly
    const microphone = new MicrophoneController();
    const rate = 44100;
    const channels = 2;
    microphone.initialize(rate, channels, selectedDevice);

    console.log('✓ Microphone initialized\n');

    try {
        console.log(`Recording ${DURATION_S} seconds of audio. Make some noise (speak, clap, etc.)!\n`);
        const tempDir = os.tmpdir();
        const audioFile = path.join(tempDir, `tjbot_test_${Date.now()}.wav`);

        microphone.start();
        const micStream = microphone.getInputStream();
        const writeStream = fs.createWriteStream(audioFile);

        // Peak-hold state: rises instantly, decays slowly per chunk
        let peak = 0;
        let remaining = DURATION_S;

        const countdownInterval = setInterval(() => {
            if (remaining > 0) remaining--;
        }, 1000);

        const onData = (chunk: Buffer): void => {
            writeStream.write(chunk);
            const rms = computeRMS(chunk);
            peak = rms > peak ? rms : peak * 0.95;
            renderVUMeter(rms, peak, remaining);
        };

        micStream.on('data', onData);

        await sleep(DURATION_S * 1000);

        clearInterval(countdownInterval);
        // Move cursor to next line so subsequent console.log output is clean
        process.stdout.write('\n');

        micStream.off('data', onData);
        microphone.stop();

        await new Promise<void>((resolve) => {
            writeStream.end(() => resolve());
        });

        console.log('\nRecording complete.\n');

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
            // try {
            //     fs.unlinkSync(audioFile);
            //     console.log('✓ Temporary file cleaned up');
            // } catch (err) {
            //     console.log('Warning: Could not delete temporary file:', (err as Error).message);
            // }
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
        console.error('\n✗ Error during microphone test:', (error as Error).message);
        process.exit(1);
    }
}

runTest().catch(console.error);
