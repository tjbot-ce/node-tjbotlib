#!/usr/bin/env node
/**
 * MWE: test led-neopixel-ws281x.js via IPC child process.
 *
 * Spawns the helper the same way LEDNeopixel does (sudo -n node <helper>),
 * then sends init + a series of render commands over newline-delimited JSON.
 *
 * Usage:
 *   node scripts/test-neopixel-ipc.js [gpio_pin]
 *   (default pin: 18)
 *
 * Run as a normal user — the script will use 'sudo -n' to spawn the helper.
 * Make sure passwordless sudo is configured (or run 'sudo -v' first).
 */

import { spawn, spawnSync } from 'child_process';
import { createInterface } from 'readline';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const HELPER_PATH = join(__dirname, '..', 'src', 'led', 'led-neopixel-ws281x.js');
const pin = parseInt(process.argv[2] ?? '18', 10);
const DELAY_MS = 800;

// ─── Helpers ────────────────────────────────────────────────────────────────

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

let nextId = 1;
/** Map<id, { resolve, reject }> */
const pending = new Map();

function sendCommand(helper, cmd) {
    return new Promise((resolve, reject) => {
        const id = nextId++;
        const msg = JSON.stringify({ id, ...cmd });
        pending.set(id, { resolve, reject });
        console.log(`→ ${msg}`);
        helper.stdin.write(msg + '\n');
    });
}

// ─── Spawn helper ────────────────────────────────────────────────────────────

const isRoot = process.getuid?.() === 0;
let spawnCmd, spawnArgs;

if (isRoot) {
    spawnCmd = process.execPath;
    spawnArgs = [HELPER_PATH];
} else {
    const probe = spawnSync('sudo', ['-n', 'true'], { stdio: 'pipe' });
    if (probe.status !== 0) {
        console.log('\nPasswordless sudo not available. Run `sudo -v` first.\n');
        const auth = spawnSync('sudo', ['-v'], { stdio: 'inherit' });
        if (auth.status !== 0) {
            console.error('sudo authentication failed.');
            process.exit(1);
        }
    }
    spawnCmd = 'sudo';
    spawnArgs = ['-n', process.execPath, HELPER_PATH];
}

console.log(`Spawning: ${spawnCmd} ${spawnArgs.join(' ')}`);
const helper = spawn(spawnCmd, spawnArgs, { stdio: ['pipe', 'pipe', 'pipe'] });

// Forward helper stderr to our stderr (diagnostic messages from helper).
helper.stderr.setEncoding('utf8');
helper.stderr.on('data', (chunk) => process.stderr.write(`[helper stderr] ${chunk}`));

helper.on('error', (err) => {
    console.error('Failed to spawn helper:', err.message);
    process.exit(1);
});

helper.on('exit', (code, signal) => {
    console.log(`Helper exited: code=${code} signal=${signal}`);
});

// Line reader on helper stdout.
const rl = createInterface({ input: helper.stdout, crlfDelay: Infinity });
rl.on('line', (line) => {
    if (!line.trim()) return;
    console.log(`← ${line}`);
    let msg;
    try {
        msg = JSON.parse(line);
    } catch {
        console.error('Failed to parse helper response:', line);
        return;
    }
    const entry = pending.get(msg.id);
    if (!entry) {
        console.warn('No pending request for id', msg.id);
        return;
    }
    pending.delete(msg.id);
    if (msg.ok) {
        entry.resolve(msg);
    } else {
        entry.reject(new Error(msg.error ?? 'unknown error'));
    }
});

// ─── Test sequence ───────────────────────────────────────────────────────────

async function run() {
    try {
        // 1. Init
        console.log(`\n--- init pin=${pin} ---`);
        await sendCommand(helper, { cmd: 'init', pin, numLeds: 1 });
        await delay(DELAY_MS);

        // 2. Red
        console.log('\n--- render red (0xFF0000) ---');
        await sendCommand(helper, { cmd: 'render', color: 0xff0000 });
        await delay(DELAY_MS);

        // 3. Green
        console.log('\n--- render green (0x00FF00) ---');
        await sendCommand(helper, { cmd: 'render', color: 0x00ff00 });
        await delay(DELAY_MS);

        // 4. Blue
        console.log('\n--- render blue (0x0000FF) ---');
        await sendCommand(helper, { cmd: 'render', color: 0x0000ff });
        await delay(DELAY_MS);

        // 5. White
        console.log('\n--- render white (0xFFFFFF) ---');
        await sendCommand(helper, { cmd: 'render', color: 0xffffff });
        await delay(DELAY_MS);

        // 6. Off (reset)
        console.log('\n--- reset (off) ---');
        await sendCommand(helper, { cmd: 'reset' });
        await delay(DELAY_MS);

        // 7. Shutdown
        console.log('\n--- shutdown ---');
        await sendCommand(helper, { cmd: 'shutdown' });

        console.log('\nDone. All commands acknowledged by helper.');
    } catch (err) {
        console.error('Error during test:', err.message);
        // Try to clean up.
        try {
            helper.stdin.write(JSON.stringify({ id: 9999, cmd: 'shutdown' }) + '\n');
        } catch {}
        setTimeout(() => process.exit(1), 500);
        return;
    }

    // Give helper time to drain and exit cleanly.
    setTimeout(() => process.exit(0), 500);
}

run();
