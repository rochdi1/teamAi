/**
 * git-integration.ts
 * Liest staged diffs aus dem Git-Repository für die Commit-Nachrichten-Generierung.
 */

import * as vscode from 'vscode';
import { execSync } from 'child_process';
import * as path from 'path';

/**
 * Holt den staged Diff (git diff --staged) aus dem aktiven Git-Repository.
 * Gibt den Diff als String zurück oder undefined bei Fehlern.
 */
export async function getStagedDiff(): Promise<string | undefined> {
  const workspace = vscode.workspace.workspaceFolders?.[0];
  if (!workspace) {
    return undefined;
  }

  const cwd = workspace.uri.fsPath;

  try {
    // Prüfe ob es ein Git-Repository ist
    execSync('git rev-parse --is-inside-work-tree', {
      cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
      encoding: 'utf8',
    });

    // Holt staged diff (nur Änderungen, die im Index sind, aber noch nicht committed)
    const diff = execSync('git diff --staged -- ', {
      cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
      encoding: 'utf8',
    });

    if (!diff || diff.trim().length === 0) {
      return '';
    }

    return diff;
  } catch (err) {
    // Nicht ein Git-Repository oder Fehler beim git command
    return undefined;
  }
}

/**
 * Gibt zurück, ob das aktuelle Workspace ein Git-Repository ist.
 */
export function isGitRepo(): boolean {
  const workspace = vscode.workspace.workspaceFolders?.[0];
  if (!workspace) {
    return false;
  }

  try {
    execSync('git rev-parse --is-inside-work-tree', {
      cwd: workspace.uri.fsPath,
      stdio: 'ignore',
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Gibt den Namen des aktuellen Git-Branches zurück.
 */
export function getCurrentBranch(): string | undefined {
  const workspace = vscode.workspace.workspaceFolders?.[0];
  if (!workspace) {
    return undefined;
  }

  try {
    const branch = execSync('git branch --show-current', {
      cwd: workspace.uri.fsPath,
      encoding: 'utf8',
    }).trim();
    return branch || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Prüft ob gestagte Änderungen vorhanden sind.
 */
export async function hasStagedChanges(): Promise<boolean> {
  const workspace = vscode.workspace.workspaceFolders?.[0];
  if (!workspace) {
    return false;
  }

  try {
    const diff = execSync('git diff --staged --quiet', {
      cwd: workspace.uri.fsPath,
      stdio: 'ignore',
    });
    return true; // Exit code 0 = Änderungen vorhanden
  } catch {
    return false; // Exit code 1 = keine Änderungen
  }
}

/**
 * Liest die commitierte Historie (letzte N Commits) für Few-Shot-Beispiele.
 */
export async function getRecentCommits(limit: number = 5): Promise<string[]> {
  const workspace = vscode.workspace.workspaceFolders?.[0];
  if (!workspace) {
    return [];
  }

  try {
    const log = execSync(
      `git log --oneline -${limit} --pretty=format:"%s (%h)"`,
      {
        cwd: workspace.uri.fsPath,
        encoding: 'utf8',
      }
    );
    return log.trim().split('\n').filter(Boolean);
  } catch {
    return [];
  }
}
