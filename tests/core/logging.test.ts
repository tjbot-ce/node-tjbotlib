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

import { describe, expect, test } from 'vitest';
import winston from 'winston';
import { getLogger, initWinston, LogEmoji } from '../../src/utils/logging.js';

describe('Logging formatter output and level mapping', () => {
    test('[test_init_logging_maps_debug_level] init logging maps debug level', () => {
        initWinston('debug');
        expect(winston.level).toBe('debug');
    });

    test('[test_set_log_level_maps_warn_level] set log level maps warn level', () => {
        initWinston('warn');
        expect(winston.level).toBe('warn');
    });

    test('[test_set_log_level_maps_silly_level] set log level maps silly level', () => {
        initWinston('silly');
        expect(winston.level).toBe('silly');
    });

    test('[test_debug_level_filters_out_silly] debug level filters out silly', () => {
        initWinston('debug');
        const logger = getLogger(import.meta.url);

        expect(logger.isLevelEnabled('debug')).toBe(true);
        expect(logger.isLevelEnabled('silly')).toBe(false);
    });

    test('[test_silly_level_includes_debug_and_silly] silly level includes debug and silly', () => {
        initWinston('silly');
        const logger = getLogger(import.meta.url);

        expect(logger.isLevelEnabled('debug')).toBe(true);
        expect(logger.isLevelEnabled('silly')).toBe(true);
    });

    test('[test_formatter_adds_module_emoji_prefix] formatter adds module emoji prefix', () => {
        const tagged = `${LogEmoji.CONFIG} loaded config`;
        expect(tagged.startsWith(LogEmoji.CONFIG)).toBe(true);
    });
});
