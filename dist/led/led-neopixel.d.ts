/**
 * Copyright 2025 IBM Corp. All Rights Reserved.
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
/**
 * LED controller for NeoPixel (WS281x) LEDs on Raspberry Pi 3/4.
 *
 * rpi-ws281x-native requires root privileges. Rather than launching every
 * TJBot recipe that uses the LED as root, this class spawns a small, long-lived
 * helper process (in led-neopixel-ws281x.js) using sudo and communicates with it
 * over a newline-delimited JSON IPC channel on stdin/stdout.
 *
 * Sudo authentication is performed once at construction time (either
 * passwordless or via an interactive prompt). Subsequent render() calls are
 * cheap IPC messages with no additional privilege escalation.
 */
export declare class LEDNeopixel {
    private helper;
    private reader?;
    private _ready;
    private _pendingById;
    private _nextId;
    private _helperDead;
    constructor(pin: number);
    /**
     * Render the NeoPixel to a specific color.
     * @param color Color as a 32-bit integer in RGB format (0xRRGGBB)
     */
    render(color: number): Promise<void>;
    /**
     * Send a reset command and terminate the helper process.
     */
    cleanup(): Promise<void>;
    private _handleLine;
    private _send;
    private _setHelperHandleRefState;
    private _killHelper;
}
//# sourceMappingURL=led-neopixel.d.ts.map