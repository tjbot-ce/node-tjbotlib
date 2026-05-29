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
import { Readable } from 'stream';
import { TJBotError } from '../../src/utils/index.js';
import { STTController } from '../../src/stt/stt.js';
import { createSTTEngine } from '../../src/stt/stt-engine.js';
import { SherpaONNXSTTEngine } from '../../src/stt/backends/sherpa-onnx-stt.js';
import { inferLocalModelFlavor, inferSTTMode, toModelType } from '../../src/stt/stt-utils.js';

vi.mock('../../src/stt/stt-engine.js', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../src/stt/stt-engine.js')>();
    return {
        ...actual,
        createSTTEngine: vi.fn(),
    };
});

class FakeCircularBuffer {
    private data: number[] = [];

    constructor(_size: number) {}

    push(samples: Float32Array): void {
        this.data.push(...samples);
    }

    size(): number {
        return this.data.length;
    }

    head(): number {
        return 0;
    }

    get(_head: number, windowSize: number): Float32Array {
        return new Float32Array(this.data.slice(0, windowSize));
    }

    pop(windowSize: number): void {
        this.data = this.data.slice(windowSize);
    }
}

vi.mock('sherpa-onnx-node', () => ({
    default: {
        CircularBuffer: FakeCircularBuffer,
        Vad: class {
            config = { sampleRate: 16000, sileroVad: { windowSize: 512 } };
            acceptWaveform(_samples: Float32Array): void {}
            isEmpty(): boolean {
                return true;
            }
            front(): { samples: Float32Array } {
                return { samples: new Float32Array() };
            }
            pop(): void {}
        },
    },
}));

function makeMicStub() {
    return {
        start: vi.fn(),
        pause: vi.fn(),
        getInputStream: vi.fn(() => ({ on: vi.fn() })),
    };
}

function pcmChunk(amplitude: number, numSamples = 3200): Buffer {
    const buf = Buffer.alloc(numSamples * 2);
    const value = Math.max(-32768, Math.min(32767, Math.floor(amplitude * 32767)));
    for (let i = 0; i < numSamples; i += 1) {
        buf.writeInt16LE(value, i * 2);
    }
    return buf;
}

function streamFromChunks(chunks: Buffer[]): Readable {
    return Readable.from(chunks);
}

async function createEngineForInit(options?: { vadEnabled?: boolean; includeVadConfig?: boolean; kind?: string }) {
    const includeVadConfig = options?.includeVadConfig ?? true;
    const vadEnabled = options?.vadEnabled ?? true;
    const kind = options?.kind ?? 'offline-moonshine';

    const backendConfig: Record<string, unknown> = { model: 'moonshine-tiny' };
    if (includeVadConfig) {
        backendConfig.vad = { enabled: vadEnabled, model: 'silero-vad' };
    }

    const engine = new SherpaONNXSTTEngine(backendConfig as never);

    const fakeRegistry = {
        loadModel: vi.fn(async (key: string) => {
            if (key === 'silero-vad') {
                return {
                    key: 'silero-vad',
                    folder: 'silero-vad',
                    required: ['silero_vad.onnx'],
                };
            }
            return {
                key: 'moonshine-tiny',
                folder: 'moonshine-tiny',
                kind,
            };
        }),
        getModelCacheDirForType: vi.fn((type: string) => `/tmp/models/${type}`),
    };

    (engine as unknown as { registry: unknown }).registry = fakeRegistry;

    vi.spyOn(
        engine as unknown as { pathsForModelKey: (key: string, baseDir: string) => unknown },
        'pathsForModelKey'
    ).mockReturnValue({ encoder: '/tmp/encoder.onnx', tokens: '/tmp/tokens.txt' });

    vi.spyOn(engine as unknown as { setupRecognizer: () => Promise<void> }, 'setupRecognizer').mockResolvedValue();

    await engine.initialize();
    return engine;
}

describe('STT controller backend initialization and transcription behavior', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    test('[test_stt_local_backend_uses_mocked_engine_module] stt local backend uses mocked engine module', async () => {
        const engine = { initialize: vi.fn(), transcribe: vi.fn() };
        vi.mocked(createSTTEngine).mockResolvedValue(engine as never);
        const mic = makeMicStub();
        const controller = new STTController(mic as never);

        await controller.initialize({ backend: { type: 'local' } });
        expect(createSTTEngine).toHaveBeenCalledWith({ backend: { type: 'local' } });
    });

    test('[test_stt_ibm_backend_uses_mocked_engine_module] stt ibm backend uses mocked engine module', async () => {
        const engine = { initialize: vi.fn(), transcribe: vi.fn() };
        vi.mocked(createSTTEngine).mockResolvedValue(engine as never);
        const controller = new STTController(makeMicStub() as never);

        await controller.initialize({ backend: { type: 'ibm-watson-stt' } });
        expect(createSTTEngine).toHaveBeenCalledWith({ backend: { type: 'ibm-watson-stt' } });
    });

    test('[test_stt_google_backend_uses_mocked_engine_module] stt google backend uses mocked engine module', async () => {
        const engine = { initialize: vi.fn(), transcribe: vi.fn() };
        vi.mocked(createSTTEngine).mockResolvedValue(engine as never);
        const controller = new STTController(makeMicStub() as never);

        await controller.initialize({ backend: { type: 'google-cloud-stt' } });
        expect(createSTTEngine).toHaveBeenCalledWith({ backend: { type: 'google-cloud-stt' } });
    });

    test('[test_stt_azure_backend_uses_mocked_engine_module] stt azure backend uses mocked engine module', async () => {
        const engine = { initialize: vi.fn(), transcribe: vi.fn() };
        vi.mocked(createSTTEngine).mockResolvedValue(engine as never);
        const controller = new STTController(makeMicStub() as never);

        await controller.initialize({ backend: { type: 'azure-stt' } });
        expect(createSTTEngine).toHaveBeenCalledWith({ backend: { type: 'azure-stt' } });
    });

    test('[test_stt_backend_init_error_propagates] stt backend init error propagates', async () => {
        vi.mocked(createSTTEngine).mockRejectedValue(new TJBotError('backend init failed'));
        const controller = new STTController(makeMicStub() as never);

        await expect(controller.initialize({ backend: { type: 'local' } })).rejects.toThrow('backend init failed');
    });

    test('[test_stt_unknown_backend_is_not_initialized] stt unknown backend is not initialized', async () => {
        vi.mocked(createSTTEngine).mockRejectedValue(new TJBotError('Unknown STT backend type: bogus'));
        const controller = new STTController(makeMicStub() as never);

        await expect(controller.initialize({ backend: { type: 'bogus' as never } })).rejects.toThrow('Unknown STT');
        await expect(controller.transcribe()).rejects.toThrow('not initialized');
    });

    test('[test_stt_none_backend_raises_disabled_error] stt none backend raises disabled error', async () => {
        const engine = {
            initialize: vi.fn(),
            transcribe: vi.fn().mockRejectedValue(new TJBotError('STT is disabled.')),
        };
        vi.mocked(createSTTEngine).mockResolvedValue(engine as never);
        const controller = new STTController(makeMicStub() as never);

        await controller.initialize({ backend: { type: 'none' } });
        await expect(controller.transcribe()).rejects.toThrow('STT is disabled');
    });

    test('[test_stt_transcribe_delegates_to_engine] stt transcribe delegates to engine', async () => {
        const engine = {
            initialize: vi.fn(),
            transcribe: vi.fn().mockResolvedValue('hello'),
        };
        vi.mocked(createSTTEngine).mockResolvedValue(engine as never);
        const mic = makeMicStub();
        const controller = new STTController(mic as never);

        await controller.initialize({ backend: { type: 'local' } });
        const transcript = await controller.transcribe();

        expect(transcript).toBe('hello');
        expect(engine.transcribe).toHaveBeenCalledTimes(1);
        expect(mic.start).toHaveBeenCalledTimes(1);
        expect(mic.pause).toHaveBeenCalledTimes(1);
    });

    test('[test_stt_transcribe_manages_microphone_lifecycle_and_retries_on_no_speech] stt transcribe manages microphone lifecycle and retries on no speech', async () => {
        const noSpeech = new TJBotError('No speech', { code: 'stt.no-speech' });
        const engine = {
            initialize: vi.fn(),
            transcribe: vi.fn().mockRejectedValueOnce(noSpeech).mockResolvedValueOnce('final transcript'),
        };
        vi.mocked(createSTTEngine).mockResolvedValue(engine as never);
        const mic = makeMicStub();
        const controller = new STTController(mic as never);

        await controller.initialize({ backend: { type: 'local' } });
        const transcript = await controller.transcribe();

        expect(transcript).toBe('final transcript');
        expect(mic.start).toHaveBeenCalledTimes(2);
        expect(mic.pause).toHaveBeenCalledTimes(2);
    });
});

describe('Sherpa ONNX STT VAD routing and decoding behavior', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    test('[test_false_when_no_vad_path] false when no vad path', () => {
        const engine = new SherpaONNXSTTEngine({
            model: 'moonshine-tiny',
            vad: { enabled: true, model: 'silero-vad' },
        } as never);
        (engine as unknown as { modelInfo: { kind: string }; vadPath?: string }).modelInfo = {
            kind: 'offline-moonshine',
        };
        (engine as unknown as { vadPath?: string }).vadPath = undefined;

        const out = (engine as unknown as { shouldUseVad: () => boolean }).shouldUseVad();
        expect(out).toBe(false);
    });

    test('[test_false_when_vad_disabled_in_config] false when vad disabled in config', () => {
        const engine = new SherpaONNXSTTEngine({
            model: 'moonshine-tiny',
            vad: { enabled: false, model: 'silero-vad' },
        } as never);

        (engine as unknown as { modelInfo: { kind: string }; vadPath?: string }).modelInfo = {
            kind: 'offline-moonshine',
        };
        (engine as unknown as { vadPath?: string }).vadPath = '/tmp/silero_vad.onnx';

        const out = (engine as unknown as { shouldUseVad: () => boolean }).shouldUseVad();
        expect(out).toBe(false);
    });

    test('[test_true_when_vad_path_set_and_enabled] true when vad path set and enabled', () => {
        const engine = new SherpaONNXSTTEngine({
            model: 'moonshine-tiny',
            vad: { enabled: true, model: 'silero-vad' },
        } as never);

        (engine as unknown as { modelInfo: { kind: string }; vadPath?: string }).modelInfo = {
            kind: 'offline-moonshine',
        };
        (engine as unknown as { vadPath?: string }).vadPath = '/tmp/silero_vad.onnx';

        const out = (engine as unknown as { shouldUseVad: () => boolean }).shouldUseVad();
        expect(out).toBe(true);
    });

    test('[test_false_for_streaming_model] false for streaming model', () => {
        const engine = new SherpaONNXSTTEngine({
            model: 'zipformer-en',
            vad: { enabled: true, model: 'silero-vad' },
        } as never);

        (engine as unknown as { modelInfo: { kind: string }; vadPath?: string }).modelInfo = {
            kind: 'streaming-zipformer',
        };
        (engine as unknown as { vadPath?: string }).vadPath = '/tmp/silero_vad.onnx';

        const out = (engine as unknown as { shouldUseVad: () => boolean }).shouldUseVad();
        expect(out).toBe(false);
    });

    test('[test_vad_path_set_when_config_provided] vad path set when config provided', async () => {
        const engine = await createEngineForInit({
            includeVadConfig: true,
            vadEnabled: true,
            kind: 'offline-moonshine',
        });
        expect((engine as unknown as { vadPath?: string }).vadPath).toContain('silero_vad.onnx');
    });

    test('[test_vad_path_not_set_without_config] vad path not set without config', async () => {
        const engine = await createEngineForInit({ includeVadConfig: false, kind: 'offline-moonshine' });
        expect((engine as unknown as { vadPath?: string }).vadPath).toBeUndefined();
    });

    test('[test_vad_path_not_set_when_disabled] vad path not set when disabled', async () => {
        const engine = await createEngineForInit({
            includeVadConfig: true,
            vadEnabled: false,
            kind: 'offline-moonshine',
        });
        expect((engine as unknown as { vadPath?: string }).vadPath).toBeUndefined();
    });

    test('[test_routes_to_energy_when_no_vad] routes to energy when no vad', async () => {
        const engine = new SherpaONNXSTTEngine({ model: 'moonshine-tiny' } as never);
        (engine as unknown as { vadPath?: string }).vadPath = undefined;
        const energySpy = vi
            .spyOn(
                engine as unknown as { transcribeOfflineEnergy: (...args: unknown[]) => Promise<string> },
                'transcribeOfflineEnergy'
            )
            .mockResolvedValue('energy');
        const vadSpy = vi
            .spyOn(
                engine as unknown as { transcribeOfflineWithVad: (...args: unknown[]) => Promise<string> },
                'transcribeOfflineWithVad'
            )
            .mockResolvedValue('vad');

        const out = await (
            engine as unknown as {
                transcribeOffline: (
                    s: Readable,
                    r: number,
                    useVad: boolean,
                    o: Record<string, unknown>
                ) => Promise<string>;
            }
        ).transcribeOffline(streamFromChunks([]), 16000, false, {});

        expect(out).toBe('energy');
        expect(energySpy).toHaveBeenCalled();
        expect(vadSpy).not.toHaveBeenCalled();
    });

    test('[test_routes_to_vad_when_vad_path_set] routes to vad when vad path set', async () => {
        const engine = new SherpaONNXSTTEngine({ model: 'moonshine-tiny' } as never);
        (engine as unknown as { vadPath?: string }).vadPath = '/tmp/silero_vad.onnx';
        const energySpy = vi
            .spyOn(
                engine as unknown as { transcribeOfflineEnergy: (...args: unknown[]) => Promise<string> },
                'transcribeOfflineEnergy'
            )
            .mockResolvedValue('energy');
        const vadSpy = vi
            .spyOn(
                engine as unknown as { transcribeOfflineWithVad: (...args: unknown[]) => Promise<string> },
                'transcribeOfflineWithVad'
            )
            .mockResolvedValue('vad');

        const out = await (
            engine as unknown as {
                transcribeOffline: (
                    s: Readable,
                    r: number,
                    useVad: boolean,
                    o: Record<string, unknown>
                ) => Promise<string>;
            }
        ).transcribeOffline(streamFromChunks([]), 16000, true, {});

        expect(out).toBe('vad');
        expect(vadSpy).toHaveBeenCalled();
        expect(energySpy).not.toHaveBeenCalled();
    });

    test('[test_routes_to_online_for_zipformer] routes to online for zipformer', async () => {
        const engine = await createEngineForInit({ includeVadConfig: false, kind: 'streaming-zipformer' });
        (engine as unknown as { recognizer: unknown }).recognizer = {};

        const streamingSpy = vi
            .spyOn(
                engine as unknown as { transcribeStreaming: (...args: unknown[]) => Promise<string> },
                'transcribeStreaming'
            )
            .mockResolvedValue('zip');
        const offlineSpy = vi
            .spyOn(
                engine as unknown as { transcribeOffline: (...args: unknown[]) => Promise<string> },
                'transcribeOffline'
            )
            .mockResolvedValue('offline');

        const out = await engine.transcribe(streamFromChunks([]), {});
        expect(out).toBe('zip');
        expect(streamingSpy).toHaveBeenCalled();
        expect(offlineSpy).not.toHaveBeenCalled();
    });

    test('[test_returns_empty_string_for_silent_audio] returns empty string for silent audio', async () => {
        const engine = new SherpaONNXSTTEngine({ model: 'moonshine-tiny' } as never);
        (engine as unknown as { recognizer: unknown }).recognizer = {
            createStream: () => ({ acceptWaveform: () => {} }),
            decode: () => {},
            getResult: () => ({ text: '' }),
        };

        const out = await (
            engine as unknown as {
                transcribeOfflineEnergy: (s: Readable, rate: number, o: Record<string, unknown>) => Promise<string>;
            }
        ).transcribeOfflineEnergy(streamFromChunks([pcmChunk(0), pcmChunk(0), pcmChunk(0)]), 16000, {});

        expect(out).toBe('');
    });

    test('[test_decodes_speech_after_silence_threshold] decodes speech after silence threshold', async () => {
        const engine = new SherpaONNXSTTEngine({ model: 'moonshine-tiny' } as never);
        (engine as unknown as { recognizer: unknown }).recognizer = {
            createStream: () => ({ acceptWaveform: () => {} }),
            decode: () => {},
            getResult: () => ({ text: 'hello world' }),
        };

        const speech = pcmChunk(0.5, 3200);
        const silence = pcmChunk(0, 3200);
        const out = await (
            engine as unknown as {
                transcribeOfflineEnergy: (s: Readable, rate: number, o: Record<string, unknown>) => Promise<string>;
            }
        ).transcribeOfflineEnergy(streamFromChunks([speech, silence, silence, silence, silence]), 16000, {});

        expect(out).toBe('hello world');
    });

    test('[test_partial_callback_called_on_decode] partial callback called on decode', async () => {
        const engine = new SherpaONNXSTTEngine({ model: 'moonshine-tiny' } as never);
        (engine as unknown as { recognizer: unknown }).recognizer = {
            createStream: () => ({ acceptWaveform: () => {} }),
            decode: () => {},
            getResult: () => ({ text: 'hello world' }),
        };

        const partialCb = vi.fn();
        const silence = pcmChunk(0, 3200);
        const speech = pcmChunk(0.5, 3200);

        await (
            engine as unknown as {
                transcribeOfflineEnergy: (
                    s: Readable,
                    rate: number,
                    o: { onPartialResult?: (t: string) => void; onFinalResult?: (t: string) => void }
                ) => Promise<string>;
            }
        ).transcribeOfflineEnergy(streamFromChunks([speech, silence, silence, silence, silence]), 16000, {
            onPartialResult: partialCb,
        });

        expect(partialCb).toHaveBeenCalledWith('hello world');
    });

    test('[test_returns_empty_when_no_segments] returns empty when no segments', async () => {
        const engine = await createEngineForInit({
            includeVadConfig: true,
            vadEnabled: true,
            kind: 'offline-moonshine',
        });
        (engine as unknown as { recognizer: unknown }).recognizer = {
            createStream: () => ({ acceptWaveform: () => {} }),
            decode: () => {},
            getResult: () => ({ text: '' }),
        };
        (engine as unknown as { vadPath?: string }).vadPath = '/tmp/silero_vad.onnx';

        vi.spyOn(engine as unknown as { createSileroVad: (p: string) => unknown }, 'createSileroVad').mockReturnValue({
            config: { sampleRate: 16000, sileroVad: { windowSize: 512 } },
            acceptWaveform: () => {},
            isEmpty: () => true,
            front: () => ({ samples: new Float32Array() }),
            pop: () => {},
        });

        const out = await (
            engine as unknown as {
                transcribeOfflineWithVad: (s: Readable, rate: number, o: Record<string, unknown>) => Promise<string>;
            }
        ).transcribeOfflineWithVad(streamFromChunks([pcmChunk(0)]), 16000, {});

        expect(out).toBe('');
    });

    test('[test_decodes_segment_when_vad_fires] decodes segment when vad fires', async () => {
        const engine = await createEngineForInit({
            includeVadConfig: true,
            vadEnabled: true,
            kind: 'offline-moonshine',
        });
        (engine as unknown as { recognizer: unknown }).recognizer = {
            createStream: () => ({ acceptWaveform: () => {} }),
            decode: () => {},
            getResult: () => ({ text: 'hello world' }),
        };
        (engine as unknown as { vadPath?: string }).vadPath = '/tmp/silero_vad.onnx';

        let fired = false;
        vi.spyOn(engine as unknown as { createSileroVad: (p: string) => unknown }, 'createSileroVad').mockReturnValue({
            config: { sampleRate: 16000, sileroVad: { windowSize: 512 } },
            acceptWaveform: () => {},
            isEmpty: () => fired,
            front: () => ({ samples: new Float32Array([0, 1, 0]) }),
            pop: () => {
                fired = true;
            },
        });

        const finalCb = vi.fn();
        const out = await (
            engine as unknown as {
                transcribeOfflineWithVad: (
                    s: Readable,
                    rate: number,
                    o: { onFinalResult?: (t: string) => void }
                ) => Promise<string>;
            }
        ).transcribeOfflineWithVad(streamFromChunks([pcmChunk(0.3)]), 16000, { onFinalResult: finalCb });

        expect(out).toBe('hello world');
        expect(finalCb).toHaveBeenCalledWith('hello world');
    });
});

describe('STT utility model flavor and mode inference', () => {
    test('[test_ibm_watson_interim] ibm watson interim', () => {
        const mode = inferSTTMode({
            backend: { type: 'ibm-watson-stt', 'ibm-watson-stt': { interimResults: true } },
        });
        expect(mode).toBe('streaming');
    });

    test('[test_ibm_watson_no_interim] ibm watson no interim', () => {
        const mode = inferSTTMode({
            backend: { type: 'ibm-watson-stt', 'ibm-watson-stt': { interimResults: false } },
        });
        expect(mode).toBe('offline');
    });

    test('[test_google_cloud_interim] google cloud interim', () => {
        const mode = inferSTTMode({
            backend: { type: 'google-cloud-stt', 'google-cloud-stt': { interimResults: true } },
        });
        expect(mode).toBe('streaming');
    });

    test('[test_google_cloud_no_interim] google cloud no interim', () => {
        const mode = inferSTTMode({
            backend: { type: 'google-cloud-stt', 'google-cloud-stt': { interimResults: false } },
        });
        expect(mode).toBe('offline');
    });

    test('[test_azure_always_offline] azure always offline', () => {
        const mode = inferSTTMode({ backend: { type: 'azure-stt' } });
        expect(mode).toBe('offline');
    });

    test('[test_local_whisper_offline] local whisper offline', () => {
        const mode = inferSTTMode({
            backend: { type: 'local', local: { model: 'whisper-small' } },
        });
        expect(mode).toBe('offline');
    });

    test('[test_local_zipformer_streaming] local zipformer streaming', () => {
        const mode = inferSTTMode({
            backend: { type: 'local', local: { model: 'zipformer-en' } },
        });
        expect(mode).toBe('streaming');
    });

    test('[test_moonshine] moonshine', () => {
        expect(inferLocalModelFlavor('moonshine-tiny')).toBe('offline-moonshine');
    });

    test('[test_whisper] whisper', () => {
        expect(inferLocalModelFlavor('whisper-base')).toBe('offline-whisper');
    });

    test('[test_zipformer] zipformer', () => {
        expect(inferLocalModelFlavor('zipformer-en')).toBe('streaming-zipformer');
    });

    test('[test_transducer] transducer', () => {
        expect(inferLocalModelFlavor('transducer-en')).toBe('streaming-zipformer');
    });

    test('[test_paraformer] paraformer', () => {
        expect(inferLocalModelFlavor('paraformer-en')).toBe('streaming-paraformer');
    });

    test('[test_url_fallback] url fallback', () => {
        expect(inferLocalModelFlavor(undefined, 'https://example.com/models/whisper-small.tar.bz2')).toBe(
            'offline-whisper'
        );
    });

    test('[test_offline_flavors] offline flavors', () => {
        expect(toModelType('offline-whisper')).toBe('offline');
        expect(toModelType('offline-moonshine')).toBe('offline');
    });

    test('[test_streaming_flavors] streaming flavors', () => {
        expect(toModelType('streaming-zipformer')).toBe('streaming');
        expect(toModelType('streaming-paraformer')).toBe('streaming');
    });

    test('[test_unknown_raises] unknown raises', () => {
        expect(() => inferLocalModelFlavor('mystery-model')).toThrow(TJBotError);
    });

    test('[test_unknown_backend_raises] unknown backend raises', () => {
        expect(() => inferSTTMode({ backend: { type: 'none' } })).toThrow(TJBotError);
    });

    test('[test_none_backend_offline] none backend offline', () => {
        expect(() => inferSTTMode({ backend: { type: 'none' } })).toThrow('Unknown STT backend type');
    });
});
