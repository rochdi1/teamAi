/**
 * extension.ts - Main entry point der VS Code-Erweiterung
 * AI Commit Message Generator
 *
 * Funktionen:
 * 1. Staged Diff holen via `git diff --staged`
 * 2. Backend-Detection (Ollama → llama.cpp → Docker)
 * 3. Commit-Nachricht generieren via LLM
 * 4. Preview UI (QuickPick + Edit + Regenerate)
 * 5. Optionaler Auto-Commit (disabled per Default)
 */

import * as vscode from 'vscode';
import { generateCommitMessage, detectBestBackend } from './inference-provider';
import { getStagedDiff } from './git-integration';

export function activate(context: vscode.ExtensionContext) {
  console.log('AI Commit Message Generator aktiviert.');

  // VS Code Statusbar für Backend-Indikator
  const statusItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    100
  );
  statusItem.command = 'aiCommitGen.showBackend';
  context.subscriptions.push(statusItem);

  async function refreshStatus() {
    try {
      const backend = await detectBestBackend();
      statusItem.text = `$(server) ${backend}`;
      statusItem.tooltip = `Aktives LLM-Backend: ${backend}`;
      statusItem.show();
    } catch {
      statusItem.text = '$(warning) Kein LLM';
      statusItem.show();
    }
  }
  refreshStatus();
  const interval = setInterval(refreshStatus, 30_000);
  context.subscriptions.push({ dispose: () => clearInterval(interval) });

  // Command: Generate Commit Message
  const generateDisposable = vscode.commands.registerCommand(
    'aiCommitGen.generateCommit',
    async () => {
      await handleGenerateCommit();
    }
  );

  // Command: Regenerate (erneut generieren)
  const regenerateDisposable = vscode.commands.registerCommand(
    'aiCommitGen.regenerate',
    async () => {
      await handleGenerateCommit();
    }
  );

  // Command: Show Backend (Debug/Inspect)
  const backendDisposable = vscode.commands.registerCommand(
    'aiCommitGen.showBackend',
    async () => {
      try {
        const backend = await detectBestBackend();
        vscode.window.showInformationMessage(
          `Aktives LLM-Backend: ${backend}`
        );
      } catch (err) {
        vscode.window.showErrorMessage(
          `Kein LLM-Backend verfügbar: ${(err as Error).message}`
        );
      }
    }
  );

  // Command: Settings öffnen
  const settingsDisposable = vscode.commands.registerCommand(
    'aiCommitGen.settings',
    () => {
      vscode.commands.executeCommand('workbench.configuration.open');
    }
  );

  context.subscriptions.push(
    generateDisposable,
    regenerateDisposable,
    backendDisposable,
    settingsDisposable
  );
}

async function handleGenerateCommit() {
  // 1. Staged Diff holen
  const diff = await getStagedDiff();
  if (!diff || diff.trim().length === 0) {
    vscode.window.showInformationMessage(
      'Keine staged Dateien gefunden. Führe `git add` für die gewünschten Dateien aus.'
    );
    return;
  }

  // 2. Backend erkennen
  let backend: string;
  try {
    backend = await detectBestBackend();
  } catch (err) {
    vscode.window.showErrorMessage(
      `Kein LLM-Backend gefunden: ${(err as Error).message}\n\nKonfiguriere in den Settings das gewünschte Backend.`
    );
    return;
  }

  // 3. Commit-Nachricht generieren
  const config = vscode.workspace.getConfiguration('aiCommitGen');
  const temperature = config.get<number>('temperature', 0.2);
  const maxTokens = config.get<number>('maxTokens', 128);
  const maxDiffChars = config.get<number>('maxDiffChars', 3000);

  let message: string;
  try {
    message = await generateCommitMessage(diff);
  } catch (err) {
    vscode.window.showErrorMessage(
      `Fehler bei der Generierung: ${(err as Error).message}`
    );
    return;
  }

  // 4. Preview anzeigen
  const result = await showCommitPreview(diff, message, backend);

  if (!result) {
    // User abgebrochen
    return;
  }

  // 5. Optional: Auto-Commit
  const doCommit = await vscode.window.showInformationMessage(
    `Commit-Nachricht generiert: "${result}"\n\nJetzt committen?`,
    { modal: true },
    'Nein, nur Vorschau',
    'Ja, committen'
  );

  if (doCommit === 'Ja, committen') {
    await doGitCommit(result);
  }
}

async function showCommitPreview(
  diff: string,
  generated: string,
  backend: string
): Promise<string | undefined> {
  // QuickPick-Optionen
  const options: vscode.QuickPickItem[] = [
    {
      label: `✅ ${generated}`,
      description: `Backend: ${backend}`,
      alwaysShow: true,
    },
    {
      label: '🔧 Bearbeiten',
      description: 'Commit-Nachricht anpassen',
      alwaysShow: true,
    },
    {
      label: '🔄 Regenerieren',
      description: 'Nochmal andere Commit-Nachricht generieren',
      alwaysShow: true,
    },
    {
      label: '❌ Abbrechen',
      description: 'Abbrechen ohne Commit',
      alwaysShow: true,
    },
  ];

  const picked = await vscode.window.showQuickPick(options, {
    placeHolder: 'Wähle eine Aktion für die generierte Commit-Nachricht',
  });

  if (!picked) {
    return undefined;
  }

  if (picked.label === `✅ ${generated}`) {
    return generated;
  }

  if (picked.label === '🔧 Bearbeiten') {
    const edit = await vscode.window.showInputBox({
      placeHolder: 'Commit-Nachricht anpassen',
      value: generated,
      prompt: 'Passe die Commit-Nachricht an (Conventional Commits Format empfohlen)',
    });

    if (edit && edit.trim()) {
      return edit.trim();
    }
    return generated;
  }

  if (picked.label === '🔄 Regenerieren') {
    try {
      const newMsg = await generateCommitMessage(diff);
      return await showCommitPreview(diff, newMsg, backend);
    } catch (err) {
      vscode.window.showErrorMessage(
        `Fehler bei der Regeneration: ${(err as Error).message}`
      );
      return generated;
    }
  }

  return undefined;
}

async function doGitCommit(message: string) {
  try {
    const execSync = require('child_process').execSync;
    const workspace = vscode.workspace.workspaceFolders?.[0];
    if (!workspace) {
      vscode.window.showErrorMessage('Kein Workspace geöffnet.');
      return;
    }
    execSync(`git commit -m "${message.replace(/"/g, '\\"')}"`, {
      cwd: workspace.uri.fsPath,
    });
    vscode.window.showInformationMessage(`✅ Commit erfolgreich: ${message}`);
  } catch (err) {
    vscode.window.showErrorMessage(
      `Commit fehlgeschlagen: ${(err as Error).message}`
    );
  }
}

export function deactivate() {}