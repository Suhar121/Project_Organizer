# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog,
and this project uses Semantic Versioning.

## [Unreleased]

### Added
- Open-source project governance docs (`CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `LICENSE`)
- GitHub issue/PR templates under `.github/`
- Backend and frontend documentation refresh
- Saved command stream panel with attach/reopen and explicit kill behavior

### Changed
- Root README rewritten for clearer setup, architecture, and contribution flow
- Backend package scripts and metadata improved for OSS usage
- Runtime data ignore rules updated in `.gitignore`

### Fixed
- Command panel close behavior no longer kills running process
- Duplicate command start behavior now re-attaches to the existing running command session
