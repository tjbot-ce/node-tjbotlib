# TJBot Library (Node.js)

[![Raspberry Pi](https://img.shields.io/badge/Raspberry%20Pi-3B+-cc342d)](https://www.raspberrypi.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20%2B-yellow)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)](https://typescriptlang.org/)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)

## What is TJBot?

[TJBot](https://tjbot-ce.github.io) is an open-source robot created by IBM for
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

This library supports **local AI backends** ([sherpa-onnx](https://github.com/k2-fsa/sherpa-onnx) for speech, [ONNX
runtime](https://onnxruntime.ai) for vision) and **cloud services** for speech and vision, including IBM
Watson (speech), Google Cloud (speech + vision), and Microsoft Azure (speech +
vision).

## System Dependencies

Install additional system packages:

```bash
sudo apt-get install libgpiod-dev liblgpiod-dev rpicam-apps-lite tidy
```

> [!TIP]
> These packages are installed as part of TJBot's setup script.

## Installation

Install the library from npm:

```bash
npm install --save tjbot
```

## Quick Start

### Importing TJBot

TJBot uses ES6 module syntax:

```ts
import TJBot from 'tjbot';
```

### Example 1: Control an LED

This example initializes a NeoPixel LED and sets its color:

```ts
import TJBot from 'tjbot';

const tj = TJBot.getInstance().initialize({
   hardware: {
      led: true
   },
   shine: {
      hasNeopixelLED: true,
      neopixel: {
         gpioPin: 18  // or your LED's GPIO pin
      }
   }
});

// Set LED to red
await tj.shine('red');

// Set LED to a custom hex color
await tj.shine('#00FF00');

// Pulse the LED
await tj.pulse('blue');
```

### Example 2: Speak Text using Text-to-Speech (TTS)

This example demonstrates how to make TJBot speak!

> [!NOTE]
> The text-to-speech backend used by TJBot is set in TJBot's configuration file, located at `~/.tjbot/tjbot.toml`. By default, TJBot uses the `sherpa-onnx` text-to-speech backend.

```ts
import TJBot from 'tjbot';

const tj = TJBot.getInstance().initialize({
   hardware: {
      speaker: true
   }
});

await tj.speak('Hello, I am TJBot!');
```

### Example 3: Change TJBot's Configuration

TJBot uses a cascading configuration system that loads settings from multiple
sources in order of priority. First, default configuration settings are loaded from the `tjbot.default.toml` file that is bundled within `node-tjbotlib`. Next, user-specific configuration is loaded from the `~/.tjbot/tjbot.toml` file. Finally, recipe-specific configuration is loaded from the `recipe.toml` file in your current working directory (if present).

**User configuration (`~/.tjbot/tjbot.toml`):**

This file contains configuration settings for the hardware components of your TJBot, such as which pins the LED and servo are connected to, which audio devices to use for recording & playback, and which STT/TTS/Vision backends to use. Example:

```toml
[log]
level = 'debug' # TJBot will print a lot of detail about its operations to the console

[shine.neopixel]
gpioPin = 18 # GPIO 18 / Physical Pin 12

...
```

> [!TIP]
> You can either use the `tjbot config` command to edit TJBot's configuration or you can edit the `~/.tjbot/tjbot.toml` file directly.

**Recipe-specific configuration (`recipe.toml`):**

This file contains configuration settings for your recipe. It is placed in
your project directory.

```toml
tjbot_name = "tinker"
favorite_color = "blue"
cloud_api_key = "xyzabc"
```

Recipe-specific settings are loaded using the `TJBot.getRecipeConfig()` class method.

```ts
import TJBot from 'tjbot';

// read recipe-specific config
const config = TJBot.getRecipeConfig();

const tj = TJBot.getInstance().initialize({
   hardware: {
      led: true
   }
});

const favorite_color = config.favorite_color as string;
tj.shine(favorite_color);
```

## Configuration Reference

TJBot uses [TOML](https://toml.io/en/) for its configuration. The canonical default configuration lives in [vendor/tjbot-config/tjbot.default.toml](vendor/tjbot-config/tjbot.default.toml) and is synced into [src/config/tjbot.default.toml](src/config/tjbot.default.toml) during builds.

### Custom Models & Model Registry

TJBot ships with a built-in model registry in
[vendor/tjbot-config/model-registry.yaml](vendor/tjbot-config/model-registry.yaml). The registry is synced into [src/config/model-registry.yaml](src/config/model-registry.yaml) during builds for local development and packaging. You can register additional ML models in your `~/.tjbot/tjbot.toml` file. Search for the section titled "On-Device ML Models".

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

You can register custom speech models in the same way.

## API Documentation

For detailed API documentation, method signatures, and advanced usage, visit
the [TJBot API Reference](https://tjbot-ce.github.io/docs/node-tjbotlib/3.0.0/).

## Testing

The library uses [Vitest](https://vitest.dev/) for testing with two tiers of
tests:

### Automated Tests (Core Tests)

TJBot ships with a number of unit tests that verify the library's core functionality.

```bash
# Run all automated tests
npm run test

# Run tests with coverage report
npm run test:coverage
```

These tests run on a Raspberry Pi but do not require any specific TJBot
hardware.

> [!WARNING]
> TJBot's software has not been tested on operating systems or hardware
> other than Raspian OS on Raspberry Pi.

### Interactive Hardware Tests (Live Tests)

TJBot also ships with a number of interactive tests meant to test (and debug) your Raspberry Pi hardware setup. These tests validate each of these components:

```bash
# Test the camera
npm run test-camera

# Test the LED
npm run test-led

# Test the microphone
npm run test-microphone

# Test the servo
npm run test-servo

# Test the speaker
npm run test-speaker

# Test the STT service (allows you to choose which backend to use)
npm run test-stt

# Test the TTS service (allows you to choose which backend to use)
npm run test-tts

# Test the Vision service (allows you to choose which backend to use and which vision task to perform)
npm run test-vision
```

> [!WARNING]
> These tests must be run on a Raspberry Pi with properly connected hardware components.

## Development

To set up a local development environment, you will first need to check out `node-tjbotlib` from GitHub. Then you will create a new recipe and point it to your locally-checked out copy of `node-tjbotlib`.

### Clone `node-tjbotlib`

1. **Clone the repository**

   ```bash
   git clone --recurse-submodules https://github.com/tjbot-ce/node-tjbotlib.git
   cd node-tjbotlib
   ```

   If you already cloned the repo without submodules, run:

   ```bash
   git submodule update --init --recursive
   ```

   This initializes the shared TJBot configuration assets submodule at `vendor/tjbot-config`.

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Build the TypeScript code**

   ```bash
   npm run build
   ```

4. **Link the repository for npm**

   ```bash
   npm link
   ```

5. **Run tests**

   ```bash
   npm run test
   ```

6. **Lint and format code**

   ```bash
   npm run lint
   npm run format
   ```

### Create a Recipe

Create a new recipe using `tjbot create <recipe>`, then link it to the local version of `node-tjbotlib`.

1. **Create a new recipe**

   ```bash
   tjbot create my_recipe
   ```

2. **Link the recipe to the local `node-tjbotlib`**

   ```bash
   cd my_recipe
   npm link tjbot
   ```

3. **Install dependencies**

   ```bash
   npm install
   ```

## Troubleshoot

If you are having difficulties in making your TJBot work, please see the [troubleshooting guide](https://github.com/tjbot-ce/tjbot/wiki/Troubleshooting-TJBot).

## Contribute

If you would like to contribute to TJBot, please see the [contributor's guide](https://github.com/tjbot-ce/tjbot/wiki/Contributing-to-TJBot).

## License

This project is licensed under Apache 2.0. Full license text is available in [LICENSE](LICENSE).
