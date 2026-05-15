#!/usr/bin/env node

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

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileFromFile } from 'json-schema-to-typescript';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const schemaPath = path.join(repoRoot, 'src', 'config', 'schema', 'tjbot-config.schema.yaml');
const outputPath = path.join(repoRoot, 'src', 'config', 'config-types.generated.ts');

const generatedTypes = await compileFromFile(schemaPath, {
    bannerComment: '',
    format: false,
    style: {
        semi: true,
        singleQuote: true,
        trailingComma: 'all',
    },
});

const sanitizedTypes = generatedTypes
    .replace(/^ \* @minItems \d+\s*$/gm, '')
    .replace(/^ \* @maxItems \d+\s*$/gm, '')
    .replace(/\n{3,}/g, '\n\n');

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, sanitizedTypes, 'utf8');

console.log(`Generated config types at ${outputPath}`);
