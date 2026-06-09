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

import { copyFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');

const syncMappings = [
    {
        name: 'config schema',
        sourcePath: path.join(repoRoot, 'vendor', 'tjbot-config', 'tjbot-config.schema.yaml'),
        targetPath: path.join(repoRoot, 'src', 'config', 'vendor', 'tjbot-config.schema.yaml'),
    },
    {
        name: 'model registry',
        sourcePath: path.join(repoRoot, 'vendor', 'tjbot-config', 'model-registry.yaml'),
        targetPath: path.join(repoRoot, 'src', 'config', 'vendor', 'model-registry.yaml'),
    },
    {
        name: 'default config',
        sourcePath: path.join(repoRoot, 'vendor', 'tjbot-config', 'tjbot.default.toml'),
        targetPath: path.join(repoRoot, 'src', 'config', 'vendor', 'tjbot.default.toml'),
    },
    {
        name: 'color list',
        sourcePath: path.join(repoRoot, 'vendor', 'tjbot-config', 'colors.yaml'),
        targetPath: path.join(repoRoot, 'src', 'config', 'vendor', 'colors.yaml'),
    }
];

for (const mapping of syncMappings) {
    const targetDir = path.dirname(mapping.targetPath);
    await mkdir(targetDir, { recursive: true });

    try {
        await copyFile(mapping.sourcePath, mapping.targetPath);
        console.log(`Synced ${mapping.name} to ${mapping.targetPath}`);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);

        if (message.includes('no such file or directory')) {
            console.warn(
                `${mapping.name} source not found at ${mapping.sourcePath}. Using existing bundled snapshot at ${mapping.targetPath}. Initialize or update the vendor/tjbot-config submodule to refresh it.`
            );
        } else {
            throw new Error(
                `Unable to sync ${mapping.name} from ${mapping.sourcePath}. Ensure vendor/tjbot-config is present and contains the shared config assets. ${message}`,
                { cause: error }
            );
        }
    }
}
