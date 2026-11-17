---
name: inference-pipeline
role: Inference Pipeline & Latency
focus: Inferenz-Pipeline-Optionen, Latenz-/Qualitäts-Kompromisse für lokalen LLM
model: omniroute-combo
isolation: worktree
memory: project
---

# Inferenz-Pipeline - Agent

## 🎯 Ziel
Generiere präzise Conventional Commit-Nachrichten aus staged diffs mit einem lokalen LLM.
Ermöglicht parallelisierte, koordinierte Arbeit durch **Agent Teams**.

---

## 🔀 Hybrid-Strategie (Backend-Detection)

Der `src/inference-provider.ts` entscheidet vor jedem Request das optimale Backend:

```
1️⃣ OLLAMA_NATIVE   → http://localhost:11434/api/generate
   (Default, maximale Performance, GPU beschleunigt)

2️⃣ LLAMACPP_SERVER → http://localhost:8080/completion
   (Fallback, leichtgewichtig, kein Docker)

3️⃣ DOCKER_OLLAMA   → docker compose ollama-commit-gen
   (Opt-in nur, Air-Gapped / Enterprise)
```

```typescript
export async function detectBestBackend(): Promise<InferenceBackend> {
  // Ollama nativ?
  if (await isOllamaNativeHealthy().available) return InferenceBackend.OLLAMA_NATIVE;
  // llama.cpp Server?
  if (await isLlamaCppServerHealthy().available) return InferenceBackend.LLAMACPP_SERVER;
  // Docker aktiviert?
  if (vscode.workspace.getConfiguration('aiCommitGen').get('allowDockerBackend', false)) {
    if (await isDockerOllamaHealthy().available) return InferenceBackend.DOCKER_OLLAMA;
  }
  throw new Error('Kein lokales LLM-Backend gefunden...');
}
```

---

## 📊 Modell-Tabellen

### A) In-Process (Node)
| Modell | tokens/s | RAM | GPU | Latenz |
|--------|----------|-----|-----|--------|
| 0.5B | 50–100 | 500 MB | Keine | 200–400 ms |
| 1B | 100–150 | 1 GB | Keine | 150–300 ms |
| 3B | 150–250 | 2 GB | Mittel | 100–200 ms |
| 7B | 200–300 | 4 GB | GPU | 50–150 ms |
| 8B | 250–350 | 5 GB | GPU | 40–120 ms |

### B) HTTP-Server (Ollama/LM-Studio/llama.cpp)
- **Tools**: curl, HTTP API
- **Latenz**: Persistente Serverlatenz, keine Cold Start

### C) Sidecar
- **Tools**: Child-Prozess, Bridge-Protokoll
- **Latenz**: Reduzierte Cold-Start, separater CPU/WM

---

## 💧 Token-Budget & Truncation

| Aspekt | Wert |
|--------|------|
| Typischer gestagter diff | 100–2000 Zeilen |
| Tokens für Prompt | ~300–500 Tokens |
| Truncation | Nur Dateinamen + Hunks; Lockfiles/minifizierte Dateien ausgeschlossen; 500-Zeilen-Capping |
| Maximal erlaubte Zeilen | 2000+ → Token-Sperre + Truncation nötig |

---

## 🐳 Docker-Fallback (Enterprise / Air-Gapped)

**docker-compose.yml** erstellt (`docker-compose.yml`). Aktivieren über Einstellung `allowDockerBackend=true`.

```yaml
services:
  ollama:
    image: ollama/ollama:latest
    ports: ["11434:11434"]
    volumes: ["/home/ollama/.ollama:/home/ollama"]
    devices: ["/dev/dri:/dev/dri"]

  inference-proxy:
    image: python:3.11-slim
    depends_on: [ollama]
    command: sh -c "pip install flask && python app.py"
    ports: ["11435:8000"]
```

---

## ⚙️ VS Code Statusbar Indicator

```ts
registerBackendStatusBar(context: vscode.ExtensionContext) {
  const item = vscode.window.createStatusBarItem(Left, 100);
  item.command = 'aiCommitGen.showBackend';
  context.subscriptions.push(item);

  async function refresh() {
    try { item.text = `$(server) ${detectBestBackend()}`; ... }
    } catch { item.text = '$(warning) Kein LLM'; ... }
  }
  vscode.commands.registerCommand('aiCommitGen.showBackend', refresh);
  setInterval(refresh, 30_000);
}
```

---

## 🚦 Einsatzzustand

- **Aktiv**: 3 Agenten laufen im Hintergrund
- **Lead**: Du (Claude Code Session)
- **Teammitglieder**:
  - `dev-acceptance`
  - `inference-pipeline`
  - `skeptic-proof`

---

*Erweitert am 17.11.2026*