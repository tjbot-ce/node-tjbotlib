import { copyFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const sourcePath = path.join(repoRoot, 'spec', 'tjbot-config.schema.yaml');
const targetDir = path.join(repoRoot, 'src', 'config', 'schema');
const targetPath = path.join(targetDir, 'tjbot-config.schema.yaml');

await mkdir(targetDir, { recursive: true });

try {
    await copyFile(sourcePath, targetPath);
} catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (message.includes('no such file or directory')) {
        console.warn(
            `Config schema source not found at ${sourcePath}. Using the existing bundled snapshot at ${targetPath}. Initialize or update the spec submodule to refresh it.`
        );
    } else {
        throw new Error(
            `Unable to sync config schema from ${sourcePath}. Ensure the spec is present or initialize the git submodule once the external repo exists. ${message}`
        );
    }
}

console.log(`Synced config schema to ${targetPath}`);