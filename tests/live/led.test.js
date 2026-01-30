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
import RPiDetect from '../../dist/rpi-drivers/rpi-detect.js';
import { select, input, confirm } from '@inquirer/prompts';
import { formatTitle, formatSection, initWinston } from './utils.js';

const LOG_LEVEL = 'info';

async function runTest() {
    initWinston(LOG_LEVEL);
    console.log(formatTitle('TJBot LED Hardware Test'));

    // Ask user which LED type to test
    const ledType = await select({
        message: 'Which LED type are you testing?',
        choices: [
            { name: 'NeoPixel (WS2812B)', value: 'neopixel' },
            { name: 'Common Anode RGB LED', value: 'common-anode' },
        ],
        default: 'neopixel',
    });
    const isNeoPixel = ledType === 'neopixel';

    const config = {
        log: { level: LOG_LEVEL },
        hardware: {},
        shine: {},
    };

    if (isNeoPixel) {
        // NeoPixel setup - configuration varies by Pi model
        let neopixelConfig = {};

        if (RPiDetect.isPi5()) {
            // RPi5 uses SPI interface
            const spiInterface = await input({
                message: 'Enter SPI interface for NeoPixel LED (default: /dev/spidev0.0):',
                default: '/dev/spidev0.0',
            });
            neopixelConfig = { spiInterface };
            console.log(`✓ NeoPixel SPI interface: ${spiInterface}\n`);
        } else {
            // RPi3/4 use GPIO pin
            const gpioPin = await input({
                message: 'Enter GPIO pin for NeoPixel LED (default: 21):',
                default: '21',
                validate: (value) => {
                    const num = parseInt(value);
                    return !isNaN(num) ? true : 'Please enter a valid number';
                },
            });
            neopixelConfig = { gpioPin: parseInt(gpioPin) };
            console.log(`✓ NeoPixel GPIO pin: ${gpioPin}\n`);
        }

        config.hardware = { [TJBot.Hardware.LED_NEOPIXEL]: true };
        config.shine = { neopixel: neopixelConfig };
        console.log('✓ NeoPixel LED config ready\n');
    } else {
        // Common Anode RGB LED setup
        const redPin = await input({
            message: 'Enter GPIO pin for Red LED (default: 19):',
            default: '19',
            validate: (value) => {
                const num = parseInt(value);
                return !isNaN(num) ? true : 'Please enter a valid number';
            },
        });
        const greenPin = await input({
            message: 'Enter GPIO pin for Green LED (default: 13):',
            default: '13',
            validate: (value) => {
                const num = parseInt(value);
                return !isNaN(num) ? true : 'Please enter a valid number';
            },
        });
        const bluePin = await input({
            message: 'Enter GPIO pin for Blue LED (default: 12):',
            default: '12',
            validate: (value) => {
                const num = parseInt(value);
                return !isNaN(num) ? true : 'Please enter a valid number';
            },
        });

        config.hardware = { [TJBot.Hardware.LED_COMMON_ANODE]: true };
        config.shine = {
            commonanode: {
                redPin: parseInt(redPin),
                greenPin: parseInt(greenPin),
                bluePin: parseInt(bluePin),
            },
        };
        console.log('✓ Common Anode LED config ready\n');
    }

    const tjbot = await TJBot.getInstance().initialize(config);
    if (config.hardware.led_neopixel) {
        console.log('✓ TJBot initialized with NeoPixel LED\n');
    } else {
        console.log('✓ TJBot initialized with Common Anode LED\n');
        console.log(
            `✓ TJBot initialized with Common Anode LED on Red:GPIO${tjbot.config.shine.commonanode?.redPin} Green:GPIO${tjbot.config.shine.commonanode?.greenPin} Blue:GPIO${tjbot.config.shine.commonanode?.bluePin}\n`
        );
    }

    console.log(formatSection('Testing TJBot Shine API'));

    try {
        // Test 1: Red LED
        console.log('Test 1: Shining RED');
        await tjbot.shine('red');
        const result1 = await confirm({ message: 'Did the LED turn RED?' });
        console.log(result1 ? '✓ PASS' : '✗ FAIL');

        // Test 2: Green LED
        console.log('\nTest 2: Shining GREEN');
        await tjbot.shine('green');
        const result2 = await confirm({ message: 'Did the LED turn GREEN?' });
        console.log(result2 ? '✓ PASS' : '✗ FAIL');

        // Test 3: Blue LED
        console.log('\nTest 3: Shining BLUE');
        await tjbot.shine('blue');
        const result3 = await confirm({ message: 'Did the LED turn BLUE?' });
        console.log(result3 ? '✓ PASS' : '✗ FAIL');

        // Test 4: Hex color
        console.log('\nTest 4: Shining PURPLE (hex #9400D3)');
        await tjbot.shine('#9400D3');
        const result4 = await confirm({ message: 'Did the LED turn PURPLE?' });
        console.log(result4 ? '✓ PASS' : '✗ FAIL');

        // Test 5: Pulse
        console.log('\nTest 5: Pulsing YELLOW (1 second)');
        await tjbot.pulse('yellow', 1);
        const result5 = await confirm({ message: 'Did the LED pulse YELLOW?' });
        console.log(result5 ? '✓ PASS' : '✗ FAIL');

        // Turn off LED
        console.log('\nTurning off LED...');
        await tjbot.shine('off');

        console.log(formatTitle('LED Test Complete'));
    } catch (error) {
        console.error('\n✗ Error during LED test:', error.message);
        process.exit(1);
    }
}

runTest().catch(console.error);
