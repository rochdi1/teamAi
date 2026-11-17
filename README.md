# AI Commit Message Generator

Eine VS Code-Erweiterung, die aus **staged diffs** automatisch **Commit-Nachrichten** mit einem **lokalen LLM** generiert.

## Features

- 🚀 **Vollständig lokal**: Keine Cloud-API, keine Telemetrie, keine Internet-Verbindung nötig
- 🔀 **Hybrid-Backend**: Automatische Erkennung von Ollama nativ, llama.cpp Server oder Docker-Fallback
- ⚡ **Schnell**: Prewarm-Optimierung, Latenzziel <2s (p50)
- 🛡️ **Sicher**: Worktree-Isolation, Schema-Validierung (Conventional Commits), Halluzinations-Detektion
- 🎨 **UX-Fokus**: Preview → Edit → Regenerate → Commit Workflow

## Installation

### Voraussetzungen

1. **Ollama** installieren: https://ollama.com
   ```bash
   curl -fsSL https://ollama.com/install.sh | sh
   ```

2. **Modell herunterladen** (3B Instruct Q4 empfohlen):
   ```bash
   ollama pull llama3.1:3b-instruct-q4_K_M
   ```

3. **Ollama starten**:
   ```bash
   ollama serve
   ```

### Extension installieren

```bash
# Aus dem Quellcode
cd /home/casa/AI_Project/teamAi
npm install
npm run compile
vsce package
code --install-extension ai-commit-gen-0.1.0.vsix
```

Oder direkt aus dem VS Code Marketplace (falls veröffentlicht).

## Verwendung

1. **Dateien staggen**: `git add <dateien>`
2. **Command Palette öffnen**: `Ctrl+Shift+P` (Mac: `Cmd+Shift+P`)
3. **"AI: Generiere Commit-Nachricht"** auswählen
4. **Vorschau prüfen**: Preview → Edit → Regenerate → Commit

### Tastenkürzel

- `Ctrl+Shift+C` (Mac: `Cmd+Shift+C`): Commit-Nachricht generieren

## Konfiguration

| Einstellung | Standard | Beschreibung |
|-------------|----------|--------------|
| `aiCommitGen.backend` | `auto` | Backend wählen (auto, ollama-native, llamacpp-server, docker-ollama) |
| `aiCommitGen.model` | `llama3.1:3b-instruct-q4_K_M` | Lokaler Modellname |
| `aiCommitGen.temperature` | `0.2` | Sampling-Temperatur (0 = deterministisch) |
| `aiCommitGen.maxTokens` | `128` | Max. Token für Commit-Nachricht |
| `aiCommitGen.maxDiffChars` | `3000` | Max. Zeichen aus dem staged Diff |
| `aiCommitGen.allowDockerBackend` | `false` | Docker-Fallback erlauben |
| `aiCommitGen.enablePreview` | `true` | Vorschau vor dem Commit anzeigen |

## Architektur

```
┌─────────────────────────────────────┐
│   VS Code Extension Host            │
│  ┌───────────────────────────────┐  │
│  │  extension.ts                 │  │
│  │  - Command Handler            │  │
│  │  - QuickPick UI               │  │
│  └───────────┬───────────────────┘  │
│              │                       │
│  ┌───────────▼───────────────────┐  │
│  │  git-integration.ts           │  │
│  │  - git diff --staged          │  │
│  │  - Branch-Check               │  │
│  └───────────┬───────────────────┘  │
│              │                       │
│  ┌───────────▼───────────────────┐  │
│  │  inference-provider.ts        │  │
│  │  - Backend Detection          │  │
│  │  - Prompt Building            │  │
│  │  - LLM API Call               │  │
│  └───────────┬───────────────────┘  │
└──────────────┼──────────────────────┘
               │
   ┌───────────▼───────────────────┐
   │  Backend (erkannt)            │
   ├───────────────────────────────┤
   │ 1. Ollama Native              │
   │    http://localhost:11434     │
   │ 2. llama.cpp Server           │
   │    http://localhost:8080      │
   │ 3. Docker Ollama (Opt-in)     │
   │    docker compose up          │
   └───────────────────────────────┘
```

## Backend-Detection

Die Extension erkennt automatisch das beste verfügbare Backend:

1. **Ollama nativ** (Default): Max. Performance, GPU-Beschleunigung
2. **llama.cpp Server** (Fallback): Leichtgewichtig, kein Docker
3. **Docker-Ollama** (Opt-in): Nur für Air-Gapped/Enterprise

## Entwicklung

```bash
# Kompilieren
npm run compile

# Watch-Modus
npm run watch

# Lint
npm run lint

# Package (.vsix)
npm run package
```

## Agent-Teams-Review

Dieses Projekt wurde durch ein **Claude Code Agent Team** validiert:

- **dev-acceptance**: Onboarding & UX-Hürden
- **inference-pipeline**: Latenz & Modellwahl
- **skeptic-proof**: Markt-Analyse & Alternativen

Siehe: [reports/commit-message-review-2026-11-17.md](reports/commit-message-review-2026-11-17.md)

## Lizenz

MIT

## Autor

Ihr Name