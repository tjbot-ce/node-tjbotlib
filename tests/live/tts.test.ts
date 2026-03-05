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
import { TJBot } from '../../src/tjbot.js';
import { initWinston } from './utils.js';
import { isCommandAvailable, formatTitle, formatSection } from './utils.js';
import { ModelRegistry } from '../../src/utils/index.js';
import type { SpeakConfig, TTSBackendConfig } from '../../src/config/config-types.js';

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

interface AlsaDevice {
    name: string;
    value: string;
}

interface BackendConfig {
    model?: string;
    voice?: string;
}

async function runTest(): Promise<void> {
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
    const handleSigint = (): void => {
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
                if (error instanceof Error && (error.message.includes('SIGINT') || error.name === 'ExitPromptError')) {
                    isShuttingDown = true;
                    break;
                }
                if (!isShuttingDown) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    console.error(`${COLORS.YELLOW}Error during synthesis: ${errorMessage}${COLORS.RESET}`);
                }
            }
        }
    } catch (error) {
        if (!isShuttingDown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('✗ TTS test failed:', errorMessage);
            process.exit(1);
        }
    }
}

function listAlsaOutputDevices(): AlsaDevice[] {
    try {
        const output = execSync('aplay -l', { encoding: 'utf8' });
        const devices: AlsaDevice[] = [];
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

async function promptOutputDeviceChoice(): Promise<string | undefined> {
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

async function promptBackendChoice(): Promise<string> {
    const backendKey = await select({
        message: 'Select a TTS backend to test:',
        choices: BACKENDS.map((b) => ({ name: b.label, value: b.id })),
        default: 'local',
    });
    return backendKey;
}

async function promptBackendSpecificOptions(selectedBackend: string): Promise<BackendConfig> {
    const config: BackendConfig = {};

    if (selectedBackend === 'local') {
        return await promptSherpaONNXTTSOptions();
    } else if (selectedBackend === 'ibm-watson-tts') {
        return await promptIBMWatsonTTSOptions();
    } else if (selectedBackend === 'google-cloud-tts') {
        return await promptGoogleCloudTTSOptions();
    } else if (selectedBackend === 'azure-tts') {
        return await promptAzureTTSOptions();
    }

    return config;
}

async function promptSherpaONNXTTSOptions(): Promise<BackendConfig> {
    // Get available models from metadata
    const registry = ModelRegistry.getInstance();
    const models = registry.lookupModels('tts', false);

    // Get installed models once (outside the loop for efficiency)
    const tjbot = TJBot.getInstance();
    const installedModelKeys = tjbot.getLocalModels('tts', true);
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
        message: 'Select a Sherpa-ONNX TTS model:',
        choices,
        default: models[0].key,
    });

    const selectedModel = models.find((m) => m.key === modelKey);
    return {
        model: selectedModel?.key,
    };
}

async function promptIBMWatsonTTSOptions(): Promise<BackendConfig> {
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

async function promptGoogleCloudTTSOptions(): Promise<BackendConfig> {
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

async function promptAzureTTSOptions(): Promise<BackendConfig> {
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

async function promptTextToSynthesize(): Promise<string> {
    // Use command-line prompts with inquirer
    const { input } = await import('@inquirer/prompts');
    const text = await input({
        message: 'Enter text to speak (or press Ctrl+C to exit):',
        default: 'Hello, this is TJBot!',
    });
    return text;
}

function buildSpeakConfig(selectedBackend: string, backendConfig: BackendConfig, outputDevice?: string): SpeakConfig {
    // Build backend-specific configuration dynamically based on selected backend
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const backend: Record<string, any> = {
        type: selectedBackend,
    };

    // Build backend-specific configuration
    if (selectedBackend === 'local') {
        backend.local = {
            model: backendConfig.model,
        };
    } else if (selectedBackend === 'ibm-watson-tts') {
        backend['ibm-watson-tts'] = {
            voice: backendConfig.voice,
        };
    } else if (selectedBackend === 'google-cloud-tts') {
        backend['google-cloud-tts'] = {
            voice: backendConfig.voice,
        };
    } else if (selectedBackend === 'azure-tts') {
        backend['azure-tts'] = {
            voice: backendConfig.voice,
        };
    }

    // Assemble and return the final SpeakConfig
    const speakConfig: SpeakConfig = {
        backend: backend as TTSBackendConfig,
    };

    // Add output device if specified
    if (outputDevice) {
        speakConfig.device = outputDevice;
    }

    return speakConfig;
}

runTest().catch(console.error);
