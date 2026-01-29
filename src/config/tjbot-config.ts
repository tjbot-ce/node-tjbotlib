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
import TOML from '@iarna/toml';
import { resolve } from 'import-meta-resolve';
import winston from 'winston';
import {
    tjbotConfigSchema,
    type TJBotConfigSchema,
    type LogConfig,
    type HardwareConfig,
    type ListenConfig,
    type SeeConfig,
    type ShineConfig,
    type SpeakConfig,
    type WaveConfig,
} from './config-types.js';
import { TJBotError, ModelRegistry } from '../utils/index.js';

/**
 * TJBotConfig manages loading and parsing TJBot configuration from TOML files.
 * It provides access to configuration via structured interfaces.
 */
export class TJBotConfig {
    readonly config: TJBotConfigSchema;
    readonly log: LogConfig;
    readonly hardware: HardwareConfig;
    readonly listen: ListenConfig;
    readonly see: SeeConfig;
    readonly shine: ShineConfig;
    readonly speak: SpeakConfig;
    readonly wave: WaveConfig;
    readonly recipe: Record<string, unknown>;

    private defaultConfigPath: string = './tjbot.default.toml';

    /**
     * Creates a TJBotConfig instance.
     * Loads configuration in the following order:
     * 1. Default configuration from tjbot.default.toml
     * 2. Local tjbot.toml file (if it exists)
     * 3. Override configuration (if provided)
     * 4. Register user-defined models from [models] section
     *
     * @param overrideConfig Optional configuration object to overlay on top of loaded config
     */
    constructor(overrideConfig?: Partial<TJBotConfigSchema>) {
        // Load default config
        const defaultConfig = this.loadInternalConfig(this.defaultConfigPath);
        let userConfig: TOML.JsonMap = {};

        // Load local tjbot.toml if it exists
        const localConfigPath = 'tjbot.toml';
        try {
            if (fs.existsSync(localConfigPath) && fs.lstatSync(localConfigPath).isFile()) {
                winston.debug(`loading local TJBot configuration from ${localConfigPath}`);
                const configData = fs.readFileSync(localConfigPath, 'utf8');
                userConfig = TOML.parse(configData);
                userConfig = this.cleanConfig(userConfig) as TOML.JsonMap;
            } else {
                winston.debug(`local configuration file ${localConfigPath} not found, using defaults`);
            }
        } catch (err) {
            throw new TJBotError(`unable to read tjbot configuration from ${localConfigPath}: ${err}`);
        }

        const mergedConfig = { ...defaultConfig, ...userConfig, ...overrideConfig };

        try {
            this.config = tjbotConfigSchema.parse(mergedConfig);
        } catch (err) {
            throw new TJBotError('invalid TJBot configuration', { cause: err as Error });
        }

        // Register user-defined models from [models] section
        if (this.config.models && Array.isArray(this.config.models)) {
            const registry = ModelRegistry.getInstance();
            for (const model of this.config.models) {
                registry.registerModel(model as never);
                winston.debug(`Registered custom model: ${model.key}`);
            }
        }

        // Validate vision backend models if local backend is configured
        if (this.config.see?.backend?.type === 'local' && this.config.see?.backend?.local) {
            this.validateVisionLocalModels(this.config.see.backend.local);
        }

        this.log = this.config.log ?? {};
        this.hardware = this.config.hardware ?? {};
        this.listen = this.config.listen ?? {};
        this.see = this.config.see ?? {};
        this.shine = this.config.shine ?? {};
        this.speak = this.config.speak ?? {};
        this.wave = this.config.wave ?? {};
        this.recipe = this.config.recipe ?? {};
    }

    /**
     * Load internal default TOML configuration
     * @private
     */
    private loadInternalConfig(configFile: string): TJBotConfigSchema {
        const configPath = resolve(configFile, import.meta.url);
        winston.debug(`loading default TJBot configuration TOML from ${configPath}`);

        let config: TOML.JsonMap = {};
        try {
            const configData = fs.readFileSync(new URL(configPath), 'utf8');
            config = TOML.parse(configData);
            // Clean up the config to remove any Symbol keys
            config = this.cleanConfig(config) as TOML.JsonMap;
        } catch (err) {
            throw new TJBotError(`unable to read TOML from ${configFile}: ${err}`);
        }

        return config as TJBotConfigSchema;
    }

    /**
     * Clean configuration object to remove Symbol keys and non-string properties
     * @private
     */
    private cleanConfig(obj: unknown): unknown {
        if (obj === null || obj === undefined) {
            return obj;
        }

        if (Array.isArray(obj)) {
            return obj.map((item) => this.cleanConfig(item));
        }

        if (typeof obj === 'object') {
            const cleaned: Record<string, unknown> = {};
            for (const key in obj) {
                // Only include string keys
                if (typeof key === 'string' && Object.prototype.hasOwnProperty.call(obj, key)) {
                    const value = (obj as Record<string, unknown>)[key];
                    cleaned[key] = this.cleanConfig(value);
                } else {
                    // Warn about non-string keys being removed
                    winston.warn(
                        `Removing non-string configuration key from TOML: ${typeof key === 'symbol' ? 'Symbol' : typeof key}`
                    );
                }
            }
            return cleaned;
        }

        return obj;
    }

    /**
     * Get raw configuration value by path (for backward compatibility)
     */
    get(key: string): unknown {
        return (this.config as Record<string, unknown>)[key];
    }

    /**
     * Validate vision local backend models are properly configured
     * @private
     */
    private validateVisionLocalModels(localConfig: Record<string, unknown>): void {
        const { detectionModel, classificationModel, faceDetectionModel } = localConfig as {
            detectionModel?: string;
            classificationModel?: string;
            faceDetectionModel?: string;
        };

        // Models are validated at runtime when engine initializes
        // This is a basic validation that models are specified
        const models = [
            { field: 'detectionModel', value: detectionModel, expectedKind: 'detection' },
            { field: 'classificationModel', value: classificationModel, expectedKind: 'classification' },
            { field: 'faceDetectionModel', value: faceDetectionModel, expectedKind: 'face-detection' },
        ];

        for (const model of models) {
            if (!model.value) {
                throw new TJBotError(`Vision local backend: ${model.field} is required but not configured`);
            }
        }
    }
}
