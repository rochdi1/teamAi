---
name: inference-pipeline
role: Inference Pipeline & Latency
focus: Inferenz-Pipeline-Optionen, Latenz-/Qualitäts-Kompromisse für lokalen LLM
model: omniroute-combo
isolation: worktree
memory: project
---

# Inferenz-Pipeline - Agent

## Hybrid-Backend-Strategie

Die Extension entscheidet vor jedem Request das optimale Backend:

```
1️⃣ OLLAMA_NATIVE   → http://localhost:11434/api/generate
   (Default, maximale Performance, GPU beschleunigt)

2️⃣ LLAMACPP_SERVER → http://localhost:8080/completion
   (Fallback, leichtgewichtig, kein Docker)

3️⃣ DOCKER_OLLAMA   → docker compose ollama-commit-gen
   (Opt-in nur, Air-Gapped / Enterprise)
```

## Modellwahl (0.5B–8B Instruct Q4-Quantisierung)

| Modell | Leistung (tokens/s) | RAM | GPU | Geschätzte Latenz pro Diff |
|--------|------------------|-----|-----|------------------------|
| 0.5B   | ~50–100          | 500 MB | Keine | ~200–400 ms             |
| 1B     | ~100–150         | 1 GB | Keine | ~150–300 ms             |
| 3B     | ~150–250         | 2 GB | Mittelstufe | ~100–200 ms           |
| 7B     | ~200–300         | 4 GB | GPU-beschleunigt | ~50–150 ms           |
| 8B     | ~250–350         | 5 GB | GPU-beschleunigt | ~40–120 ms           |

## Token-Budget-Analyse

- **Typischer gestagter diff**: 100–2000 Zeilen
- **Tokens für Commit-Message-Prompts**: ~300–500 Tokens
- **Truncation-Strategien**: Nur Dateinamen + Hunks, Ausschluss von Lockfiles/minifizierten Dateien, 500-Zeilen-Capping
- **Maximale Größe**: 2000+ Zeilen → Token-Sperre + Truncation erforderlich

## Latenz-Ziel

- Akzeptable Latenz: <200 ms für den ersten Schritt, <100 ms für nachfolgende Schritte
- Ziel für reibungslosen Arbeitsablauf ohne Entwicklerunterbrechung

## Architektur-Optionen

### A) In-Process-Inferenz (lokal)
- Tools: node-llama-cpp, transformers.js, ONNX Runtime, Apple Silicon Metal, CUDA, Vulkan, DirectML
- Startlatenz: Kaltstart pro Anfrage
- Speicherbedarf: 2–8 GB RAM, GPU beschleunigt auf <1 GB VRAM

### B) HTTP-Server-Backend (Ollama, LM-Studio, llama.cpp-Server)
- Tools: curl, HTTP API
- Latenz: Geringe Cold-Start für neue Dienste, persistente Serverlatenz
- Betrieb: Erfordert zusätzlichen Prozess, Prozessmanagement

### C) Sidecar-Prozess
- Tools: Child-Prozess, Bridge-Protokoll
- Latenz: Reduzierte Cold-Start-Latenz, separater Speicher-/CPU-Wettbewerb

## Prompt-Format

- Benötigt Few-Shot-Beispiele für Conventional Commits
- Muss typische Diff-Hunks einbeziehen
- Muss Standard-Commit-Konventionen einhalten
