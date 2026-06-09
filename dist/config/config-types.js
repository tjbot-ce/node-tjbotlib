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
import fs from 'fs';
import { createRequire } from 'module';
import yaml from 'js-yaml';
export const STT_BACKEND_TYPES = Object.freeze([
    'none',
    'local',
    'ibm-watson-stt',
    'google-cloud-stt',
    'azure-stt',
]);
export const TTS_BACKEND_TYPES = Object.freeze([
    'none',
    'local',
    'ibm-watson-tts',
    'google-cloud-tts',
    'azure-tts',
]);
export const SEE_BACKEND_TYPES = Object.freeze([
    'none',
    'local',
    'google-cloud-vision',
    'azure-vision',
]);
function loadConfigSchema() {
    const schemaUrl = new URL('./vendor/tjbot-config.schema.yaml', import.meta.url);
    const schemaSource = fs.readFileSync(schemaUrl, 'utf8');
    const loadedSchema = yaml.load(schemaSource);
    if (!loadedSchema || typeof loadedSchema !== 'object' || Array.isArray(loadedSchema)) {
        throw new Error('TJBot config schema is invalid or empty');
    }
    return loadedSchema;
}
const configSchema = loadConfigSchema();
const require = createRequire(import.meta.url);
const Ajv = require('ajv').default;
const addFormats = require('ajv-formats').default;
const ajv = new Ajv({
    allErrors: true,
    allowUnionTypes: true,
    strict: false,
});
addFormats(ajv);
const compiledTJBotConfigValidator = ajv.compile(configSchema);
function formatValidationErrors(errors) {
    return ajv.errorsText(errors, { separator: '; ' });
}
function createEnumParser(values, label) {
    return {
        parse(value) {
            const result = this.safeParse(value);
            if (!result.success) {
                throw result.error;
            }
            return result.data;
        },
        safeParse(value) {
            if (typeof value === 'string' && values.includes(value)) {
                return { success: true, data: value };
            }
            return {
                success: false,
                error: new Error(`Invalid ${label}. Expected one of: ${values.join(', ')}`),
            };
        },
    };
}
function createValidatorParser(validate, label) {
    return {
        parse(value) {
            const result = this.safeParse(value);
            if (!result.success) {
                throw result.error;
            }
            return result.data;
        },
        safeParse(value) {
            if (validate(value)) {
                return { success: true, data: value };
            }
            return {
                success: false,
                error: new Error(`Invalid ${label}: ${formatValidationErrors(validate.errors)}`),
            };
        },
    };
}
export function getConfigSchema() {
    return configSchema;
}
export function isSTTBackendType(value) {
    return typeof value === 'string' && STT_BACKEND_TYPES.includes(value);
}
export function isTTSBackendType(value) {
    return typeof value === 'string' && TTS_BACKEND_TYPES.includes(value);
}
export function isSeeBackendType(value) {
    return typeof value === 'string' && SEE_BACKEND_TYPES.includes(value);
}
export const sttBackendTypeSchema = createEnumParser(STT_BACKEND_TYPES, 'STT backend type');
export const ttsBackendTypeSchema = createEnumParser(TTS_BACKEND_TYPES, 'TTS backend type');
export const seeBackendTypeSchema = createEnumParser(SEE_BACKEND_TYPES, 'vision backend type');
export const tjbotConfigSchema = createValidatorParser(compiledTJBotConfigValidator, 'TJBot configuration');
export const validateTJBotConfig = compiledTJBotConfigValidator;
export function getSTTBackendConfig(backendConfig, backendType) {
    if (!backendConfig) {
        return {};
    }
    switch (backendType) {
        case 'none':
            return {};
        case 'local':
            return (backendConfig.local ?? {});
        case 'ibm-watson-stt':
            return (backendConfig['ibm-watson-stt'] ?? {});
        case 'google-cloud-stt':
            return (backendConfig['google-cloud-stt'] ?? {});
        case 'azure-stt':
            return (backendConfig['azure-stt'] ?? {});
        default:
            return {};
    }
}
export function getTTSBackendConfig(backendConfig, backendType) {
    if (!backendConfig) {
        return {};
    }
    switch (backendType) {
        case 'none':
            return {};
        case 'local':
            return (backendConfig.local ?? {});
        case 'ibm-watson-tts':
            return (backendConfig['ibm-watson-tts'] ?? {});
        case 'google-cloud-tts':
            return (backendConfig['google-cloud-tts'] ?? {});
        case 'azure-tts':
            return (backendConfig['azure-tts'] ?? {});
        default:
            return {};
    }
}
export function getSeeBackendConfig(backendConfig, backendType) {
    if (!backendConfig) {
        return {};
    }
    switch (backendType) {
        case 'none':
            return {};
        case 'local':
            return (backendConfig.local ?? {});
        case 'google-cloud-vision':
            return (backendConfig['google-cloud-vision'] ?? {});
        case 'azure-vision':
            return (backendConfig['azure-vision'] ?? {});
        default:
            return {};
    }
}
//# sourceMappingURL=config-types.js.map