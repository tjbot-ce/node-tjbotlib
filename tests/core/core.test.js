/**
 * Copyright 2016-2025 IBM Corp. All Rights Reserved.
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

import { expect, test } from 'vitest';
import TJBot from '../../dist/tjbot.js';
import { Hardware } from '../../dist/utils/index.js';

test('instantiate TJBot', () => {
    const tjbot = new TJBot();
    expect(tjbot).toBeDefined();
});

test('TJBot initializes with no hardware configured', () => {
    const tjbot = new TJBot({ hardware: {} });
    expect(tjbot).toBeDefined();
});

test('TJBot initializes with all hardware configured', () => {
    const tjbot = new TJBot({
        hardware: {
            camera: true,
            microphone: true,
            speaker: true,
            servo: true,
            led_neopixel: false,
            led_common_anode: false,
        },
    });
    expect(tjbot).toBeDefined();
});

test('make sure TJBot class exports the Hardware list correctly', () => {
    const hardware = Object.keys(TJBot.Hardware);
    expect(hardware.length > 0);
    expect(hardware.indexOf(Hardware.CAMERA) > -1);
    expect(hardware.indexOf(Hardware.LED_COMMON_ANODE) > -1);
    expect(hardware.indexOf(Hardware.LED_NEOPIXEL) > -1);
    expect(hardware.indexOf(Hardware.MICROPHONE) > -1);
    expect(hardware.indexOf(Hardware.SERVO) > -1);
    expect(hardware.indexOf(Hardware.SPEAKER) > -1);
    expect(TJBot.Hardware.CAMERA === Hardware.CAMERA);
    expect(TJBot.Hardware.LED_COMMON_ANODE === Hardware.LED_COMMON_ANODE);
    expect(TJBot.Hardware.LED_NEOPIXEL === Hardware.LED_NEOPIXEL);
    expect(TJBot.Hardware.MICROPHONE === Hardware.MICROPHONE);
    expect(TJBot.Hardware.SERVO === Hardware.SERVO);
    expect(TJBot.Hardware.SPEAKER === Hardware.SPEAKER);
});

test('TJBot applies configuration overrides', () => {
    // Pass custom config as override
    const customConfig = {
        log: {
            level: 'debug',
        },
        listen: {
            microphoneRate: 48000,
            microphoneChannels: 1,
        },
        see: {
            cameraResolution: [1280, 720],
            verticalFlip: true,
            horizontalFlip: true,
        },
        speak: {
            backend: {
                type: 'local',
                local: {
                    model: 'vits-piper-en_US-lessac-low',
                    modelUrl:
                        'https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/vits-piper-en_US-lessac-low/model.onnx',
                },
            },
        },
        wave: {
            gpioChip: 1,
            servoPin: 17,
        },
    };

    // Create TJBot with override config
    const tjbot = new TJBot(customConfig);

    // Verify that the instance was created
    expect(tjbot).toBeDefined();
    expect(tjbot.config).toBeDefined();

    // Verify specific config values were applied from the override
    const logConfig = tjbot.config.log;
    expect(logConfig).toBeDefined();
    expect(logConfig.level).toBe('debug');

    const listenConfig = tjbot.config.listen;
    expect(listenConfig).toBeDefined();
    expect(listenConfig.microphoneRate).toBe(48000);
    expect(listenConfig.microphoneChannels).toBe(1);

    const seeConfig = tjbot.config.see;
    expect(seeConfig).toBeDefined();
    expect(Array.isArray(seeConfig.cameraResolution)).toBe(true);
    expect(seeConfig.cameraResolution[0]).toBe(1280);
    expect(seeConfig.cameraResolution[1]).toBe(720);
    expect(seeConfig.verticalFlip).toBe(true);
    expect(seeConfig.horizontalFlip).toBe(true);

    const speakConfig = tjbot.config.speak;
    expect(speakConfig).toBeDefined();
    expect(speakConfig.backend).toBeDefined();
    expect(speakConfig.backend.type).toBe('local');
    expect(speakConfig.backend.local.model).toBe('vits-piper-en_US-lessac-low');
    expect(speakConfig.backend.local.modelUrl).toBe(
        'https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/vits-piper-en_US-lessac-low/model.onnx'
    );

    const waveConfig = tjbot.config.wave;
    expect(waveConfig).toBeDefined();
    expect(waveConfig.gpioChip).toBe(1);
    expect(waveConfig.servoPin).toBe(17);
});
