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

export class TJBotError extends Error {
    readonly code?: string;
    readonly context?: Record<string, unknown>;
    readonly cause?: Error;

    constructor(message: string, options?: { code?: string; context?: Record<string, unknown>; cause?: Error }) {
        super(message);
        this.name = 'TJBotError';
        this.code = options?.code;
        this.context = options?.context;
        this.cause = options?.cause;

        // Maintain proper stack trace for where our error was thrown (only available on V8)
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, TJBotError);
        }
    }
}
