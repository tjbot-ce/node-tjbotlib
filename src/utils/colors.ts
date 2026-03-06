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

import { readFileSync } from 'fs';
import yaml from 'js-yaml';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import winston from 'winston';
import { TJBotError } from './errors.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Color map: normalized color name (lowercase, no spaces) -> hex value
 * @private
 */
const colorMap = new Map<string, string>();

/**
 * Original color names (for getShineColors())
 * @private
 */
const colorNames: string[] = [];

/**
 * Load colors from YAML file at module initialization
 * @private
 */
function loadColors(): void {
    try {
        const colorsPath = join(__dirname, 'colors.yaml');
        const colorsYaml = readFileSync(colorsPath, 'utf8');
        const colors = yaml.load(colorsYaml) as Record<string, string>;

        for (const [name, hex] of Object.entries(colors)) {
            // Store original name for listing
            colorNames.push(name);

            // Normalize: remove all whitespace and convert to lowercase
            const normalizedName = name.replace(/\s+/g, '').toLowerCase();
            colorMap.set(normalizedName, hex);
        }

        winston.debug(`Loaded ${colorNames.length} colors for LED control`);
    } catch (error) {
        winston.error('Failed to load colors.yaml:', error);
        throw new TJBotError('Failed to load LED color definitions');
    }
}

// Load colors at module initialization
loadColors();

/**
 * Get the list of all colors recognized by TJBot.
 * @return {string[]} List of all named colors recognized by `shine()` and `pulse()`.
 * @public
 */
export function getShineColors(): string[] {
    return [...colorNames];
}

/**
 * Convert hex color to RGB value.
 * @param {string} hexColor Hex color (e.g. FF8888)
 * @return {array} RGB color (e.g. (255, 128, 128))
 * @private
 */
export function convertHexToRgbColor(hexColor: string): [number, number, number] {
    const rgbHex: RegExpMatchArray | null = hexColor
        .replace(
            /^#?([a-f\d])([a-f\d])([a-f\d])$/i,
            (_m: string, r: string, g: string, b: string) => `#${r}${r}${g}${g}${b}${b}`
        )
        .substring(1)
        .match(/.{2}/g);

    if (rgbHex !== null) {
        const rgb: number[] = rgbHex.map((x: string) => parseInt(x, 16));
        return [rgb[0], rgb[1], rgb[2]];
    } else {
        winston.warn(`an error occurred converting hex color ${hexColor} to RGB, returning [0, 0, 0]`);
        return [0, 0, 0];
    }
}

/**
 * Normalize the given color to #RRGGBB.
 * @param {string} color The color to shine the LED. May be specified in a number of
 * formats, including: hexadecimal, (e.g. "0xF12AC4", "11FF22", "#AABB24"), "on", "off",
 * or may be a named color from TJBot's curated LED color list. Hexadecimal colors
 * follow an #RRGGBB format.
 * @return {string} Hex string corresponding to the given color (e.g. "#RRGGBB")
 * @private
 */
export function normalizeColor(color: string): string {
    let normColor = color;

    // assume undefined == "off"
    if (normColor === undefined) {
        normColor = 'off';
    }

    // strip prefixes if they are present
    if (normColor.startsWith('0x')) {
        normColor = normColor.slice(2);
    }

    if (normColor.startsWith('#')) {
        normColor = normColor.slice(1);
    }

    // is this a hex number or a named color?
    const isHex = /(^[0-9A-F]{6}$)|(^[0-9A-F]{3}$)/i;
    let rgb;
    if (!isHex.test(normColor)) {
        // Look up named color in our curated color map
        const normalizedName = normColor.replace(/\s+/g, '').toLowerCase();
        const hexValue = colorMap.get(normalizedName);

        if (hexValue) {
            rgb = hexValue;
        } else {
            rgb = undefined;
        }
    } else {
        rgb = normColor;
    }

    // did we get something back?
    if (rgb === undefined) {
        throw new TJBotError(`TJBot did not understand the specified color "${color}"`);
    }

    // prefix rgb with # in case it's not
    if (!rgb.startsWith('#')) {
        rgb = `#${rgb}`;
    }

    // throw an error if we didn't understand this color
    if (rgb.length !== 7) {
        throw new TJBotError(`TJBot did not understand the specified color "${color}"`);
    }

    return rgb;
}
