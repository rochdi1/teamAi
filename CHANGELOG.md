# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-11-17

### Added

- Agent Team Setup (`dev-acceptance`, `inference-pipeline`, `skeptic-proof`)
- Backend Detection Logic (Ollama → llama.cpp → Docker)
- Docker-Fallback via `docker-compose.yml` + `proxy/app.py`
- VS Code Statusbar Indicator
- Quality Gates (hooks)
- Full Documentation (`README_Agent_Teams_Documentation.md`)
- Agent Team Synthesis Review (`reports/commit-message-review-2026-11-17.md`)
- VS Code Extension Package (`ai-commit-gen-0.2.0.vsix`)

### Changed

- Updated `inference-pipeline` agent with hybrid strategy details
- Updated model comparison tables

### Fixed

- TypeScript compilation errors in QuickPick handling

## [0.1.0] - 2026-11-17

### Added

- Initial concept: VS Code extension to generate commit messages from staged diffs
- Agent Team: "Skeptiker", "Inferenz-Pipeline", "Dev-Acceptance"
- Local LLM integration architecture (Ollama, llama.cpp, Docker)
- Token-Budget & truncation strategies

---

**Release Notes**: 0.2.0 is feature-complete for the Agent-Team-Review phase.
0.1.0 is the core LLM-Commit-Generator.

## [Unreleased]

### Planned

- End-to-end testing with real staged diffs
- VS Code UI polish
- Performance benchmarks
- CI/CD integration