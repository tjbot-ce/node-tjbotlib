# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [3.0.2] - 2026-06-25

### Added

- `timeout` parameter to `listen()`, allowing callers to bound how long TJBot will listen for speech.
- Tests for logging levels to match parity with `python-tjbotlib`.

## [3.0.1] - 2026-06-11

### Fixed

- Documentation that was not updated for the package rename to `tjbot-ce` in 3.0.0.

## [3.0.0] - 2026-06-09 [YANKED]

### Changed

- Package renamed from `tjbot` to `tjbot-ce`.

### Note

This release was yanked because the documentation still referenced the old
`tjbot` package name. See 3.0.1 for the fix.

[Unreleased]: https://github.com/tjbot-ce/node-tjbotlib/compare/v3.0.2...HEAD
[3.0.2]: https://github.com/tjbot-ce/node-tjbotlib/compare/v3.0.1...v3.0.2
[3.0.1]: https://github.com/tjbot-ce/node-tjbotlib/compare/v3.0.0...v3.0.1
[3.0.0]: https://github.com/tjbot-ce/node-tjbotlib/releases/tag/v3.0.0
