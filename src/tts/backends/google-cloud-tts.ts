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

import { TextToSpeechClient, protos as ttsProtos } from '@google-cloud/text-to-speech';
import winston from 'winston';
import type { TTSBackendGoogleCloudConfig } from '../../config/config-types.js';
import { loadGoogleCloudCredentials } from '../../utils/credentials.js';
import { TJBotError } from '../../utils/index.js';
import { LogEmoji } from '../../utils/logging.js';
import { TTSEngine } from '../tts-engine.js';

const EMO = LogEmoji.TTS;

/**
 * Google Cloud Text-to-Speech Engine
 *
 * Cloud-based speech synthesis using Google Cloud Text-to-Speech API.
 * Requires Google Cloud credentials JSON file to be configured.
 * @public
 */
export class GoogleCloudTTSEngine extends TTSEngine {
    private client?: TextToSpeechClient;

    async initialize(): Promise<void> {
        const config = this.config as TTSBackendGoogleCloudConfig;
        const credentials = loadGoogleCloudCredentials(config?.credentialsPath);

        if (!config?.voice) {
            throw new TJBotError(
                'Google Cloud TTS voice not specified. Provide voice in speak.backend.google-cloud-tts config.'
            );
        }
        if (!config?.languageCode) {
            throw new TJBotError(
                'Google Cloud TTS languageCode not specified. Provide languageCode in speak.backend.google-cloud-tts config.'
            );
        }

        this.client = new TextToSpeechClient();

        winston.info(`${EMO} Google Cloud TTS engine initialized`);
        winston.debug(`${EMO} Initialized GoogleCloudTTSEngine with config:
            voice: ${config?.voice},
            languageCode: ${config?.languageCode},
            credentialsPath: ${credentials.credentialsPath}`);
    }

    async synthesize(text: string): Promise<Buffer> {
        if (!this.client) {
            throw new TJBotError('Google Cloud TTS client not initialized. Call initialize() first.');
        }

        this.validateText(text);

        try {
            const voice = this.config?.voice as string;
            const languageCode = this.config?.languageCode as string;

            winston.verbose(
                `${EMO} Synthesizing speech with Google Cloud TTS (voice=${voice}, language=${languageCode})`
            );

            const request: ttsProtos.google.cloud.texttospeech.v1.ISynthesizeSpeechRequest = {
                input: { text },
                voice: {
                    name: voice,
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

            winston.debug(`${EMO} Google Cloud TTS synthesis complete: ${wavBuffer.length} bytes`);
            return wavBuffer;
        } catch (error) {
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
