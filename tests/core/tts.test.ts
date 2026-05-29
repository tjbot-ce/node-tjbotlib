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

import { beforeEach, describe, expect, test, vi } from 'vitest';
import { TJBotError } from '../../src/utils/index.js';
import { TTSController } from '../../src/tts/tts.js';
import { createTTSEngine } from '../../src/tts/tts-engine.js';

vi.mock('../../src/tts/tts-engine.js', () => ({
    createTTSEngine: vi.fn(),
}));

function makeSpeakerStub() {
    return {
        playAudio: vi.fn().mockResolvedValue(undefined),
    };
}

describe('TTS controller backend initialization and synthesis behavior', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    test('[test_tts_local_backend_uses_mocked_engine_module] tts local backend uses mocked engine module', async () => {
        const engine = { initialize: vi.fn(), synthesize: vi.fn().mockResolvedValue(Buffer.from('wav')) };
        vi.mocked(createTTSEngine).mockResolvedValue(engine as never);
        const controller = new TTSController(makeSpeakerStub() as never);

        await controller.initialize({ backend: { type: 'local' } });
        expect(createTTSEngine).toHaveBeenCalledWith({ backend: { type: 'local' } });
    });

    test('[test_tts_ibm_backend_uses_mocked_engine_module] tts ibm backend uses mocked engine module', async () => {
        const engine = { initialize: vi.fn(), synthesize: vi.fn().mockResolvedValue(Buffer.from('wav')) };
        vi.mocked(createTTSEngine).mockResolvedValue(engine as never);
        const controller = new TTSController(makeSpeakerStub() as never);

        await controller.initialize({ backend: { type: 'ibm-watson-tts' } });
        expect(createTTSEngine).toHaveBeenCalledWith({ backend: { type: 'ibm-watson-tts' } });
    });

    test('[test_tts_google_backend_uses_mocked_engine_module] tts google backend uses mocked engine module', async () => {
        const engine = { initialize: vi.fn(), synthesize: vi.fn().mockResolvedValue(Buffer.from('wav')) };
        vi.mocked(createTTSEngine).mockResolvedValue(engine as never);
        const controller = new TTSController(makeSpeakerStub() as never);

        await controller.initialize({ backend: { type: 'google-cloud-tts' } });
        expect(createTTSEngine).toHaveBeenCalledWith({ backend: { type: 'google-cloud-tts' } });
    });

    test('[test_tts_azure_backend_uses_mocked_engine_module] tts azure backend uses mocked engine module', async () => {
        const engine = { initialize: vi.fn(), synthesize: vi.fn().mockResolvedValue(Buffer.from('wav')) };
        vi.mocked(createTTSEngine).mockResolvedValue(engine as never);
        const controller = new TTSController(makeSpeakerStub() as never);

        await controller.initialize({ backend: { type: 'azure-tts' } });
        expect(createTTSEngine).toHaveBeenCalledWith({ backend: { type: 'azure-tts' } });
    });

    test('[test_tts_backend_init_error_propagates] tts backend init error propagates', async () => {
        vi.mocked(createTTSEngine).mockRejectedValue(new TJBotError('tts init failed'));
        const controller = new TTSController(makeSpeakerStub() as never);

        await expect(controller.initialize({ backend: { type: 'local' } })).rejects.toThrow('tts init failed');
    });

    test('[test_tts_unknown_backend_leaves_engine_uninitialized] tts unknown backend leaves engine uninitialized', async () => {
        vi.mocked(createTTSEngine).mockRejectedValue(new TJBotError('Unknown TTS backend type: bogus'));
        const controller = new TTSController(makeSpeakerStub() as never);

        await expect(controller.initialize({ backend: { type: 'bogus' as never } })).rejects.toThrow('Unknown TTS');
        await expect(controller.speak('hello')).rejects.toThrow('not initialized');
    });

    test('[test_tts_none_backend_raises_disabled_error] tts none backend raises disabled error', async () => {
        const engine = {
            initialize: vi.fn(),
            synthesize: vi.fn().mockRejectedValue(new TJBotError('TTS is disabled.')),
        };
        vi.mocked(createTTSEngine).mockResolvedValue(engine as never);
        const controller = new TTSController(makeSpeakerStub() as never);

        await controller.initialize({ backend: { type: 'none' } });
        await expect(controller.speak('hello')).rejects.toThrow('TTS is disabled');
    });

    test('[test_tts_speak_raises_when_engine_not_initialized] tts speak raises when engine not initialized', async () => {
        const controller = new TTSController(makeSpeakerStub() as never);
        await expect(controller.speak('hello')).rejects.toThrow('not initialized');
    });

    test('[test_tts_speak_delegates_to_engine_and_cleans_temp_file] tts speak delegates to engine and cleans temp file', async () => {
        const speaker = makeSpeakerStub();
        const engine = {
            initialize: vi.fn(),
            synthesize: vi.fn().mockResolvedValue(Buffer.from('RIFF....WAVE')),
        };
        vi.mocked(createTTSEngine).mockResolvedValue(engine as never);
        const controller = new TTSController(speaker as never);

        await controller.initialize({ backend: { type: 'local' } });
        await controller.speak('hello world');

        expect(engine.synthesize).toHaveBeenCalledWith('hello world');
        expect(speaker.playAudio).toHaveBeenCalledTimes(1);
    });

    test('[test_tts_speak_delegates_to_engine_and_cleans_temp_file] tts transcribe delegates to engine', async () => {
        const speaker = makeSpeakerStub();
        const engine = {
            initialize: vi.fn(),
            synthesize: vi.fn().mockResolvedValue(Buffer.from('RIFF....WAVE')),
        };
        vi.mocked(createTTSEngine).mockResolvedValue(engine as never);
        const controller = new TTSController(speaker as never);

        await controller.initialize({ backend: { type: 'local' } });
        await controller.speak('hello world');

        expect(engine.synthesize).toHaveBeenCalledWith('hello world');
        expect(speaker.playAudio).toHaveBeenCalledTimes(1);
    });

    test('[test_tts_transcribe_manages_microphone_lifecycle_and_retries_on_no_speech] tts transcribe manages microphone lifecycle and retries on no speech', async () => {
        const speaker = makeSpeakerStub();
        const disabled = new TJBotError('TTS is disabled.', { code: 'tts.disabled' });
        const engine = {
            initialize: vi.fn(),
            synthesize: vi.fn().mockRejectedValueOnce(disabled).mockResolvedValueOnce(Buffer.from('WAVE')),
        };
        vi.mocked(createTTSEngine).mockResolvedValue(engine as never);
        const controller = new TTSController(speaker as never);

        await controller.initialize({ backend: { type: 'local' } });
        await expect(controller.speak('hello')).rejects.toThrow('TTS is disabled');
        await controller.speak('hello');

        expect(engine.synthesize).toHaveBeenCalledTimes(2);
        expect(speaker.playAudio).toHaveBeenCalledTimes(1);
    });

    test('[test_tts_unknown_backend_leaves_engine_uninitialized] tts unknown backend is not initialized', async () => {
        vi.mocked(createTTSEngine).mockRejectedValue(new TJBotError('Unknown TTS backend type: bogus'));
        const controller = new TTSController(makeSpeakerStub() as never);

        await expect(controller.initialize({ backend: { type: 'bogus' as never } })).rejects.toThrow('Unknown TTS');
        await expect(controller.speak('hello')).rejects.toThrow('not initialized');
    });
});
