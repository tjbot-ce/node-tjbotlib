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
import { resolveCredentialsPath } from '../../utils/backends/azure.js';
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
    client;
    async initialize(config) {
        const credentialsPath = resolveCredentialsPath(config?.credentialsPath);
        // Set credentials path in environment variable
        if (credentialsPath) {
            process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialsPath;
        }
        this.client = new TextToSpeechClient();
        winston.info(`${EMO} Google Cloud TTS engine initialized`);
        winston.debug(`${EMO} Initialized GoogleCloudTTSEngine with config:
            credentialsPath: ${credentialsPath}`);
    }
    async synthesize(text) {
        if (!this.client) {
            throw new TJBotError('Google Cloud TTS client not initialized. Call initialize() first.');
        }
        this.validateText(text);
        try {
            const voiceName = this.config?.voice;
            if (!voiceName) {
                throw new TJBotError('Google Cloud TTS voice not specified. Provide voice in speak config.');
            }
            const languageCode = this.config?.languageCode;
            if (!languageCode) {
                throw new TJBotError('Google Cloud TTS languageCode not specified. Provide languageCode in speak config.');
            }
            winston.verbose(`${EMO} Synthesizing speech with Google Cloud TTS (voice=${voiceName}, language=${languageCode})`);
            const request = {
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
            const audioBuffer = Buffer.from(response.audioContent);
            // Google returns raw LINEAR16 PCM, we need to add WAV header
            const wavBuffer = this.addWavHeader(audioBuffer, 24000, 1, 16);
            winston.debug(`${EMO} Google Cloud TTS synthesis complete: ${wavBuffer.length} bytes`);
            return wavBuffer;
        }
        catch (error) {
            throw new TJBotError('Google Cloud TTS synthesis failed', { cause: error });
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
    addWavHeader(pcmData, sampleRate, numChannels, bitsPerSample) {
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
//# sourceMappingURL=google-cloud-tts.js.map