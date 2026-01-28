#!/usr/bin/env python3
#
# Copyright 2026-present TJBot Contributors. All Rights Reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#

import argparse
import os
import sys
import tarfile
import tempfile
import urllib.request
import zipfile
from pathlib import Path
from typing import Dict, List, Set

import yaml

try:
    from tqdm import tqdm
    HAS_TQDM = True
except ImportError:
    HAS_TQDM = False


class ModelAnalyzer:
    """Analyzes model files to determine which ones are required by Sherpa-ONNX or ONNX."""

    # File extensions commonly used by ONNX models
    ONNX_EXTENSIONS = {".onnx", ".txt", ".json", ".pb", ".pbtxt"}

    # Sherpa-ONNX specific patterns and requirements
    SHERPA_REQUIRED_PATTERNS = {
        ".onnx",  # ONNX model files
        ".txt",   # Token files, etc.
    }

    def __init__(self, cache_dir: str | None = None):
        self.temp_dir = None
        # Setup cache directory for downloaded models
        if cache_dir is None:
            cache_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".model_cache")
        self.cache_dir = cache_dir
        os.makedirs(self.cache_dir, exist_ok=True)

    def __enter__(self):
        self.temp_dir = tempfile.mkdtemp()
        return self

    def __exit__(self, *args):
        if self.temp_dir and os.path.exists(self.temp_dir):
            import shutil

            shutil.rmtree(self.temp_dir)

    def _download_progress_hook(self, block_num: int, block_size: int, total_size: int) -> None:
        """Progress hook for urllib downloads."""
        if total_size < 0:
            return

        downloaded = block_num * block_size
        if downloaded > total_size:
            downloaded = total_size

        percent = min(100, (downloaded * 100) // total_size)

        if HAS_TQDM:
            # If tqdm is available, we'll use it from the calling function
            pass
        else:
            # Simple progress bar
            bar_length = 40
            filled = (percent * bar_length) // 100
            bar = "█" * filled + "░" * (bar_length - filled)
            mb_downloaded = downloaded / (1024 * 1024)
            mb_total = total_size / (1024 * 1024)
            print(
                f"\r  [{bar}] {percent:3d}% ({mb_downloaded:.1f}MB / {mb_total:.1f}MB)",
                end="",
                flush=True,
            )

    def get_file_size(self, url: str) -> int:
        """Get file size in bytes using HEAD request, with fallback to GET."""
        try:
            # Try HEAD request first
            request = urllib.request.Request(url, method='HEAD')
            with urllib.request.urlopen(request) as response:
                content_length = response.headers.get('content-length')
                if content_length:
                    return int(content_length)
        except Exception:
            # HEAD request failed, try GET with Range header
            try:
                request = urllib.request.Request(url)
                request.add_header('Range', 'bytes=0-0')
                with urllib.request.urlopen(request) as response:
                    content_range = response.headers.get('content-range')
                    if content_range:
                        # Format: "bytes 0-0/12345"
                        total = content_range.split('/')[-1]
                        if total:
                            return int(total)

                    # If no content-range, try content-length
                    content_length = response.headers.get('content-length')
                    if content_length:
                        return int(content_length)
            except Exception:
                pass

        return 0

    def format_size(self, size_bytes: int) -> str:
        """Format bytes to human-readable size."""
        if size_bytes == 0:
            return "unknown"
        size_float = float(size_bytes)
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size_float < 1024:
                if unit == 'B':
                    return f"{int(size_float)}{unit}"
                return f"{size_float:.0f}{unit}"
            size_float /= 1024
        return f"{size_float:.1f}TB"

    def extract_model_metadata(self, model: Dict) -> Dict[str, str]:
        """Extract metadata from model configuration."""
        metadata = {
            'name': model.get('key', 'unknown'),
            'quality': '',
            'languages': '',
            'tasks': '',
            'size': '',
        }

        # Extract from key and label
        key = model.get('key', '')
        label = model.get('label', '')
        model_type = model.get('type', '')
        kind = model.get('kind', '')

        # Extract quality hints from key and label
        if 'tiny' in key.lower():
            metadata['quality'] = 'tiny'
        elif 'small' in key.lower():
            metadata['quality'] = 'small'
        elif 'base' in key.lower():
            metadata['quality'] = 'base'
        elif 'medium' in key.lower():
            metadata['quality'] = 'medium'
        elif 'large' in key.lower():
            metadata['quality'] = 'large'
        elif 'low' in label.lower():
            metadata['quality'] = 'low'
        elif 'high' in label.lower():
            metadata['quality'] = 'high'

        # Extract language hints
        languages = set()
        if 'en_US' in key or 'en_GB' in key or 'whisper' in key.lower() or 'english' in label.lower():
            languages.add('English')
        if 'zh' in key or 'bilingual' in key.lower():
            languages.add('Chinese')
        if 'bilingual' in key.lower():
            languages.add('Multilingual')

        if languages:
            metadata['languages'] = ', '.join(sorted(languages))

        # Extract task hints
        tasks = set()
        if model_type == 'stt':
            tasks.add('STT')
        elif model_type == 'tts':
            tasks.add('TTS')
        elif model_type == 'vad':
            tasks.add('VAD')
        elif model_type == 'vision':
            if 'detection' in kind.lower():
                tasks.add('Object Detection')
            elif 'classification' in kind.lower():
                tasks.add('Image Classification')
            elif 'segmentation' in kind.lower():
                tasks.add('Image Segmentation')
            else:
                tasks.add('Vision')

        if tasks:
            metadata['tasks'] = ', '.join(sorted(tasks))

        return metadata

    def generate_label(self, model: Dict, size_str: str = '') -> str:
        """Generate a standardized label for the model."""
        metadata = self.extract_model_metadata(model)

        parts = [metadata['name']]

        if metadata['quality'] and metadata['quality'] != 'base':
            parts.append(f"[{metadata['quality'].capitalize()}]")

        if metadata['tasks']:
            parts.append(f"({metadata['tasks']}")
            if metadata['languages']:
                parts[-1] += f", {metadata['languages']}"
            if size_str:
                parts[-1] += f", ~{size_str}"
            parts[-1] += ")"
        else:
            # Fallback format without tasks
            if metadata['languages']:
                parts.append(f"({metadata['languages']}")
                if size_str:
                    parts[-1] += f", ~{size_str}"
                parts[-1] += ")"
            elif size_str:
                parts.append(f"(~{size_str})")

        return " ".join(parts)

    def extract_archive(self, archive_path: str, extract_dir: str) -> None:
        """Extract tar.bz2 or zip files."""
        if archive_path.endswith(".tar.bz2") or archive_path.endswith(".tar.gz"):
            print(f"  Extracting tar archive...")
            with tarfile.open(archive_path, "r:*") as tar:
                tar.extractall(path=extract_dir)
        elif archive_path.endswith(".zip"):
            print(f"  Extracting zip archive...")
            with zipfile.ZipFile(archive_path, "r") as zip_ref:
                zip_ref.extractall(path=extract_dir)
        else:
            raise ValueError(f"Unsupported archive format: {archive_path}")

    def get_files_in_folder(self, folder_path: str) -> Set[str]:
        """Recursively get all files in a folder, returning relative paths."""
        files = set()
        if not os.path.isdir(folder_path):
            return files

        for root, dirs, filenames in os.walk(folder_path):
            for filename in filenames:
                full_path = os.path.join(root, filename)
                rel_path = os.path.relpath(full_path, folder_path)
                files.add(rel_path)

        return files

    def determine_required_files(self, files: Set[str], model_type: str) -> List[str]:
        """
        Determine which files are required based on model type.
        This uses heuristics to identify critical files.
        """
        required = []

        # Convert to lowercase for comparison
        files_lower = {f.lower(): f for f in files}

        if model_type == "stt":
            # For STT models, look for ONNX files and token files
            for file in files:
                file_lower = file.lower()
                # Include all .onnx and token files
                if file.endswith(".onnx") or "token" in file_lower or "vocab" in file_lower:
                    required.append(file)
        elif model_type == "tts":
            # For TTS models, look for ONNX files and token files
            for file in files:
                file_lower = file.lower()
                if file.endswith(".onnx") or "token" in file_lower or "vocab" in file_lower:
                    required.append(file)
        elif model_type == "vad":
            # For VAD models, typically just the ONNX file
            for file in files:
                if file.endswith(".onnx"):
                    required.append(file)
        elif model_type == "vision":
            # For vision models, include ONNX files
            for file in files:
                if file.endswith(".onnx"):
                    required.append(file)

        # Sort for consistent output
        return sorted(required)

    def download_and_analyze_model(
        self, url: str, folder_name: str, model_type: str
    ) -> List[str]:
        """
        Download a model file, extract it, and determine required files.
        Returns a list of required file names.
        """
        print(f"  Downloading: {url}")

        # Determine output filename
        if url.startswith("file://"):
            # Handle file:// URLs
            local_path = url.replace("file://", "")
            archive_path = local_path
            if not os.path.exists(archive_path):
                print(f"  ERROR: File not found: {archive_path}")
                return []
        else:
            # Download from URL
            filename = os.path.basename(url)
            cache_path = os.path.join(self.cache_dir, filename)
            archive_path = cache_path

            # Check if file is already in cache
            if os.path.exists(cache_path):
                print(f"  Using cached file: {cache_path}")
            else:
                # Download to cache
                try:
                    if HAS_TQDM:
                        # Use tqdm for nicer progress bar
                        response = urllib.request.urlopen(url)
                        total_size = int(response.headers.get('content-length', 0))

                        with open(cache_path, 'wb') as f, tqdm( # type: ignore
                            total=total_size,
                            unit='B',
                            unit_scale=True,
                            unit_divisor=1024,
                            desc="  Download",
                            leave=False,
                        ) as pbar:
                            while True:
                                chunk = response.read(8192)
                                if not chunk:
                                    break
                                f.write(chunk)
                                pbar.update(len(chunk))
                    else:
                        # Use built-in progress hook
                        urllib.request.urlretrieve(url, cache_path, reporthook=self._download_progress_hook)
                        print()  # New line after progress bar

                    print(f"  Downloaded to cache: {cache_path}")
                except Exception as e:
                    print(f"  ERROR: Failed to download: {e}")
                    return []

        # Extract the archive
        extract_dir = os.path.join(self.temp_dir, "extracted", folder_name) # type: ignore
        os.makedirs(extract_dir, exist_ok=True)

        try:
            # Check if it's a single file (like .onnx) or an archive
            if archive_path.endswith(".onnx"):
                print(f"  Model is a single ONNX file")
                # For single files, just copy it
                import shutil

                shutil.copy(archive_path, extract_dir)
            else:
                self.extract_archive(archive_path, extract_dir)
        except Exception as e:
            print(f"  ERROR: Failed to extract: {e}")
            return []

        # Find the actual model folder (in case it's in a subdirectory)
        model_root = extract_dir
        subdirs = [
            d
            for d in os.listdir(extract_dir)
            if os.path.isdir(os.path.join(extract_dir, d))
        ]

        # If there's a single subdirectory with the folder name, use it
        if len(subdirs) == 1 and subdirs[0] == folder_name:
            model_root = os.path.join(extract_dir, subdirs[0])
        elif len(subdirs) == 1:
            # Try the first subdirectory
            model_root = os.path.join(extract_dir, subdirs[0])

        # Get all files in the model directory
        files = self.get_files_in_folder(model_root)

        if not files:
            print(f"  WARNING: No files found in extracted model")
            return []

        print(f"  Found {len(files)} files in model")
        for file in sorted(files)[:10]:  # Show first 10 files
            print(f"    - {file}")
        if len(files) > 10:
            print(f"    ... and {len(files) - 10} more files")

        # Determine required files
        required = self.determine_required_files(files, model_type)
        print(f"  Determined {len(required)} required files")

        return required


def load_models_yaml(filepath: str) -> Dict:
    """Load models.yaml file."""
    with open(filepath, "r") as f:
        return yaml.safe_load(f)


def save_models_yaml(data: Dict, filepath: str | None = None) -> str | None:
        """Save models.yaml file or return as string with proper formatting."""

        # Custom YAML representer for better formatting
        class CustomDumper(yaml.SafeDumper):
            pass

        def represent_str(dumper, data):
            """Use literal style for multi-line strings."""
            if '\n' in data:
                return dumper.represent_scalar('tag:yaml.org,2002:str', data, style='|')
            return dumper.represent_scalar('tag:yaml.org,2002:str', data)

        CustomDumper.add_representer(str, represent_str)

        # Format with proper indentation and line wrapping
        yaml_str = yaml.dump(
            data,
            Dumper=CustomDumper,
            default_flow_style=False,
            sort_keys=False,
            allow_unicode=True,
            width=120,
            indent=2,
        )

        # Post-process to ensure consistent formatting
        # Add blank line between models for readability
        lines = yaml_str.split('\n')
        formatted_lines = []
        in_models = False

        for i, line in enumerate(lines):
            formatted_lines.append(line)

            # Add blank line after each model (before the next "- type:" or end)
            if line.strip().startswith('- type:') and i > 0 and in_models:
                # Insert blank line before this model if there's already one
                if formatted_lines[-2].strip():
                    formatted_lines.insert(-1, '')

            if 'models:' in line:
                in_models = True

        yaml_str = '\n'.join(formatted_lines)

        if filepath is None:
            return yaml_str
        else:
            with open(filepath, "w") as f:
                f.write(yaml_str)
            return None


def main():
    parser = argparse.ArgumentParser(
        description="Analyze model files to determine which are required by Sherpa-ONNX or ONNX"
    )
    parser.add_argument(
        "input",
        nargs="?",
        default="../src/config/models.yaml",
        help="Path to models.yaml file (default: ../src/config/models.yaml)",
    )
    parser.add_argument(
        "output",
        nargs="?",
        default=None,
        help="Path to output new models.yaml file (default: output to console)",
    )
    parser.add_argument(
        "--cache-dir",
        default=None,
        help="Directory to cache downloaded model files (default: .model_cache in script directory)",
    )
    parser.add_argument(
        "--no-cache",
        action="store_true",
        help="Don't cache downloaded model files",
    )

    args = parser.parse_args()

    # Resolve relative paths relative to the script directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    input_path = args.input
    if not os.path.isabs(input_path):
        input_path = os.path.join(script_dir, input_path)

    output_path = args.output
    if output_path and not os.path.isabs(output_path):
        output_path = os.path.join(script_dir, output_path)

    # Load models.yaml
    print(f"Loading models from: {input_path}")
    if not os.path.exists(input_path):
        print(f"ERROR: File not found: {input_path}")
        sys.exit(1)

    models_data = load_models_yaml(input_path)

    # Process each model
    print(f"\nProcessing {len(models_data.get('models', []))} models...\n")

    # Determine cache directory
    cache_dir = None
    if not args.no_cache:
        cache_dir = args.cache_dir
        if cache_dir:
            cache_dir = os.path.abspath(cache_dir)
        if cache_dir:
            print(f"Using cache directory: {cache_dir}\n")

    with ModelAnalyzer(cache_dir=cache_dir) as analyzer:
        for i, model in enumerate(models_data.get("models", []), 1):
            model_key = model.get("key", f"model_{i}")
            model_type = model.get("type", "unknown")
            url = model.get("url", "")
            folder = model.get("folder", "")

            print(f"[{i}/{len(models_data.get('models', []))}] Processing: {model_key} ({model_type})")

            if not url:
                print(f"  WARNING: No URL provided, skipping")
                continue

            try:
                # Get file size from URL
                print(f"  Checking file size...")
                file_size = analyzer.get_file_size(url)
                size_str = analyzer.format_size(file_size)
                print(f"  File size: {size_str}")

                # Generate standardized label
                generated_label = analyzer.generate_label(model, size_str)
                print(f"  Generated label: {generated_label}")

                # Download and analyze
                required_files = analyzer.download_and_analyze_model(url, folder, model_type)

                # If we couldn't get size from URL, check the downloaded file
                if file_size == 0 and not url.startswith("file://"):
                    filename = os.path.basename(url)
                    cache_path = os.path.join(analyzer.cache_dir, filename)
                    if os.path.exists(cache_path):
                        file_size = os.path.getsize(cache_path)
                        size_str = analyzer.format_size(file_size)
                        generated_label = analyzer.generate_label(model, size_str)
                        print(f"  Updated file size from disk: {size_str}")
                        print(f"  Updated label: {generated_label}")

                print(f"  Required files: {required_files}\n")

                # Update the model with required files and generated label
                model["required"] = required_files
                model["label"] = generated_label
            except Exception as e:
                print(f"  ERROR: {e}\n")

    # Save the updated models.yaml
    print(f"\nGenerating output YAML...\n")
    output_yaml = save_models_yaml(models_data, output_path)

    if output_path:
        print(f"Saved to: {output_path}")
    else:
        print(output_yaml)


if __name__ == "__main__":
    main()
