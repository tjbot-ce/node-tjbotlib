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

import { select } from '@inquirer/prompts';
import { execSync } from 'child_process';
import { TJBot } from '../../dist/tjbot.js';
import { initWinston, formatTitle, formatSection } from './utils.js';
import { inferSTTMode } from '../../dist/stt/stt-utils.js';

// ANSI color codes for output
const COLORS = {
    RESET: '\x1b[0m',
    DIM: '\x1b[2m',
    BRIGHT: '\x1b[1m',
    GREEN: '\x1b[32m',
    BLUE: '\x1b[34m',
    YELLOW: '\x1b[33m',
};

const LOG_LEVEL = 'info';

const BACKENDS = [
    { key: 'local', label: 'Local (Sherpa-ONNX)' },
    { key: 'ibm-watson-stt', label: 'IBM Watson' },
    { key: 'google-cloud-stt', label: 'Google Cloud' },
    { key: 'azure-stt', label: 'Azure' },
];

async function runTest() {
    // Note: Sherpa-ONNX native stderr output is suppressed at the module level
    initWinston(LOG_LEVEL);
    console.log(formatTitle('TJBot STT Test'));

    // Get user configuration choices
    const selectedBackend = await promptBackendChoice();
    const backendConfig = await promptBackendSpecificOptions(selectedBackend);
    const selectedDevice = await promptDeviceChoice();

    // Build listen config from user choices
    const listenConfig = buildListenConfig(selectedBackend, backendConfig, selectedDevice);

    console.log(
        formatSection(
            `Initializing TJBot with STT (${selectedBackend}${backendConfig.model ? `: ${backendConfig.model}` : ''})`
        )
    );

    // Instantiate TJBot with override configuration
    const tjbot = TJBot.getInstance();
    await tjbot.initialize({ log: { level: LOG_LEVEL }, hardware: { microphone: true }, listen: listenConfig });
    console.log('✓ TJBot initialized');

    console.log(formatSection('Interactive test'));
    console.log('Start speaking. Press Ctrl+C when you are finished with the test.');

    let lastPartial = '';
    const onPartialResult = (text) => {
        if (text && text !== lastPartial) {
            lastPartial = text;
            console.log(`${COLORS.DIM}Partial: ${text}${COLORS.RESET}`);
        }
    };

    const onFinalResult = (text) => {
        if (text) {
            console.log(`${COLORS.BRIGHT}${COLORS.GREEN}Final: ${text}${COLORS.RESET}`);
        }
    };

    // Detect if model is streaming or offline
    const mode = inferSTTMode(listenConfig);
    const isStreaming = mode === 'streaming' || mode === 'streaming-zipformer';

    // Setup graceful shutdown
    let isShuttingDown = false;
    const handleSigint = () => {
        if (!isShuttingDown) {
            isShuttingDown = true;
            console.log(`\n${COLORS.YELLOW}Shutting down...${COLORS.RESET}`);
            process.exit(0);
        }
    };

    process.on('SIGINT', handleSigint);

    // Main loop: continuously listen until user presses Ctrl+C
    try {
        while (!isShuttingDown) {
            try {
                // Streaming models use callbacks, offline models return final result
                if (isStreaming) {
                    await tjbot.listen(onPartialResult, onFinalResult);
                } else {
                    const transcript = await tjbot.listen();
                    if (transcript) {
                        console.log(`${COLORS.BRIGHT}${COLORS.GREEN}Final: ${transcript}${COLORS.RESET}`);
                    }
                }
                lastPartial = '';
            } catch (error) {
                if (!isShuttingDown) {
                    console.error(
                        `${COLORS.YELLOW}Error during transcription: ${error?.message ?? error}${COLORS.RESET}`
                    );
                    // Exit if there's an error (likely backend initialization failure)
                    isShuttingDown = true;
                    process.exit(1);
                }
            }
        }
    } catch (error) {
        if (!isShuttingDown) {
            console.error('✗ STT test failed:', error?.message ?? error);
            process.exit(1);
        }
    }
}

function listAlsaDevices() {
    try {
        const output = execSync('arecord -l', { encoding: 'utf8' });
        const devices = [];
        const lines = output.split('\n');

        for (const line of lines) {
            // Parse: "card 2: Device [USB PnP Sound Device], device 0: USB Audio [USB Audio]"
            const match = line.match(/card (\d+):.*?\[(.+?)\].*device (\d+):.*?\[(.+?)\]/);
            if (match) {
                const card = match[1];
                const cardName = match[2];
                const device = match[3];
                const deviceName = match[4];
                const value = `plughw:${card},${device}`;
                const name = `Card ${card}: ${cardName} (Device ${device}: ${deviceName})`;
                devices.push({ name, value });
            }
        }

        return devices;
    } catch (_err) {
        return [];
    }
}

async function promptDeviceChoice() {
    const devices = listAlsaDevices();
    if (devices.length === 0) {
        console.log('ℹ️  No ALSA devices found; using system default');
        return undefined;
    }
    if (devices.length === 1) {
        console.log(`ℹ️  Using single ALSA device: ${devices[0].name}`);
        return devices[0].value;
    }

    const deviceValue = await select({
        message: 'Select audio input device:',
        choices: devices,
        default: devices[0].value,
    });
    return deviceValue;
}

async function promptBackendChoice() {
    const backendKey = await select({
        message: 'Select an STT backend to test:',
        choices: BACKENDS.map((b) => ({ name: b.label, value: b.key })),
        default: 'local',
    });
    return backendKey;
}

async function promptBackendSpecificOptions(selectedBackend, manager) {
    const config = {};

    if (selectedBackend === 'local') {
        return await promptSherpaONNXOptions(manager);
    } else if (selectedBackend === 'ibm-watson-stt') {
        return await promptIBMWatsonOptions();
    } else if (selectedBackend === 'google-cloud-stt') {
        return await promptGoogleCloudOptions();
    } else if (selectedBackend === 'azure-stt') {
        return await promptAzureOptions();
    }

    return config;
}

async function promptSherpaONNXOptions() {
    // Get available models from metadata
    const tjbot = TJBot.getInstance();
    const models = await tjbot.supportedSTTModels();

    // Get installed models once (outside the loop for efficiency)
    // Note: installedSTTModels() returns an array of model keys (strings), not full model objects
    const installedModelKeys = tjbot.installedSTTModels();
    const installedModels = new Set(installedModelKeys);
    const choices = models.map((m) => {
        const downloaded = installedModels.has(m.key);
        const status = downloaded ? '✓ downloaded' : '✗ not downloaded';
        return {
            name: `${m.label || m.key} ${status}`,
            value: m.key,
            short: m.label || m.key,
        };
    });

    const modelKey = await select({
        message: 'Select a Sherpa-ONNX STT model:',
        choices,
        default: models[0].key,
    });

    const selectedModel = models.find((m) => m.key === modelKey);
    const config = {
        model: selectedModel.key,
    };

    // For offline models, ask about VAD
    if (selectedModel.kind.startsWith('offline')) {
        const enableVAD = await select({
            message: 'Enable Voice Activity Detection (VAD) for better endpointing?',
            choices: [
                { name: 'Yes', value: true },
                { name: 'No', value: false },
            ],
            default: true,
        });

        config.vad = { enabled: enableVAD };
    }

    return config;
}

async function promptIBMWatsonOptions() {
    const modelChoice = await select({
        message: 'Select IBM Watson model:',
        choices: [
            { name: 'Multimedia (general audio)', value: 'en-US_Multimedia' },
            { name: 'Telephony (phone/VoIP)', value: 'en-US_Telephony' },
            { name: 'Broadband', value: 'en-US_BroadbandModel' },
            { name: 'Narrowband (8kHz)', value: 'en-US_ShortForm_NarrowbandModel' },
        ],
        default: 'en-US_Multimedia',
    });

    const noiseLevel = await select({
        message: 'Background audio suppression level (0=none, 1=max):',
        choices: [
            { name: 'None (0.0)', value: 0.0 },
            { name: 'Low (0.3)', value: 0.3 },
            { name: 'Medium (0.5)', value: 0.5 },
            { name: 'High (0.8)', value: 0.8 },
            { name: 'Maximum (1.0)', value: 1.0 },
        ],
        default: 0.4,
    });

    return {
        model: modelChoice,
        backgroundAudioSuppression: noiseLevel,
    };
}

async function promptGoogleCloudOptions() {
    const languageCode = await select({
        message: 'Select language:',
        choices: [
            { name: 'English (US)', value: 'en-US' },
            { name: 'English (GB)', value: 'en-GB' },
            { name: 'Spanish (Spain)', value: 'es-ES' },
            { name: 'Spanish (Mexico)', value: 'es-MX' },
            { name: 'French (France)', value: 'fr-FR' },
            { name: 'German', value: 'de-DE' },
            { name: 'Chinese (Mandarin)', value: 'zh-CN' },
            { name: 'Japanese', value: 'ja-JP' },
            { name: 'Korean', value: 'ko-KR' },
        ],
        default: 'en-US',
    });

    const modelType = await select({
        message: 'Select model type:',
        choices: [
            { name: 'Default (general audio)', value: 'default' },
            { name: 'Command and Search', value: 'command_and_search' },
            { name: 'Phone Call', value: 'phone_call' },
            { name: 'Video', value: 'video' },
        ],
        default: 'default',
    });

    return {
        languageCode,
        model: modelType,
    };
}

async function promptAzureOptions() {
    const language = await select({
        message: 'Select language:',
        choices: [
            { name: 'English (US)', value: 'en-US' },
            { name: 'English (GB)', value: 'en-GB' },
            { name: 'Spanish (Spain)', value: 'es-ES' },
            { name: 'Spanish (Mexico)', value: 'es-MX' },
            { name: 'French (France)', value: 'fr-FR' },
            { name: 'German', value: 'de-DE' },
            { name: 'Chinese (Mandarin)', value: 'zh-CN' },
            { name: 'Japanese', value: 'ja-JP' },
            { name: 'Korean', value: 'ko-KR' },
        ],
        default: 'en-US',
    });

    return { language };
}

function buildListenConfig(selectedBackend, backendConfig, device) {
    const baseConfig = {
        microphoneRate: 16000,
        microphoneChannels: 1,
        backend: {
            type: selectedBackend,
        },
    };

    if (device) {
        baseConfig.device = device;
    }

    // Build backend-specific configuration
    if (selectedBackend === 'local') {
        baseConfig.backend.local = {
            model: backendConfig.model,
        };
        if (backendConfig.vad !== undefined) {
            baseConfig.backend.local.vad = backendConfig.vad;
        }
    } else if (selectedBackend === 'ibm-watson-stt') {
        baseConfig.backend['ibm-watson-stt'] = {
            model: backendConfig.model,
            backgroundAudioSuppression: backendConfig.backgroundAudioSuppression,
        };
    } else if (selectedBackend === 'google-cloud-stt') {
        baseConfig.backend['google-cloud-stt'] = {
            languageCode: backendConfig.languageCode,
            model: backendConfig.model,
        };
    } else if (selectedBackend === 'azure-stt') {
        baseConfig.backend['azure-stt'] = {
            language: backendConfig.language,
        };
    }

    return baseConfig;
}

runTest().catch((error) => {
    console.error('✗ STT test failed:', error?.message ?? error);
    process.exit(1);
});
