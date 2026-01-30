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
import { type TJBotConfigSchema, type LogConfig, type HardwareConfig, type ListenConfig, type SeeConfig, type ShineConfig, type SpeakConfig, type WaveConfig } from './config-types.js';
/**
 * TJBotConfig manages loading and parsing TJBot configuration from TOML files.
 * It provides access to configuration via structured interfaces.
 */
export declare class TJBotConfig {
    readonly config: TJBotConfigSchema;
    readonly log: LogConfig;
    readonly hardware: HardwareConfig;
    readonly listen: ListenConfig;
    readonly see: SeeConfig;
    readonly shine: ShineConfig;
    readonly speak: SpeakConfig;
    readonly wave: WaveConfig;
    readonly recipe: Record<string, unknown>;
    private defaultConfigPath;
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
    constructor(overrideConfig?: Partial<TJBotConfigSchema>);
    /**
     * Load internal default TOML configuration
     * @private
     */
    private loadInternalConfig;
    /**
     * Deep merge multiple configuration objects.
     * Later objects override earlier ones, but only at the leaf level.
     * @private
     */
    private deepMerge;
    /**
     * Check if a value is a plain object (not null, not array, not Date, etc.)
     * @private
     */
    private isPlainObject;
    /**
     * Clean configuration object to remove Symbol keys and non-string properties
     * @private
     */
    private cleanConfig;
    /**
     * Get raw configuration value by path (for backward compatibility)
     */
    get(key: string): unknown;
    /**
     * Validate vision local backend models are properly configured
     * @private
     */
    private validateVisionLocalModels;
}
