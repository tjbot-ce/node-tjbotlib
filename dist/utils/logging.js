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
export var LogEmoji;
(function (LogEmoji) {
    LogEmoji["CAMERA"] = "\uD83D\uDCF7";
    LogEmoji["COLOR"] = "\uD83C\uDFA8";
    LogEmoji["CONFIG"] = "\u2699\uFE0F";
    LogEmoji["GENERAL"] = "\uD83E\uDD16";
    LogEmoji["HARDWARE"] = "\uD83D\uDD27";
    LogEmoji["LED"] = "\uD83D\uDCA1";
    LogEmoji["MIC"] = "\uD83C\uDFA4";
    LogEmoji["MODEL"] = "\uD83D\uDCE6";
    LogEmoji["RPI"] = "\uD83C\uDF53";
    LogEmoji["SERVO"] = "\uD83E\uDDBE";
    LogEmoji["SPEAKER"] = "\uD83D\uDD08";
    LogEmoji["STT"] = "\uD83E\uDDBB";
    LogEmoji["TTS"] = "\uD83D\uDCAC";
    LogEmoji["VISION"] = "\uD83D\uDC41\uFE0F";
})(LogEmoji || (LogEmoji = {}));
let winstonInitialized = false;
const prettyErrorFormat = winston.format.printf(((info) => {
    let message = `${info.level}: ${info.message}`;
    const metadata = { ...info };
    delete metadata.level;
    delete metadata.message;
    delete metadata[Symbol.for('level')];
    delete metadata[Symbol.for('message')];
    delete metadata[Symbol.for('splat')];
    if (Object.keys(metadata).length > 0) {
        const jsonString = JSON.stringify(metadata, null, 2);
        message += ' \x1b[36m' + jsonString + '\x1b[0m';
    }
    return message;
}));
/**
 * Initialize Winston with TJBot's default formatter.
 * Safe to call repeatedly; only the first call configures transports/format.
 * Later calls only update log level.
 */
export function initWinston(level = 'info') {
    if (!winstonInitialized) {
        winston.configure({
            level,
            format: winston.format.combine(winston.format.colorize(), prettyErrorFormat),
            transports: [new winston.transports.Console()],
        });
        winstonInitialized = true;
        return;
    }
    winston.level = level;
}
//# sourceMappingURL=logging.js.map