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

import { RPICam } from 'rpi-cam-lib';
import temp from 'temp';
import winston from 'winston';
import { TJBotError } from '../utils/index.js';

/**
 * Camera controller for TJBot
 * Handles camera initialization and photo capture using rpi-cam-lib
 */
export class CameraController {
    private camera?: RPICam;
    private resolution: [number, number];
    private verticalFlip: boolean;
    private horizontalFlip: boolean;

    constructor() {
        this.resolution = [1920, 1080];
        this.verticalFlip = false;
        this.horizontalFlip = false;
    }

    /**
     * Initialize the camera with configuration
     * @param resolution Camera resolution as [width, height]
     * @param verticalFlip Whether to vertically flip the image
     * @param horizontalFlip Whether to horizontally flip the image
     */
    initialize(resolution: [number, number], verticalFlip: boolean, horizontalFlip: boolean): void {
        this.resolution = resolution;
        this.verticalFlip = verticalFlip;
        this.horizontalFlip = horizontalFlip;

        // Instantiate the camera once during initialization
        if (!this.camera) {
            this.camera = new RPICam(0, { autoReserve: false });
            winston.debug('📷 camera instance created');
        }
    }

    /**
     * Capture a photo
     * @param atPath Optional path to save the photo. If not provided, a temporary file will be used.
     * @returns Path to the saved photo
     * @throws TJBotError if the camera is not initialized or if capture fails
     */
    async capturePhoto(atPath?: string): Promise<string> {
        if (!this.camera) {
            throw new TJBotError('Camera not initialized. Call initialize() first.');
        }

        if (atPath === undefined) {
            atPath = temp.path({
                prefix: 'tjbot',
                suffix: '.jpg',
            });
        }

        // Generate a unique task ID for this capture
        const taskId = `tjbot-photo-${Date.now()}`;

        // Map config to rpi-cam-lib options
        const cameraOptions = {
            flipHorizontal: this.horizontalFlip,
            flipVertical: this.verticalFlip,
        };

        winston.verbose(`📷 capturing image at path: ${atPath}`);
        winston.debug(`📷 camera options: ${JSON.stringify(cameraOptions)}`);

        try {
            const result = await this.camera.serveStill(
                atPath,
                this.resolution[0],
                this.resolution[1],
                taskId,
                cameraOptions
            );

            if (!result.success) {
                const errorMessage = result.error?.readable || JSON.stringify(result.error) || 'Unknown camera error';
                throw new TJBotError(errorMessage);
            }

            return atPath;
        } catch (error) {
            let errorMessage = 'Unknown error';
            if (error instanceof Error) {
                errorMessage = error.message;
            } else if (typeof error === 'object' && error !== null) {
                errorMessage = JSON.stringify(error);
            } else if (typeof error === 'string') {
                errorMessage = error;
            }
            winston.error(`📷 failed to capture image: ${errorMessage}`);
            throw error;
        }
    }

    /**
     * Clean up resources
     */
    cleanup(): void {
        if (this.camera) {
            // Kill any remaining tasks before cleanup
            this.camera.killAllTasks(true);
            winston.debug('📷 camera cleaned up');
        }
    }
}
