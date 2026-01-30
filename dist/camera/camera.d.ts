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
 * Camera controller for TJBot
 * Handles camera initialization and photo capture using rpi-cam-lib
 */
export declare class CameraController {
    private resolution;
    private verticalFlip;
    private horizontalFlip;
    private captureTimeout;
    private zeroShutterLag;
    constructor();
    /**
     * Initialize the camera with configuration
     * @param resolution Camera resolution as [width, height]
     * @param verticalFlip Whether to vertically flip the image
     * @param horizontalFlip Whether to horizontally flip the image
     * @param captureTimeout Timeout in milliseconds before capturing (default: 500)
     * @param zeroShutterLag Enable zero shutter lag mode (default: false)
     */
    initialize(resolution: [number, number], verticalFlip: boolean, horizontalFlip: boolean, captureTimeout?: number, zeroShutterLag?: boolean): void;
    /**
     * Capture a photo by invoking rpicam-still via child_process
     * @param atPath Optional path to save the photo. If not provided, a temporary file will be used.
     * @returns Path to the saved photo
     * @throws TJBotError if the camera command fails
     */
    capturePhoto(atPath?: string): Promise<string>;
    /**
     * Clean up resources (no-op for direct process invocation)
     */
    cleanup(): void;
}
