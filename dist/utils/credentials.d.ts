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
export interface AzureCredentials {
    speechKey?: string;
    speechRegion?: string;
    imageAnalysisKey?: string;
    imageAnalysisUrl?: string;
}
/**
 * Resolves a credentials file path by checking provided path, then CWD, then ~/.tjbot.
 * @param filename - The filename to look for (e.g., 'azure-credentials.env')
 * @param providedPath - Optional explicit path to check first
 * @throws {TJBotError} if no credentials file is found
 */
export declare function resolveCredentialsPath(filename: string, providedPath?: string): string;
/**
 * Resolves, loads, and exports Azure credentials.
 */
export declare function loadAzureCredentials(providedPath?: string): AzureCredentials;
/**
 * Resolves Google Cloud credentials and exports credentials path for ADC.
 */
export declare function loadGoogleCloudCredentials(providedPath?: string): {
    credentialsPath: string;
};
/**
 * Resolves, loads, and exports IBM Watson credentials.
 */
export declare function loadIBMWatsonCloudCredentials(providedPath?: string): void;
//# sourceMappingURL=credentials.d.ts.map