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

import { execFile } from 'child_process';
import temp from 'temp';
import winston from 'winston';
import { TJBotError } from '../utils/index.js';

/**
 * Camera controller for TJBot
 * Handles camera initialization and photo capture using rpi-cam-lib
 */

export class CameraController {
    private resolution: [number, number];
    private verticalFlip: boolean;
    private horizontalFlip: boolean;
    private captureTimeout: number;
    private zeroShutterLag: boolean;

    constructor() {
        this.resolution = [1920, 1080];
        this.verticalFlip = false;
        this.horizontalFlip = false;
        this.captureTimeout = 500;
        this.zeroShutterLag = false;
    }

    /**
     * Initialize the camera with configuration
     * @param resolution Camera resolution as [width, height]
     * @param verticalFlip Whether to vertically flip the image
     * @param horizontalFlip Whether to horizontally flip the image
     * @param captureTimeout Timeout in milliseconds before capturing (default: 500)
     * @param zeroShutterLag Enable zero shutter lag mode (default: false)
     */
    initialize(
        resolution: [number, number],
        verticalFlip: boolean,
        horizontalFlip: boolean,
        captureTimeout: number = 500,
        zeroShutterLag: boolean = false
    ): void {
        this.resolution = resolution;
        this.verticalFlip = verticalFlip;
        this.horizontalFlip = horizontalFlip;
        this.captureTimeout = captureTimeout;
        this.zeroShutterLag = zeroShutterLag;
        winston.debug('📷 camera instance configured for rpicam-still');
    }

    /**
     * Capture a photo by invoking rpicam-still via child_process
     * @param atPath Optional path to save the photo. If not provided, a temporary file will be used.
     * @returns Path to the saved photo
     * @throws TJBotError if the camera command fails
     */
    async capturePhoto(atPath?: string): Promise<string> {
        const photoPath =
            atPath ??
            temp.path({
                prefix: 'tjbot',
                suffix: '.jpg',
            });
        const args = [
            '--output',
            photoPath,
            '--width',
            this.resolution[0].toString(),
            '--height',
            this.resolution[1].toString(),
            '--nopreview',
            '--camera',
            '0',
        ];
        if (this.verticalFlip) args.push('--vflip');
        if (this.horizontalFlip) args.push('--hflip');
        
        // Add timeout argument
        if (this.captureTimeout === 0) {
            args.push('--immediate');
        } else {
            args.push('--timeout', this.captureTimeout.toString());
        }
        
        // Add zero shutter lag if enabled
        if (this.zeroShutterLag) {
            args.push('--zsl');
        }

        winston.verbose(`📷 capturing image at path: ${photoPath}`);
        winston.debug(`📷 rpicam-still args: ${args.join(' ')}`);

        return new Promise((resolve, reject) => {
            execFile('rpicam-still', args, (error, stdout, stderr) => {
                if (error) {
                    winston.error(`📷 rpicam-still error: ${stderr || error.message}`);
                    reject(new TJBotError(stderr || error.message));
                } else {
                    winston.debug(`📷 rpicam-still stdout: ${stdout}`);
                    resolve(photoPath);
                }
            });
        });
    }

    /**
     * Clean up resources (no-op for direct process invocation)
     */
    cleanup(): void {
        winston.debug('📷 camera cleanup (no-op for rpicam-still)');
    }
}
