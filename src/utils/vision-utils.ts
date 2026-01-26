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

import fs from 'fs';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';

import yaml from 'js-yaml';
import os from 'os';

export interface VisionModelMetadata {
    key: string;
    label: string;
    url: string;
    type: 'detection' | 'classification' | 'segmentation';
    inputShape?: number[];
    labels?: string[];
    labelUrl?: string;
}

export class VisionModelManager {
    private static instance?: VisionModelManager;
    private models: VisionModelMetadata[] = [];
    private metadataLoaded = false;

    private constructor() {}

    static getInstance(): VisionModelManager {
        if (!this.instance) {
            this.instance = new VisionModelManager();
        }
        return this.instance;
    }

    /**
     * Fetch and cache the label list for a model if labelUrl is present.
     * Returns the label list as a string array.
     */
    async fetchLabelsForModel(model: VisionModelMetadata): Promise<string[] | undefined> {
        if (model.labels && model.labels.length > 2 && !model.labels.includes('# ...')) {
            // Already has a full label list
            return model.labels;
        }
        if (!model.labelUrl) return model.labels;
        try {
            const res = await fetch(model.labelUrl);
            if (!res.ok) throw new Error(`Failed to fetch labels: ${res.statusText}`);
            const text = await res.text();
            // Try to parse as one label per line, ignoring comments and blanks
            const labels = text
                .split('\n')
                .map((l) => l.trim())
                .filter((l) => l && !l.startsWith('#'));
            // Optionally cache in model.labels
            model.labels = labels;
            return labels;
        } catch (_err) {
            // Fallback to whatever is in model.labels
            return model.labels;
        }
    }

    loadMetadata(yamlPath?: string): void {
        if (this.metadataLoaded) return;
        if (!yamlPath) {
            const __filename = fileURLToPath(import.meta.url);
            const __dirname = dirname(__filename);
            const configDir = path.join(__dirname, '..', 'config');
            yamlPath = path.join(configDir, 'vision-models.yaml');
        }
        try {
            const fileContents = fs.readFileSync(yamlPath, 'utf8');
            const data = yaml.load(fileContents) as { models: VisionModelMetadata[] };
            this.models = data.models || [];
            this.metadataLoaded = true;
        } catch (err) {
            throw new Error(`Failed to load Vision model metadata: ${err}`);
        }
    }

    getModelMetadata(): VisionModelMetadata[] {
        this.loadMetadata();
        return this.models;
    }

    getModelCacheDir(): string {
        return path.join(os.homedir(), '.tjbot', 'models', 'vision');
    }

    /**
     * Check if a model file is downloaded in the cache directory
     */
    isModelDownloaded(model: VisionModelMetadata): boolean {
        const cacheDir = this.getModelCacheDir();
        const modelFilename = path.basename(model.url);
        const modelPath = path.join(cacheDir, modelFilename);
        return fs.existsSync(modelPath);
    }

    /**
     * Fetch the remote file size in bytes using HTTP HEAD
     */
    async fetchModelSize(model: VisionModelMetadata): Promise<number | null> {
        try {
            const res = await fetch(model.url, { method: 'HEAD' });
            if (!res.ok) return null;
            const size = res.headers.get('content-length');
            return size ? parseInt(size, 10) : null;
        } catch {
            return null;
        }
    }
}
