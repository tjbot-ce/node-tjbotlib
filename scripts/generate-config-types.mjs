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

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, generatedTypes, 'utf8');

console.log(`Generated config types at ${outputPath}`);