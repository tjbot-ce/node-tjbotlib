/**
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

import fs from 'fs';
import os from 'os';
import path from 'path';
import { TextToSpeechClient, protos as ttsProtos } from '@google-cloud/text-to-speech';
import winston from 'winston';
import { TTSEngine } from '../tts-engine.js';
import { TJBotError } from '../../utils/index.js';
import type { TTSBackendGoogleCloudConfig } from '../../config/config-types.js';

/**
 * Google Cloud Text-to-Speech Engine
 *
 * Cloud-based speech synthesis using Google Cloud Text-to-Speech API.
 * Requires Google Cloud credentials JSON file to be configured.
 * @public
 */
export class GoogleCloudTTSEngine extends TTSEngine {
    private client: TextToSpeechClient | undefined;

    constructor(config?: TTSBackendGoogleCloudConfig) {
        super(config);
    }

    async initialize(): Promise<void> {
        try {
            const credentialsPath = this.resolveCredentialsPath(
                (this.config as TTSBackendGoogleCloudConfig)?.credentialsPath
            );

            // Set credentials path in environment variable
            if (credentialsPath) {
                process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialsPath;
                winston.debug(`🔈 Using Google Cloud credentials from: ${credentialsPath}`);
            }

            this.client = new TextToSpeechClient();
            winston.info('🔈 Google Cloud TTS engine initialized');
        } catch (error) {
            winston.error('Failed to initialize Google Cloud TTS:', error);
            throw new TJBotError('Failed to initialize Google Cloud TTS engine', { cause: error as Error });
        }
    }

    private resolveCredentialsPath(providedPath?: string): string {
        // If path is explicitly provided, use it
        if (providedPath) {
            if (!fs.existsSync(providedPath)) {
                throw new TJBotError(`Google Cloud credentials file not found at: ${providedPath}`);
            }
            return providedPath;
        }

        // If GOOGLE_APPLICATION_CREDENTIALS is already set, use it
        if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
            const envPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
            if (fs.existsSync(envPath)) {
                return envPath;
            }
        }

        // Check default locations
        const defaultPaths = [
            path.join(process.cwd(), 'google-credentials.json'),
            path.join(os.homedir(), '.tjbot', 'google-credentials.json'),
        ];

        for (const defaultPath of defaultPaths) {
            if (fs.existsSync(defaultPath)) {
                return defaultPath;
            }
        }

        throw new TJBotError(
            'Google Cloud credentials not found. Set GOOGLE_APPLICATION_CREDENTIALS environment variable or place credentials at: ./google-credentials.json or ~/.tjbot/google-credentials.json'
        );
    }

    async synthesize(text: string): Promise<Buffer> {
        this.validateText(text);

        if (!this.client) {
            throw new TJBotError('Google Cloud TTS client not initialized. Call initialize() first.');
        }

        try {
            const voiceName = this.config?.voice as string;
            if (!voiceName) {
                throw new TJBotError('Google Cloud TTS voice not specified. Provide voice in speak config.');
            }
            const languageCode = this.config?.languageCode as string;
            if (!languageCode) {
                throw new TJBotError(
                    'Google Cloud TTS languageCode not specified. Provide languageCode in speak config.'
                );
            }

            winston.debug(`🔈 Synthesizing with Google Cloud TTS: voice=${voiceName}, language=${languageCode}`);

            const request: ttsProtos.google.cloud.texttospeech.v1.ISynthesizeSpeechRequest = {
                input: { text },
                voice: {
                    name: voiceName,
                    languageCode,
                },
                audioConfig: {
                    audioEncoding: ttsProtos.google.cloud.texttospeech.v1.AudioEncoding.LINEAR16,
                    sampleRateHertz: 24000,
                },
            };

            const [response] = await this.client.synthesizeSpeech(request);

            if (!response.audioContent) {
                throw new TJBotError('No audio data returned from Google Cloud TTS');
            }

            // Convert audio content to Buffer
            const audioBuffer = Buffer.from(response.audioContent as Uint8Array);

            // Google returns raw LINEAR16 PCM, we need to add WAV header
            const wavBuffer = this.addWavHeader(audioBuffer, 24000, 1, 16);

            winston.debug(`🔈 Google Cloud TTS synthesis complete: ${wavBuffer.length} bytes`);
            return wavBuffer;
        } catch (error) {
            winston.error('Google Cloud TTS synthesis failed:', error);
            throw new TJBotError('Google Cloud TTS synthesis failed', { cause: error as Error });
        }
    }

    /**
     * Add WAV header to raw PCM audio data
     * @param pcmData - Raw PCM audio data
     * @param sampleRate - Sample rate in Hz
     * @param numChannels - Number of audio channels
     * @param bitsPerSample - Bits per sample (usually 16)
     * @returns Buffer with WAV header prepended
     */
    private addWavHeader(pcmData: Buffer, sampleRate: number, numChannels: number, bitsPerSample: number): Buffer {
        const blockAlign = (numChannels * bitsPerSample) / 8;
        const byteRate = sampleRate * blockAlign;
        const dataSize = pcmData.length;
        const headerSize = 44;
        const fileSize = headerSize + dataSize - 8;

        const header = Buffer.alloc(headerSize);

        // RIFF chunk descriptor
        header.write('RIFF', 0);
        header.writeUInt32LE(fileSize, 4);
        header.write('WAVE', 8);

        // fmt sub-chunk
        header.write('fmt ', 12);
        header.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
        header.writeUInt16LE(1, 20); // AudioFormat (1 for PCM)
        header.writeUInt16LE(numChannels, 22);
        header.writeUInt32LE(sampleRate, 24);
        header.writeUInt32LE(byteRate, 28);
        header.writeUInt16LE(blockAlign, 32);
        header.writeUInt16LE(bitsPerSample, 34);

        // data sub-chunk
        header.write('data', 36);
        header.writeUInt32LE(dataSize, 40);

        return Buffer.concat([header, pcmData]);
    }
}
