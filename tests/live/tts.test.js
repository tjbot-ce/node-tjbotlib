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

import { execSync } from 'node:child_process';
import { select } from '@inquirer/prompts';
import { TJBot } from '../../dist/tjbot.js';
import { initWinston } from './utils.js';
import { isCommandAvailable, formatTitle, formatSection } from './utils.js';

// ANSI color codes for output
const COLORS = {
    RESET: '\x1b[0m',
    DIM: '\x1b[2m',
    BRIGHT: '\x1b[1m',
    GREEN: '\x1b[32m',
    YELLOW: '\x1b[33m',
};

const LOG_LEVEL = 'info';

const BACKENDS = [
    { id: 'local', label: 'Local (Sherpa ONNX)' },
    { id: 'ibm-watson-tts', label: 'IBM Watson' },
    { id: 'google-cloud-tts', label: 'Google Cloud' },
    { id: 'azure-tts', label: 'Azure' },
];

async function runTest() {
    initWinston(LOG_LEVEL);
    console.log(formatTitle('TJBot TTS Test'));

    // Check for required dependencies
    console.log(formatSection('Checking audio playback tools'));
    const hasAplay = isCommandAvailable('aplay');
    if (!hasAplay) {
        console.log('✗ aplay command not available (required for audio playback)');
        console.log('\nInstall with:');
        console.log('  sudo apt-get install alsa-utils\n');
        process.exit(1);
    }
    console.log('✓ aplay command available\n');

    // Get user configuration choices
    const selectedBackend = await promptBackendChoice();
    const backendConfig = await promptBackendSpecificOptions(selectedBackend);
    const selectedOutputDevice = await promptOutputDeviceChoice();

    // Build speak config from user choices
    const speakConfig = buildSpeakConfig(selectedBackend, backendConfig, selectedOutputDevice);

    console.log(
        formatSection(
            `Initializing TJBot with TTS (${selectedBackend}${backendConfig.model ? `: ${backendConfig.model}` : ''})`
        )
    );

    // Instantiate TJBot with override configuration
    const tjbot = await TJBot.getInstance().initialize({
        log: { level: LOG_LEVEL },
        hardware: { [TJBot.Hardware.SPEAKER]: true },
        speak: speakConfig,
    });
    console.log('✓ TJBot initialized');

    console.log(formatSection('Interactive test'));
    console.log('Enter text to speak. Press Ctrl+C to finish the test.');

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

    // Main loop: continuously synthesize until user presses Ctrl+C
    try {
        while (!isShuttingDown) {
            try {
                // Prompt user for text to synthesize
                const text = await promptTextToSynthesize();

                if (text) {
                    console.log(`${COLORS.BRIGHT}${COLORS.GREEN}Speaking: ${text}${COLORS.RESET}`);
                    await tjbot.speak(text);
                    console.log('');
                }
            } catch (error) {
                // Check if this is a SIGINT error from the prompt
                if (error?.message?.includes('SIGINT') || error?.name === 'ExitPromptError') {
                    isShuttingDown = true;
                    break;
                }
                if (!isShuttingDown) {
                    console.error(`${COLORS.YELLOW}Error during synthesis: ${error?.message ?? error}${COLORS.RESET}`);
                }
            }
        }
    } catch (error) {
        if (!isShuttingDown) {
            console.error('✗ TTS test failed:', error?.message ?? error);
            process.exit(1);
        }
    }
}

function listAlsaOutputDevices() {
    try {
        const output = execSync('aplay -l', { encoding: 'utf8' });
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

async function promptOutputDeviceChoice() {
    const devices = listAlsaOutputDevices();
    if (devices.length === 0) {
        console.log('ℹ️  No ALSA output devices found; using system default');
        return undefined;
    }
    if (devices.length === 1) {
        console.log(`ℹ️  Using single ALSA output device: ${devices[0].name}`);
        return devices[0].value;
    }

    const deviceValue = await select({
        message: 'Select audio output device:',
        choices: devices,
        default: devices[0].value,
    });
    return deviceValue;
}

async function promptBackendChoice() {
    const backendKey = await select({
        message: 'Select a TTS backend to test:',
        choices: BACKENDS.map((b) => ({ name: b.label, value: b.id })),
        default: 'local',
    });
    return backendKey;
}

async function promptBackendSpecificOptions(selectedBackend, manager) {
    const config = {};

    if (selectedBackend === 'local') {
        return await promptSherpaONNXTTSOptions(manager);
    } else if (selectedBackend === 'ibm-watson-tts') {
        return await promptIBMWatsonTTSOptions();
    } else if (selectedBackend === 'google-cloud-tts') {
        return await promptGoogleCloudTTSOptions();
    } else if (selectedBackend === 'azure-tts') {
        return await promptAzureTTSOptions();
    }

    return config;
}

async function promptSherpaONNXTTSOptions() {
    // Get available models from metadata
    const tjbot = TJBot.getInstance();
    const models = await tjbot.supportedTTSModels();

    // Get installed models once (outside the loop for efficiency)
    // Note: installedTTSModels() returns an array of model keys (strings), not full model objects
    const installedModelKeys = tjbot.installedTTSModels();
    const installedModels = new Set(installedModelKeys);
    const choices = models.map((m) => {
        const downloaded = installedModels.has(m.model);
        const status = downloaded ? '✓ downloaded' : '✗ not downloaded';
        return {
            name: `${m.label || m.model} ${status}`,
            value: m.model,
            short: m.label || m.model,
        };
    });

    const modelKey = await select({
        message: 'Select a Sherpa-ONNX TTS model:',
        choices,
        default: models[0].model,
    });

    const selectedModel = models.find((m) => m.model === modelKey);
    return {
        model: selectedModel.model,
    };
}

async function promptIBMWatsonTTSOptions() {
    const voice = await select({
        message: 'Select IBM Watson voice:',
        choices: [
            { name: 'Allison (US, Female)', value: 'en-US_AllisonV3Voice' },
            { name: 'Emily (US, Female)', value: 'en-US_EmilyV3Voice' },
            { name: 'Henry (US, Male)', value: 'en-US_HenryV3Voice' },
            { name: 'Kevin (US, Male)', value: 'en-US_KevinV3Voice' },
            { name: 'Olivia (US, Female)', value: 'en-US_OliviaV3Voice' },
        ],
        default: 'en-US_AllisonV3Voice',
    });

    return { voice };
}

async function promptGoogleCloudTTSOptions() {
    const voice = await select({
        message: 'Select Google Cloud voice:',
        choices: [
            { name: 'Joelle (US, Female, Neural2)', value: 'en-US-Neural2-J' },
            { name: 'Jude (US, Male, Neural2)', value: 'en-US-Neural2-D' },
            { name: 'Journey (US, Non-Binary, Neural2)', value: 'en-US-Neural2-E' },
            { name: 'Aria (US, Female, Studio)', value: 'en-US-Studio-A' },
            { name: 'Essence (US, Non-Binary, Studio)', value: 'en-US-Studio-B' },
        ],
        default: 'en-US-Neural2-J',
    });

    return { voice };
}

async function promptAzureTTSOptions() {
    const voice = await select({
        message: 'Select Azure voice:',
        choices: [
            { name: 'Jenny (US, Female)', value: 'en-US-JennyNeural' },
            { name: 'Guy (US, Male)', value: 'en-US-GuyNeural' },
            { name: 'Aria (US, Female)', value: 'en-US-AriaNeural' },
            { name: 'Ryan (US, Male)', value: 'en-US-RyanNeural' },
            { name: 'Zira (US, Female)', value: 'en-US-ZiraNeural' },
        ],
        default: 'en-US-JennyNeural',
    });

    return { voice };
}

async function promptTextToSynthesize() {
    // Use command-line prompts with inquirer
    const { input } = await import('@inquirer/prompts');
    const text = await input({
        message: 'Enter text to speak (or press Ctrl+C to exit):',
        default: 'Hello, this is TJBot!',
    });
    return text;
}

function buildSpeakConfig(selectedBackend, backendConfig, outputDevice) {
    const baseConfig = {
        backend: {
            type: selectedBackend,
        },
    };

    // Add output device if specified
    if (outputDevice) {
        baseConfig.device = outputDevice;
    }

    // Build backend-specific configuration
    if (selectedBackend === 'local') {
        baseConfig.backend.local = {
            model: backendConfig.model,
        };
    } else if (selectedBackend === 'ibm-watson-tts') {
        baseConfig.backend['ibm-watson-tts'] = {
            voice: backendConfig.voice,
        };
    } else if (selectedBackend === 'google-cloud-tts') {
        baseConfig.backend['google-cloud-tts'] = {
            voice: backendConfig.voice,
        };
    } else if (selectedBackend === 'azure-tts') {
        baseConfig.backend['azure-tts'] = {
            voice: backendConfig.voice,
        };
    }

    return baseConfig;
}

runTest().catch(console.error);
