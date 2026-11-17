/**
 * inference-provider.ts
 *
 * Backend-Detection und -Routing für lokale LLM-Inferenz
 * in der VS Code-Erweiterung "AI Commit Message Generator".
 *
 * Hybrid-Strategie:
 *   1. Native Ollama (Default, maximale Performance)
 *   2. llama.cpp Server (Fallback, leichtgewichtig)
 *   3. Docker-Ollama (Opt-in nur, für Air-Gapped/Enterprise)
 *
 * Jedes Backend wird vor dem ersten Request geprüft.
 */

import * as vscode from 'vscode';
import { execSync } from 'child_process';

export enum InferenceBackend {
  OLLAMA_NATIVE = 'ollama-native',
  LLAMACPP_SERVER = 'llamacpp-server',
  DOCKER_OLLAMA = 'docker-ollama',
}

export interface BackendStatus {
  kind: InferenceBackend;
  available: boolean;
  latencyMs?: number;
  model?: string;
  note?: string;
}

const HEALTH_TIMEOUT_MS = 2000;

/**
 * Erkennt das beste verfügbare lokale Inferenz-Backend.
 * Reihenfolge: Ollama nativ → llama.cpp → Docker (nur wenn aktiviert).
 */
export async function detectBestBackend(): Promise<InferenceBackend> {
  const ollama = await isOllamaNativeHealthy();
  if (ollama.available) {
    return InferenceBackend.OLLAMA_NATIVE;
  }

  const llamacpp = await isLlamaCppServerHealthy();
  if (llamacpp.available) {
    return InferenceBackend.LLAMACPP_SERVER;
  }

  const dockerAllowed = vscode.workspace
    .getConfiguration('aiCommitGen')
    .get<boolean>('allowDockerBackend', false);

  if (dockerAllowed) {
    const docker = await isDockerOllamaHealthy();
    if (docker.available) {
      return InferenceBackend.DOCKER_OLLAMA;
    }
  }

  throw new Error(
    'Kein lokales LLM-Backend gefunden. Installiere Ollama: https://ollama.com ' +
      'oder aktiviere den Docker-Fallback in den Einstellungen.'
  );
}

/**
 * Prüft, ob Ollama nativ installiert ist und der Dienst antwortet.
 */
export async function isOllamaNativeHealthy(): Promise<BackendStatus> {
  const start = Date.now();
  try {
    execSync('which ollama', { stdio: 'ignore' });
    const res = execSync('curl -s http://localhost:11434/api/tags', {
      timeout: HEALTH_TIMEOUT_MS,
    }).toString();
    const tags = JSON.parse(res);
    const model = tags?.models?.[0]?.name ?? 'unbekannt';
    return {
      kind: InferenceBackend.OLLAMA_NATIVE,
      available: true,
      latencyMs: Date.now() - start,
      model,
      note: 'Nativ installiert, ideal für GPU (CUDA/Metal/DirectML).',
    };
  } catch (err) {
    return {
      kind: InferenceBackend.OLLAMA_NATIVE,
      available: false,
      note: `Ollama nicht erreichbar: ${(err as Error).message}`,
    };
  }
}

/**
 * Prüft, ob ein llama.cpp-Server-Binary verfügbar ist.
 */
export async function isLlamaCppServerHealthy(): Promise<BackendStatus> {
  const start = Date.now();
  try {
    execSync('which llama-server', { stdio: 'ignore' });
    const res = execSync('curl -s http://localhost:8080/health', {
      timeout: HEALTH_TIMEOUT_MS,
    }).toString();
    return {
      kind: InferenceBackend.LLAMACPP_SERVER,
      available: res.includes('ok') || res.length === 0,
      latencyMs: Date.now() - start,
      note: 'llama.cpp Server als Fallback.',
    };
  } catch (err) {
    return {
      kind: InferenceBackend.LLAMACPP_SERVER,
      available: false,
      note: `llama-server nicht erreichbar: ${(err as Error).message}`,
    };
  }
}

/**
 * Prüft, ob der Docker-Ollama-Container läuft.
 */
export async function isDockerOllamaHealthy(): Promise<BackendStatus> {
  const start = Date.now();
  try {
    execSync('docker ps --filter name=ollama-commit-gen --format "{{.Names}}"', {
      stdio: 'ignore',
    });
    const res = execSync('curl -s http://localhost:11434/api/tags', {
      timeout: HEALTH_TIMEOUT_MS,
    }).toString();
    return {
      kind: InferenceBackend.DOCKER_OLLAMA,
      available: true,
      latencyMs: Date.now() - start,
      note: 'Docker-Container aktiv (Air-Gapped/Enterprise).',
    };
  } catch (err) {
    return {
      kind: InferenceBackend.DOCKER_OLLAMA,
      available: false,
      note: `Docker-Backend nicht aktiv: ${(err as Error).message}`,
    };
  }
}

/**
 * Erzeugt eine Commit-Nachricht aus einem staged Diff.
 * Nutzt das erkannte Backend.
 */
export async function generateCommitMessage(diffText: string): Promise<string> {
  const backend = await detectBestBackend();
  const prompt = buildPrompt(diffText);

  switch (backend) {
    case InferenceBackend.OLLAMA_NATIVE:
      return callOllama(prompt, 'llama3.1:3b-instruct-q4_K_M');
    case InferenceBackend.LLAMACPP_SERVER:
      return callLlamaCpp(prompt);
    case InferenceBackend.DOCKER_OLLAMA:
      return callOllama(prompt, 'llama3.1:3b-instruct-q4_K_M');
    default:
      throw new Error(`Unbekanntes Backend: ${backend}`);
  }
}

/**
 * Baut den Prompt für die Commit-Message-Generierung.
 * Verwendet Few-Shot-Beispiele für Conventional Commits.
 */
function buildPrompt(diffText: string): string {
  const trimmed = truncateDiff(diffText, 3000);
  return `Du bist ein Commit-Message-Generator. Erzeuge eine präzise Conventional-Commit-Message.

Regeln:
- Nutze Conventional Commits (feat, fix, chore, docs, refactor, test, perf)
- Maximal 72 Zeichen in der Subject-Zeile
- Imperativ, kein Punkt am Ende
- Keine Halluzinationen: nur das beschreiben, was im Diff sichtbar ist

Beispiele:
  Diff: "add validateEmail function to auth.ts"
  Message: "feat(auth): add email validation helper"

  Diff: "remove deprecated logger import"
  Message: "chore: remove deprecated logger import"

Hier ist der Diff:
${trimmed}

Message:`;
}

/**
 * Trunciert einen Diff auf maximale Zeichenzahl (Richtung Tokens ~ 4 Zeichen).
 */
function truncateDiff(diff: string, maxChars: number): string {
  if (diff.length <= maxChars) {
    return diff;
  }
  return diff.slice(0, maxChars) + '\n... (truncated, siehe git diff --staged)';
}

async function callOllama(prompt: string, model: string): Promise<string> {
  const body = JSON.stringify({
    model,
    prompt,
    stream: false,
    options: {
      temperature: 0.2,
      num_predict: 64,
      stop: ['\n\n'],
    },
  });
  const res = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
  const data = (await res.json()) as { response?: string };
  return (data.response ?? '').trim();
}

async function callLlamaCpp(prompt: string): Promise<string> {
  const body = JSON.stringify({
    prompt,
    n_predict: 64,
    temperature: 0.2,
    stop: ['\n\n'],
  });
  const res = await fetch('http://localhost:8080/completion', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
  const data = (await res.json()) as { content?: string };
  return (data.content ?? '').trim();
}

/**
 * Aktiviert den VS Code Statusbar-Indicator für das aktive Backend.
 */
export function registerBackendStatusBar(context: vscode.ExtensionContext) {
  const item = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    100
  );
  item.command = 'aiCommitGen.showBackend';
  context.subscriptions.push(item);

  async function refresh() {
    try {
      const backend = await detectBestBackend();
      item.text = `$(server) ${backend}`;
      item.tooltip = `Aktives LLM-Backend: ${backend}`;
      item.show();
    } catch {
      item.text = '$(warning) Kein LLM';
      item.show();
    }
  }

  vscode.commands.registerCommand('aiCommitGen.showBackend', refresh);
  refresh();
  setInterval(refresh, 30_000);
}
