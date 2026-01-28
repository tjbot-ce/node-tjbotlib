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
- **Look** – Take photos with an integrated camera
- **Shine** – Control an RGB LED in various colors and effects
- **Speak** – Play audio and synthesize speech with Text-to-Speech
- **Wave** – Move its arm using a servo motor

This library supports both **local AI backends** (using sherpa-onnx for
offline speech processing) and **IBM Watson cloud services** for more advanced
capabilities.

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
looks for `tjbot.toml` in the current working directory. Create this file to
override the default settings shown below:

```toml
################################################################################
# TJBot Configuration File
################################################################################

[log]
# Valid logging levels are 'error', 'warning', 'info', 'verbose', 'debug'
# Set this to 'error' or 'warning' to reduce log verbosity
# Set this to 'verbose' or 'debug' to see detailed logs for troubleshooting
level = 'info'

[hardware]
# Hardware devices to initialize with TJBot
# Set to true to enable, false to disable (or omit to disable)
speaker = false          # Text-to-speech synthesis output
microphone = false       # Speech-to-text audio input
led_common_anode = false # LED with common anode (traditional RGB LED)
led_neopixel = false     # Addressable RGB NeoPixel LED
servo = false            # Servo motor for arm/movement
camera = false           # Camera module for image capture

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
#   'local'  -> sherpa-onnx on-device (OFFLINE by default, can also do streaming models)
#   'ibm-watson-stt' -> IBM Cloud STT (STREAMING)
#   'google-cloud-stt' -> Google Cloud STT (STREAMING)
#   'azure-stt' -> Microsoft Azure STT (single-shot, treated as OFFLINE for API usage)
# If you add a callback for an offline model or omit it for a streaming model, TJBot will throw a TJBotError.
type = 'local'

[listen.backend.local]
# DEFAULT MODEL (OFFLINE): Whisper base.en (good accuracy, English-only, ~140MB)
# See src/config/models.yaml for other available models and their URLs.
# More STT models can be found here: https://github.com/k2-fsa/sherpa-onnx/releases/tag/asr-models
model = 'sherpa-onnx-whisper-base.en'
modelUrl = 'https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-whisper-base.en.tar.bz2'

[listen.backend.local.vad]
# Voice activity detection (VAD) is used for local OFFLINE models (e.g. whisper, moonshine).
# When enabled, TJBot uses a VAD model to segment speech and stop on silence.
# Streaming models (zipformer, paraformer) use built-in endpoint detection instead.
# We recommend keeping VAD enabled, but you can disable it if desired.
enabled = true

# DEFAULT MODEL: Silero VAD (~350KB)
# More VAD models can be found here: https://github.com/k2-fsa/sherpa-onnx/releases/tag/asr-models
model = 'silero_vad.onnx'
modelUrl = 'https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/silero_vad.onnx'

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

[see]
# Camera resolution is width x height
# Common resolutions: [1920, 1080], [1280, 720], [640, 480]
cameraResolution = [1920, 1080]

# If true, flips the camera image vertically
verticalFlip = false

# If true, flips the camera image horizontally
horizontalFlip = false

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
# DEFAULT MODEL (OFFLINE): Whisper base.en (good accuracy, English-only, ~140MB)
# See src/config/models.yaml for other available models and their URLs.
# More TTS models can be found here: https://github.com/k2-fsa/sherpa-onnx/releases/tag/tts-models
model = 'vits-piper-en_US-ryan-medium'
modelUrl = 'https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/vits-piper-en_US-ryan-medium.tar.bz2'

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

[wave]
# The GPIO chip and pin number for controlling a servo motor
# connected to TJBot's arm.
gpioChip = 0  # GPIO chip 0
servoPin = 18 # GPIO18 / Physical Pin 12
```

## Setting Up Speech Backends

TJBot supports two backends for speech processing:

### Local Backend (sherpa-onnx)

The local backend uses [sherpa-onnx](https://github.com/k2-fsa/sherpa-onnx)
for speech recognition and synthesis. This runs entirely offline.

<!-- > ⚠️ Local speech recognition (STT) and speech synthesis (TTS) require -->
<!-- > a Raspberry Pi 4 or 5. -->

#### Setup

1. Set `backend = 'local'` in the `[listen]` and `[speak]` sections of
   `tjbot.toml`
2. Models are automatically downloaded on first use (may take a few minutes)

#### Example Configuration

```toml
[listen]
backend = 'local'

[speak]
backend = 'local'

[speak.backend.local]
model = 'vits-piper-en_US-arctic-medium'
modelUrl = 'https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/vits-piper-en_US-arctic-medium.tar.bz2'
```

> 💡 Check out the complete list of
> [Text to Speech](https://github.com/k2-fsa/sherpa-onnx/releases/tag/tts-models)
> and
> [Speech to Text](https://github.com/k2-fsa/sherpa-onnx/releases/tag/asr-models)
> models.

### IBM Watson Backend

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
5. Set `backend = 'ibm-watson-stt'` and/or `backend = 'ibm-watson-tts'` in
   `tjbot.toml`

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
[listen]
backend = 'ibm-watson-stt'

[speak]
backend = 'ibm-watson-tts'

[speak.backend.ibm-watson-tts]
voice = 'en-US_EmilyV3Voice'
# Optional: specify a custom path to your credentials file
# credentialsPath = '/path/to/ibm-credentials.env'
```

> 💡 Check out the complete list of
> [Text-to-Speech voices](https://cloud.ibm.com/docs/text-to-speech?topic=text-to-speech-voices).

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
│   ├── camera/            # Camera module
│   ├── led/               # LED control (NeoPixel, Common Anode)
│   ├── microphone/        # Microphone module
│   ├── servo/             # Servo module
│   ├── speaker/           # Speaker module
│   ├── stt/               # Speech-to-Text module
│   ├── tts/               # Text-to-Speech module
│   ├── config/            # Configuration parsing
│   ├── rpi-drivers/       # Raspberry Pi hardware drivers
│   └── utils/             # Utilities and constants
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
