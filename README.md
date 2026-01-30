# TJBot Library (Node.js)

[![Node.js Version](https://img.shields.io/badge/Node.js-18%2B-green)](https://nodejs.org/)
[![Raspberry Pi Support](https://img.shields.io/badge/Raspberry%20Pi-3%2C%204%2C%205-red)](https://www.raspberrypi.org/)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)

> 🤖 Node.js library for programming TJBot recipes!

## What is TJBot?

[TJBot](http://ibm.biz/mytjbot) is an open-source robot created by IBM for
learning how to program artificial intelligence applications. This library
provides a simple, high-level interface to control TJBot running on a
Raspberry Pi.

## What Can TJBot Do?

TJBot's core capabilities are:

- **Listen** – Capture and transcribe speech with Speech-to-Text
- **See** – Recognize objects, faces, and image classes (and describe images with Azure Vision)
- **Shine** – Control an RGB LED in various colors and effects
- **Speak** – Play audio and synthesize speech with Text-to-Speech
- **Wave** – Move its arm using a servo motor

This library supports **local AI backends** (sherpa-onnx for speech, ONNX
runtime for vision) and **cloud services** for speech and vision, including IBM
Watson (speech), Google Cloud (speech + vision), and Microsoft Azure (speech +
vision).

## System Dependencies

Install the system camera package:

```bash
sudo apt-get install rpicam-apps-lite
```

> Note: This package is installed as part of TJBot's bootstrap script.

## Installation

Install the library from npm:

```bash
npm install --save tjbot
```

## Quick Start

### Importing TJBot

TJBot uses ES6 module syntax:

```js
import TJBot from 'tjbot';
```

### Example 1: Control an LED

This example initializes a NeoPixel LED and sets its color:

```js
import TJBot from 'tjbot';

const tj = new TJBot();

// Initialize with NeoPixel LED
tj.initialize([TJBot.Hardware.LED_NEOPIXEL]);

// Set LED to red
tj.shine('red');

// Set LED to a custom hex color
tj.shine('#00FF00');

// Pulse the LED (blocks until complete)
tj.pulse('blue');

console.log('LED demo complete!');
```

### Example 2: Speak Text Using On-Device Text-to-Speech (TTS)

This example uses the `sherpa-onnx` text-to-speech backend to speak text:

```js
import TJBot from 'tjbot';

const tj = new TJBot();

// Initialize with speaker
tj.initialize([TJBot.Hardware.SPEAKER]);

// Speak text using local TTS (sherpa-onnx)
// The TTS model is automatically downloaded on first use
await tj.speak('Hello, I am TJBot!');

console.log('Speech demo complete!');
```

### Example 3: Change TJBot's Configuration

TJBot automatically loads its configuration from the `tjbot.toml` file in
your current working directory. Create this file to customize TJBot's
behavior:

**tjbot.toml:**

```toml
[log]
level = 'debug'

[shine.neopixel]
gpioPin = 18
```

Then use it in your code:

```js
import TJBot from 'tjbot';

const tj = new TJBot();

// TJBot automatically loads tjbot.toml from the current directory
tj.initialize([TJBot.Hardware.LED_NEOPIXEL]);

// Use the configured settings
tj.shine('cyan');
await tj.speak('TJBot is ready!');
```

You can also pass configuration overrides:

```js
const tj = new TJBot({
  hardware: { microphone: true, speaker: true },
  listen: { backend: { type: 'local' } }
});
```

## Configuration Reference

TJBot uses [TOML](https://toml.io/en/) for configuration. By default, it
looks for a `tjbot.toml` configuration file in the current working directory. Create this file to override the default settings shown below:

```toml
################################################################################
# TJBot Configuration File
################################################################################

[log]
# Valid logging levels are 'error', 'warning', 'info', 'verbose', 'debug'
# Set this to 'error' or 'warning' to reduce log verbosity
# Set this to 'verbose' or 'debug' to see detailed logs for troubleshooting
level = 'info'

# =============================================================================
# Hardware Configuration
# =============================================================================
# Hardware devices to initialize with TJBot
# Set to true to enable, false (or omit) to disable

[hardware]
speaker = false          # Text-to-speech synthesis output
microphone = false       # Speech-to-text audio input
led_common_anode = false # LED with common anode (traditional RGB LED)
led_neopixel = false     # Addressable RGB NeoPixel LED
servo = false            # Servo motor for arm/movement
camera = false           # Camera module for image capture

# ============================================================================
# On-Device ML Models
# ============================================================================
# TJBot supports on-device ML models for speech and vision tasks using the
# sherpa-onnx runtime (speech) and onnx runtime (vision). Several models are
# available by default, defined in the model registry (model-registry.yaml).
# You can also register additional models here. Models must be in the ONNX
# format and compatible with the sherpa-onnx or onnx runtimes.
#
# On-device models are registered in the [[models]] array. Each model entry
# includes:
#   type       -> Model type (e.g., 'stt', 'tts', 'vad',
#                 'vision.object-recognition')
#   key        -> Unique model identifier (e.g., 'sherpa-onnx-whisper-base.en')
#   label      -> Human-readable name for the model
#   url        -> URL to download the model files (can be file:// for local
#                 files)
#   folder     -> Folder name to store the model files locally
#   kind       -> Model architecture:
#                 STT: 'offline', 'offline-whisper', 'streaming-zipformer',
#                 'streaming'
#                 TTS: 'vits-piper', 'tacotron', 'fastpitch', 'streaming'
#                 Vision: 'detection', 'classification', 'face-detection',
#                 'image-description'
#   required   -> List of required files for the model (used to validate the
#                 model was downloaded correctly)
#   inputShape -> (Vision models only) Expected input tensor shape [batch,
#                 channels, height, width]
#   labelUrl   -> (Vision models only) URL to download label/class names file
#
# Example: Register a custom STT model
# [[models]]
# type = 'stt'
# key = 'my-custom-stt-model'
# label = 'My Custom STT Model'
# url = "file:///path/to/my/model.onnx"
# folder = "my-custom-stt-model"
# kind = "offline"
# required = ["model.onnx", "tokens.txt"]

# Example: Register a custom vision classification model
# [[models]]
# type = 'vision.classification'
# key = 'my-vision-classifier'
# label = 'My Vision Classifier'
# url = "file:///path/to/my/classifier.zip"
# folder = "my-vision-classifier"
# kind = "classification"
# required = ["model.onnx", "labels.txt"]
# labelUrl = "file:///path/to/labels.txt"
# inputShape = [1, 3, 224, 224]

# =============================================================================
# Listen
# =============================================================================
# Configuration for TJBot's ability to listen and transcribe speech

[listen]
# 'device' specifies the audio device `arecord` will use for audio recording.
# Leave blank to auto-pick, or run `aplay -L` to list devices.
device = ''

# Microphone sampling rate in Hz (44.1k works; 16k reduces CPU for offline models)
microphoneRate = 44100

# Number of audio channels (1 is typical for mics; 2 also works)
microphoneChannels = 2

[listen.backend]
# 'type' chooses the STT provider:
#   'local'            -> sherpa-onnx on-device (OFFLINE by default, can also do streaming models)
#   'ibm-watson-stt'   -> IBM Cloud STT (STREAMING)
#   'google-cloud-stt' -> Google Cloud STT (STREAMING)
#   'azure-stt'        -> Microsoft Azure STT (single-shot, treated as OFFLINE for API usage)
# If you add a callback for an offline model or omit it for a streaming model, TJBot will throw a TJBotError.
type = 'local'

[listen.backend.local]
# DEFAULT MODEL (OFFLINE): Whisper base.en (good accuracy, English-only, ~140MB)
# See model-registry.yaml for other available models.
model = 'sherpa-onnx-whisper-base.en'

[listen.backend.local.vad]
# Voice activity detection (VAD) is used for local OFFLINE models (e.g. whisper, moonshine).
# When enabled, TJBot uses a VAD model to segment speech and stop on silence.
# Streaming models (zipformer, paraformer) use built-in endpoint detection instead.
# We recommend keeping VAD enabled, but you can disable it if desired.
enabled = true

# DEFAULT MODEL: Silero VAD (~350KB)
# See model-registry.yaml for other available models.
model = 'silero-vad'

[listen.backend.ibm-watson-stt]
# Specify the STT model to use.
#
# Full list of IBM Watson STT models:
# https://cloud.ibm.com/docs/speech-to-text?topic=speech-to-text-models-ng
model = 'en-US_Multimedia'

# 'inactivityTimeout' specifies the number of seconds of silence allowed
# after which the listening session will automatically end.
# Set to -1 to disable automatic timeout.
inactivityTimeout = -1

# 'backgroundAudioSuppression' specifies the level of background audio suppression
# to apply during speech recognition. Ranges from 0.0 to 1.0, where higher values
# result in more aggressive suppression of background noise.
backgroundAudioSuppression = 0.4

# If true, interim results will be returned during streaming recognition.
interimResults = false

# Optional: path to ibm-credentials.env file containing IBM API credentials
# If not specified, TJBot will search for the file in this order:
#   1. Current working directory (./ibm-credentials.env)
#   2. .tjbot directory (~/.tjbot/ibm-credentials.env)
credentialsPath = ''

[listen.backend.google-cloud-stt]
# Google Cloud Speech-to-Text API credentials and configuration
#
# Path to google-credentials.json file containing Google Cloud API credentials
# If not specified, TJBot will search for the file in this order:
#   1. Current working directory (./google-credentials.json)
#   2. .tjbot directory (~/.tjbot/google-credentials.json)
credentialsPath = ''

# Optional: Google Cloud Speech-to-Text model to use (e.g., 'latest_long',
# 'latest_short')
model = ''

[listen.backend.azure-stt]
# Microsoft Azure Speech-to-Text API credentials and configuration
#
# Path to azure-credentials.env file containing Azure API credentials
# If not specified, TJBot will search for the file in this order:
#   1. Current working directory (./azure-credentials.env)
#   2. .tjbot directory (~/.tjbot/azure-credentials.env)
credentialsPath = ''

# Optional: Language code (e.g., 'en-US', 'en-GB', 'fr-FR')
language = ''

# =============================================================================
# See
# =============================================================================
# Configuration for TJBot's ability to see and recognize objects, faces, and text

[see]
# Camera resolution is width x height
# Common resolutions: [1920, 1080], [1280, 720], [640, 480]
cameraResolution = [1920, 1080]

# If true, flips the camera image vertically
verticalFlip = false

# If true, flips the camera image horizontally
horizontalFlip = false

[see.backend]
# 'type' chooses the CV provider:
#   'local'               -> on-device ONNX (OFFLINE)
#   'google-cloud-vision' -> Google Cloud Vision (CLOUD)
#   'azure-vision'        -> Microsoft Azure Vision (CLOUD)
type = 'local'

[see.backend.local]
# DEFAULT MODELS (OFFLINE): Specialized quantized models for each vision task
# All models are downloaded and cached automatically when using local backend
# See model-registry.yaml for available models for each task
objectDetectionModel = 'ssd-mobilenet-v2'
imageClassificationModel = 'mobilenetv3'
faceDetectionModel = 'yunet'

# Confidence thresholds for filtering results
# Results with confidence scores below these thresholds will be excluded
# Valid range: 0.0 to 1.0 (0.8 = 80% confidence)
objectDetectionConfidence = 0.8
imageClassificationConfidence = 0.8
faceDetectionConfidence = 0.9

[see.backend.google-cloud-vision]
# Google Cloud Vision API credentials and model
credentialsPath = ''
model = ''

[see.backend.azure-vision]
# Microsoft Azure Vision API credentials and model
credentialsPath = ''
model = ''

# =============================================================================
# Shine
# =============================================================================
# Configuration for TJBot's ability to shine its LED

[shine.neopixel]
# NeoPixel LED Pin Configuration
#
# Note: Configuration parameters are model-specific. Each Raspberry Pi driver uses
# only the parameters relevant to its hardware:
#   - Raspberry Pi 3 & 4: Uses 'gpioPin' (PWM-based NeoPixel control)
#   - Raspberry Pi 5:     Uses 'spiInterface' (SPI-based NeoPixel control)

# ====== FOR RASPBERRY PI 3 & 4: GPIO PIN ======
# Available pins: GPIO10, GPIO12, GPIO18, GPIO21
#
# GPIO21 is recommended because:
#   - Does not share PWM hardware with GPIO18 (servo pin)
#   - Avoids conflicts with common peripherals
#
# GPIO18 also works but requires disabling audio:
#   1. Edit /boot/config.txt
#   2. Change: dtparam=audio=on
#   3. To: dtparam=audio=off
#   4. Reboot your Pi
gpioPin = 21  # GPIO21 / Physical pin 40 (RPi3/4 only)

# ====== FOR RASPBERRY PI 5: SPI INTERFACE ======
# Raspberry Pi 5 uses the Serial Peripheral Interface (SPI) for NeoPixel control.
# The spiInterface value corresponds to the SPI device:
#   /dev/spidev0.0 - Primary SPI bus (default, for GPIO10)
#   /dev/spidev0.1 - Secondary SPI bus (if available)
#
# GPIO10 (physical pin 19) is the only GPIO that works with /dev/spidev0.0 on RPi5.
spiInterface = "/dev/spidev0.0"

# Use GRB format for NeoPixel colors. Change this to 'true' if your LED shines
# green when it is supposed to shine red.
useGRBFormat = false

[shine.commonanode]
# Common Anode LEDs are connected with three GPIO pins for red, green, and blue.
redPin = 19   # GPIO19 / Physical pin 35
greenPin = 13 # GPIO13 / Physical pin 33
bluePin = 12  # GPIO12 / Physical pin 32

# =============================================================================
# Speak
# =============================================================================
# Configuration for TJBot's ability to speak using text-to-speech synthesis

[speak]
# 'device' specifies the audio device `aplay` will use for audio playback
# in most cases, leaving this blank should just work. if you have difficulty
# with audio playback, please refer to the TJBot wiki:
#   https://github.com/ibmtjbot/tjbot/wiki/Troubleshooting-TJBot#audio-issues
# also, you can use `aplay -l` to list available audio output devices
device = ''

[speak.backend]
# 'type' specifies which text-to-speech backend to use.
# Valid options:
#   'local', which uses the sherpa-onnx TTS engine (no internet connection required)
#   'ibm-watson-tts', which uses the IBM Watson Text-to-Speech cloud service (requires an `ibm-credentials.env` file for API credentials)
#   'google-cloud-tts', which uses the Google Cloud Text-to-Speech service (requires a `google-credentials.json` file for API credentials)
#   'azure-tts', which uses the Microsoft Azure Text-to-Speech service (requires an `azure-credentials.env` file for API credentials)
# By default, TJBot uses the local sherpa-onnx TTS engine.
type = 'local'

[speak.backend.local]
# DEFAULT MODEL: Whisper base.en (good accuracy, English-only, ~140MB)
# See model-registry.yaml for other available models.
model = 'vits-piper-en_US-ryan-medium'

[speak.backend.ibm-watson-tts]
# 'voice' specifies the IBM Watson Text-to-Speech voice to use.
# Available IBM voices include:
#   en-US_AllisonV3Voice
#   en-US_EmilyV3Voice
#   en-US_HenryV3Voice
#   en-US_KevinV3Voice
#   en-US_LisaV3Voice
#   en-US_MichaelV3Voice
#   en-US_OliviaV3Voice
# For a complete list of available voices, see:
#   https://cloud.ibm.com/docs/text-to-speech?topic=text-to-speech-voices
voice = 'en-US_MichaelV3Voice'

# Optional: path to ibm-credentials.env file containing IBM API credentials
# If not specified, TJBot will search for the file in this order:
#   1. Current working directory (./ibm-credentials.env)
#   2. .tjbot directory (~/.tjbot/ibm-credentials.env)
credentialsPath = ''

[speak.backend.google-cloud-tts]
# Google Cloud Text-to-Speech API credentials and configuration
#
# Path to google-credentials.json file containing Google Cloud API credentials
# If not specified, TJBot will search for the file in this order:
#   1. Current working directory (./google-credentials.json)
#   2. .tjbot directory (~/.tjbot/google-credentials.json)
credentialsPath = ''

# Optional: Google Cloud language code (e.g., 'en-US', 'en-GB', 'fr-FR')
languageCode = ''

[speak.backend.azure-tts]
# Microsoft Azure Text-to-Speech API credentials and configuration
#
# Path to azure-credentials.env file containing Azure API credentials
# If not specified, TJBot will search for the file in this order:
#   1. Current working directory (./azure-credentials.env)
#   2. .tjbot directory (~/.tjbot/azure-credentials.env)
credentialsPath = ''

# Optional: Azure voice name (e.g., 'en-US-JennyNeural')
voice = ''

# =============================================================================
# Wave
# =============================================================================
# Configuration for TJBot's ability to wave its arm using a servo motor

[wave]
# The GPIO chip and pin number for controlling a servo motor
# connected to TJBot's arm.
gpioChip = 0  # GPIO chip 0
servoPin = 18 # GPIO18 / Physical Pin 12
```

## Setting Up Speech and Vision Backends

TJBot supports local and cloud backends for speech and vision:

- **Speech**: Local (sherpa-onnx), IBM Watson, Google Cloud, Microsoft Azure
- **Vision**: Local (ONNX runtime), Google Cloud Vision, Microsoft Azure Vision

### Local Backend (sherpa-onnx + ONNX)

The local backend uses [sherpa-onnx](https://github.com/k2-fsa/sherpa-onnx) for
speech recognition and synthesis, and [ONNX](https://github.com/Microsoft/onnxruntime) runtime for vision tasks. Everything
runs offline, and models are downloaded automatically on first use.

> ⚠️ Local ML backends require a Raspberry Pi 4 or 5.

#### Setup

1. Set `type = 'local'` under `[listen.backend]`, `[speak.backend]`, and
   `[see.backend]` in `tjbot.toml`
2. Models are automatically downloaded on first use (may take a few minutes)

#### Example Configuration

```toml
[listen.backend]
type = 'local'

[listen.backend.local]
model = 'sherpa-onnx-whisper-base.en'

[speak.backend]
type = 'local'

[speak.backend.local]
model = 'vits-piper-en_US-arctic-medium'

[see.backend]
type = 'local'

[see.backend.local]
objectDetectionModel = 'ssd-mobilenet-v2'
imageClassificationModel = 'mobilenetv3'
faceDetectionModel = 'yunet'
```

> 💡 Check out the complete list of
> [Text to Speech](https://github.com/k2-fsa/sherpa-onnx/releases/tag/tts-models)
> and
> [Speech to Text](https://github.com/k2-fsa/sherpa-onnx/releases/tag/asr-models)
> models.

#### Custom Models & Model Registry

TJBot ships with a built-in model registry in
[config/model-registry.yaml](config/model-registry.yaml) for speech (STT/TTS/VAD)
and vision tasks. You can register additional ONNX models in your tjbot.toml
file (create one or copy [config/tjbot.default.toml](config/tjbot.default.toml))
using the [[models]] array. Custom entries are merged with the built-in registry
and can be referenced by key in your configuration.

Example: register a custom vision classification model and use it locally:

```toml
[[models]]
type = 'vision.classification'
key = 'my-classifier'
label = 'My Classifier'
url = 'file:///home/pi/models/my-classifier.zip'
folder = 'my-classifier'
kind = 'classification'
required = ['model.onnx', 'labels.txt']
labelUrl = 'file:///home/pi/models/labels.txt'
inputShape = [1, 3, 224, 224]

[see.backend]
type = 'local'

[see.backend.local]
imageClassificationModel = 'my-classifier'
```

You can register custom speech models the same way and then set
`listen.backend.local.model` or `speak.backend.local.model` to your custom key.

### IBM Watson Backend (Speech)

To use IBM Watson services for Speech-to-Text and Text-to-Speech, you need an
IBM Cloud account and Watson service credentials.

#### IBM Watson Setup

1. Create an [IBM Cloud](https://www.ibm.com/cloud) account if you do not
   have one already
2. Create instances of the IBM Watson
   [Speech to Text](https://www.ibm.com/products/speech-to-text) and/or
   [Text to Speech](https://www.ibm.com/products/text-to-speech) services
3. Download your service credentials from the IBM Cloud console (go to your
   service instance → "Manage" → "Credentials" → download credentials)
4. Save your credentials in an `ibm-credentials.env` file (see "IBM
   Credentials File Location" below)
5. Set `type = 'ibm-watson-stt'` and/or `type = 'ibm-watson-tts'` under
   `[listen.backend]` and `[speak.backend]`

#### IBM Credentials File Location

TJBot automatically searches for your `ibm-credentials.env` file in the
following order:

1. **Explicit path in configuration** – If you specify `credentialsPath` in
   your `tjbot.toml` file, TJBot will use that path
2. **Current working directory** – TJBot looks for `./ibm-credentials.env`
   in your project directory
3. **Home directory** – TJBot looks for `~/.tjbot/ibm-credentials.env` in
   your home directory

If the credentials file is not found in any of these locations, TJBot will
throw an error when initializing the IBM Watson backend.

**Recommended:** Place your credentials file in `~/.tjbot/ibm-credentials.env`
so all your TJBot projects can share the same credentials.

#### IBM Watson Configuration Example

```toml
[listen.backend]
type = 'ibm-watson-stt'

[speak.backend]
type = 'ibm-watson-tts'

[speak.backend.ibm-watson-tts]
voice = 'en-US_EmilyV3Voice'
# Optional: specify a custom path to your credentials file
# credentialsPath = '/path/to/ibm-credentials.env'
```

> 💡 Check out the complete list of
> [Text-to-Speech voices](https://cloud.ibm.com/docs/text-to-speech?topic=text-to-speech-voices).

### Google Cloud Backend (Speech + Vision)

1. Create a Google Cloud project and enable **Speech-to-Text**, **Text-to-Speech**,
   and **Vision** APIs
2. Create a service account and download its credentials to
   `google-credentials.json`
3. Set `type = 'google-cloud-stt'`, `type = 'google-cloud-tts'`, and
   `type = 'google-cloud-vision'` under the respective backend sections

```toml
[listen.backend]
type = 'google-cloud-stt'

[speak.backend]
type = 'google-cloud-tts'

[see.backend]
type = 'google-cloud-vision'
```

### Microsoft Azure Backend (Speech + Vision)

1. Create Azure resources for **Speech-to-Text**, **Text-to-Speech**, and
   **Computer Vision**
2. Save your credentials in `azure-credentials.env`
3. Set `type = 'azure-stt'`, `type = 'azure-tts'`, and `type = 'azure-vision'`
   under the respective backend sections

```toml
[listen.backend]
type = 'azure-stt'

[speak.backend]
type = 'azure-tts'

[see.backend]
type = 'azure-vision'
```

> 💡 Image description is supported when using Azure Vision.

## API Documentation

For detailed API documentation, method signatures, and advanced usage, visit
the [TJBot API Reference](https://ibmtjbot.github.io/docs/node-tjbotlib/3.0.0/).

## Testing

The library uses [Vitest](https://vitest.dev/) for testing with two tiers of
tests:

### Automated Tests (Core Tests)

Unit tests that run on any system with mocked hardware. These tests verify
the library's core functionality.

```bash
# Run all automated tests
npm test

# Run tests with coverage report
npm run test:coverage
```

These tests run on a Raspberry Pi but do not require any specific TJBot
hardware.

> ⚠️ TJBot's software has not been tested on operating systems or hardware
> other than Raspian OS on Raspberry Pi.

### Interactive Hardware Tests (Live Tests)

Manual verification tests that run on actual Raspberry Pi hardware. These
tests validate specific components:

- Camera: `npm run test-camera`
- LED: `npm run test-led`
- Microphone: `npm run test-microphone`
- Servo: `npm run test-servo`
- Speaker (playback): `npm run test-speaker`
- Speech-to-Text: `npm run test-stt`
- Text-to-Speech: `npm run test-tts`
- Vision: `npm run test-vision`

> ⚠️ These tests must be run on a Raspberry Pi with properly connected
> hardware components.

#### Running Tests with Debugging

To run tests with VS Code debugging enabled:

1. Open the Debug panel in VS Code or use the debug dropdown menu
2. Select a debug configuration (e.g., **"Test STT"** or **"Test TTS"**)
3. Press `F5` to start debugging
4. Set breakpoints in the test files as needed

The test will pause at breakpoints and allow you to step through the code.

## Development

### Setting Up a Development Environment

To contribute to the TJBot library:

1. **Clone the repository:**

   ```bash
   git clone https://github.com/ibmtjbot/node-tjbotlib.git
   cd node-tjbotlib
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Build the TypeScript code:**

   ```bash
   npm run build
   ```

4. **Run tests:**

   ```bash
   npm test
   npm run test:coverage
   ```

5. **Lint and format code:**

   ```bash
   npm run lint
   npm run lint:fix
   npm run format
   npm run format:check
   ```

To write a TJBot receipe using a local version of `node-tjbotlib`:

1. Create a new directory for writing your new recipe. This directory should
   be outside of the `node-tjbotlib` directory.

   ```sh
   cd Desktop
   mkdir tjbot-recipe && cd tjbot-recipe
   npm init
   ...
   cat > index.js
   import TJBot from 'tjbot';
   const tj = new TJBot();
   <ctrl-d>
   ```

   > 🤔 Since we use `import` in the example above, remember to add
   > `"type": "module"` to your `package.json` file for `node` to be able to
   > run the script!

2. Install the local checkout of `node-tjbotlib` using `npm`:

   ```sh
   npm install ~/Desktop/node-tjbotlib/
   ```

3. Run your script.

   ```sh
   node index.js
   ```

### Project Structure

```plaintext
node-tjbotlib/
├── src/                   # TypeScript source code
│   ├── tjbot.ts           # Main TJBot class
│   ├── @types/            # TypeScript type definitions
│   ├── camera/            # Camera module
│   ├── config/            # Configuration parsing and model registry
│   ├── led/               # LED control (NeoPixel, Common Anode)
│   ├── microphone/        # Microphone module
│   ├── rpi-drivers/       # Raspberry Pi hardware drivers
│   ├── servo/             # Servo module
│   ├── speaker/           # Speaker module
│   ├── stt/               # Speech-to-Text module
│   ├── tts/               # Text-to-Speech module
│   ├── utils/             # Utilities, constants, and model registry
│   └── vision/            # Vision module (object detection, classification, face detection)
├── tests/
│   ├── core/              # Automated unit tests
│   └── live/              # Interactive hardware tests
├── dist/                  # Compiled JavaScript (generated by build)
├── tsconfig.json          # TypeScript configuration
├── vitest.config.ts       # Vitest configuration
├── eslint.config.mjs      # ESLint configuration
└── README.md              # Project README
```

### Making Changes

1. Create a feature branch: `git checkout -b feature/my-feature`
2. Make your changes in the `src/` directory
3. Run tests to ensure nothing is broken: `npm test`
4. Build the project: `npm run build`
5. Run linting: `npm run lint:fix`
6. Commit your changes with clear messages
7. Push to your fork and create a Pull Request

### Code Style

This project uses:

- **TypeScript** for type safety
- **ESLint** for code linting (run `npm run lint:fix` to auto-fix)
- **Prettier** for code formatting (run `npm run format` to auto-format)
- **Vitest** for testing

## Contributing

We welcome contributions! To contribute:

1. Fork the repository on GitHub
2. Create a feature branch for your changes
3. Ensure all tests pass and code is properly formatted
4. Submit a Pull Request with a clear description of your changes

For larger contributions, please open an issue first to discuss your proposed changes.

## License

This project is licensed under the [Apache License 2.0](LICENSE).

## Resources

- [TJBot Project](http://ibm.biz/mytjbot) – Official TJBot website
- [TJBot API Reference](https://ibmtjbot.github.io/docs/node-tjbotlib/3.0.0/)
  – Complete API documentation
- [sherpa-onnx](https://github.com/k2-fsa/sherpa-onnx) – Local speech
  processing engine
- [IBM Watson Documentation](https://cloud.ibm.com/docs/watson) – IBM Watson
  services
- [Raspberry Pi Documentation](https://www.raspberrypi.com/documentation/)
  – RPi setup and troubleshooting
- [TOML Specification](https://toml.io/en/) – Configuration file format

## Troubleshooting

For troubleshooting help, visit the
[TJBot wiki](https://github.com/ibmtjbot/tjbot/wiki) or open an issue on
GitHub.
