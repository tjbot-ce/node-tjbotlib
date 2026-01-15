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
import { tjbotConfigSchema, } from './config-types.js';
import { TJBotError } from '../utils/errors.js';
/**
 * TJBotConfig manages loading and parsing TJBot configuration from TOML files.
 * It provides access to configuration via structured interfaces.
 */
export class TJBotConfig {
    /**
     * Creates a TJBotConfig instance.
     * Loads configuration in the following order:
     * 1. Default configuration from tjbot.default.toml
     * 2. Local tjbot.toml file (if it exists)
     * 3. Override configuration (if provided)
     *
     * @param overrideConfig Optional configuration object to overlay on top of loaded config
     */
    constructor(overrideConfig) {
        this.defaultConfigPath = './tjbot.default.toml';
        // Load default config
        const defaultConfig = this._loadInternalConfig(this.defaultConfigPath);
        let userConfig = {};
        // Load local tjbot.toml if it exists
        const localConfigPath = 'tjbot.toml';
        try {
            if (fs.existsSync(localConfigPath) && fs.lstatSync(localConfigPath).isFile()) {
                winston.debug(`loading local TJBot configuration from ${localConfigPath}`);
                const configData = fs.readFileSync(localConfigPath, 'utf8');
                userConfig = TOML.parse(configData);
                userConfig = this._cleanConfig(userConfig);
            }
            else {
                winston.debug(`local configuration file ${localConfigPath} not found, using defaults`);
            }
        }
        catch (err) {
            throw new TJBotError(`unable to read tjbot configuration from ${localConfigPath}: ${err}`);
        }
        const mergedConfig = { ...defaultConfig, ...userConfig, ...overrideConfig };
        try {
            this.config = tjbotConfigSchema.parse(mergedConfig);
        }
        catch (err) {
            throw new TJBotError('invalid TJBot configuration', { cause: err });
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
    _loadInternalConfig(configFile) {
        const configPath = resolve(configFile, import.meta.url);
        winston.debug(`loading default TJBot configuration TOML from ${configPath}`);
        let config = {};
        try {
            const configData = fs.readFileSync(new URL(configPath), 'utf8');
            config = TOML.parse(configData);
            // Clean up the config to remove any Symbol keys
            config = this._cleanConfig(config);
        }
        catch (err) {
            throw new TJBotError(`unable to read TOML from ${configFile}: ${err}`);
        }
        return config;
    }
    /**
     * Clean configuration object to remove Symbol keys and non-string properties
     * @private
     */
    _cleanConfig(obj) {
        if (obj === null || obj === undefined) {
            return obj;
        }
        if (Array.isArray(obj)) {
            return obj.map((item) => this._cleanConfig(item));
        }
        if (typeof obj === 'object') {
            const cleaned = {};
            for (const key in obj) {
                // Only include string keys
                if (typeof key === 'string' && Object.prototype.hasOwnProperty.call(obj, key)) {
                    const value = obj[key];
                    cleaned[key] = this._cleanConfig(value);
                }
                else {
                    // Warn about non-string keys being removed
                    winston.warn(`Removing non-string configuration key from TOML: ${typeof key === 'symbol' ? 'Symbol' : typeof key}`);
                }
            }
            return cleaned;
        }
        return obj;
    }
    /**
     * Get raw configuration value by path (for backward compatibility)
     */
    get(key) {
        return this.config[key];
    }
}
//# sourceMappingURL=tjbot-config.js.map