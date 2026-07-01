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
import winston from 'winston';
export type TJBotLogLevel = 'error' | 'warn' | 'info' | 'verbose' | 'debug' | 'silly';
export declare enum LogEmoji {
    CAMERA = "\uD83D\uDCF7",
    COLOR = "\uD83C\uDFA8",
    CONFIG = "\u2699\uFE0F",
    GENERAL = "\uD83E\uDD16",
    HARDWARE = "\uD83D\uDD27",
    LED = "\uD83D\uDCA1",
    MIC = "\uD83C\uDFA4",
    MODEL = "\uD83D\uDCE6",
    RPI = "\uD83C\uDF53",
    SERVO = "\uD83E\uDDBE",
    SPEAKER = "\uD83D\uDD08",
    STT = "\uD83E\uDDBB",
    TTS = "\uD83D\uDCAC",
    VISION = "\uD83D\uDC41\uFE0F"
}
/**
 * Initialize Winston with TJBot's default formatter.
 * Safe to call repeatedly; only the first call configures transports/format.
 * Later calls only update log level.
 */
export declare function initWinston(level?: TJBotLogLevel): void;
/**
 * Get a module-scoped logger that lets the formatter infer a category emoji.
 */
export declare function getLogger(moduleName: string): winston.Logger;
//# sourceMappingURL=logging.d.ts.map