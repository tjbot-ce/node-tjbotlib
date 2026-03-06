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

export type TJBotLogLevel = 'error' | 'warn' | 'info' | 'verbose' | 'debug';

interface LoggerInfo extends Record<PropertyKey, unknown> {
    level: string;
    message: string;
}

let winstonInitialized = false;

const prettyErrorFormat = winston.format.printf(((info: LoggerInfo) => {
    let message = `${info.level}: ${info.message}`;

    const metadata: Record<PropertyKey, unknown> = { ...info };
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
}) as Parameters<typeof winston.format.printf>[0]);

/**
 * Initialize Winston with TJBot's default formatter.
 * Safe to call repeatedly; only the first call configures transports/format.
 * Later calls only update log level.
 */
export function initWinston(level: TJBotLogLevel = 'info'): void {
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
