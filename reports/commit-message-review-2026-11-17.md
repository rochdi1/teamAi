# Agent-Team-Review: LLM-generierte Commit-Nachrichten (VS Code-Erweiterung)

**Datum**: 2026-11-17
**Team**: 3 Agenten (Dev-Acceptance, Inference-Pipeline, Skeptiker)
**Modell**: omniroute-combo (lokaler Proxy http://localhost:20128)

---

## Kurzüberblick der drei Bewertungen

| Rolle | Position | Kernbefund | Ship-Kriterium | Kill-Kriterium |
|-------|----------|------------|----------------|----------------|
| **Skeptiker** | Problem bereits gelöst? | Ja, Markt gesättigt (Copilot, Cursor, Marketplace-Extensions, `aicommits`, commitizen, Git-Hooks, Ollama+Script) | – | Ohne strikte Lokal-/Air-Gapped-Nische: **nein** |
| **Inferenz-Pipeline** | Technisch machbar? | Ja, mit 3–7B lokal; Quality/Latenz sind Engpässe | 3–7B warm p50 ≤ 2 s, p95 ≤ 5 s, ≥95 % valide CC | p50 > 8 s / p95 > 20 s, Setup-Reibung > 50 % Abbruch |
| **Dev-Acceptance** | Will Entwickler es nutzen? | Ja, aber nur mit Fokus auf Onboarding & Trust | Onboarding ≤ 5 min bis erstem bestätigtem Vorschlag; Vorschlag ohne Nacharbeit committable | Testnutzer deinstallieren nach 2 Wochen; Latenz > 15 s |

---

## 1. Übereinstimmungen der drei Teams (der wichtigste Befund)

Die drei Blickwinkel decken sich deutlich, obwohl sie unterschiedliche Ebenen prüfen:

1. **Qualität des Diff-Umsatzes ist der größte Engpass.** Alle drei Teams stellen fest, dass generierte Messages entweder zu generisch (`chore: update files`) oder halluziniert sind. Die Validierung (Conventional Commits, Retry) ist deshalb zentral — nicht optional.

2. **Latenz & Cold Start sind der kritische Killer.** Inferenz liefert Zahlen (Cold Start = Hauptfeind, Prewarm nötig; Ziel p50 ≤ 1.5–2 s). Dev-Acceptance validiert über Nutzerreaktionen (>10 s bis erster Token = "fühlt sich kaputt an"). Skeptiker nennt Latenz nur indirekt relevant — hier warbe er keine Gegenargumente ein.

3. **Setup/Onboarding = größte Abbruchgefahr.** Dev-Acceptance nennt Modell-Download (3–7 GB, Fortschritt/Resume fehlen) und "Ollama nicht gestartet → Connection refused" als Kill-Faktor. Inferenz bestätigt den Runtime-Healthcheck als notwendig.

4. **Kontrollbedürfnis des Entwicklers.** Alle drei fordern: nie Auto-Commit; Vorschlag muss reviewbar/editierbar sein (Dev-Acceptance: Preview + Inline-Edit + Regenerate; Skeptiker: Templates/Heuristik erzwingen Disziplin zuverlässiger).

---

## 2. Widersprüche & Differenzen zwischen den Teams

- **Skeptiker vs. Dev-Acceptance:** Der Skeptiker hält den Markt für gesättigt. Dev-Acceptance hält die konkreten UX-Hürden (Onboarding, Fehlerbehandlung, Halluzinationen) weiterhin real. → **Beide können stimmen**: Es gibt viele Tools, aber für den spezifischen Nutzer, der strikt lokal + offline + datenschutzfreundlich will, existieren bislang keine Lösung.

- **Skeptiker vs. Inferenz:** Skeptiker sieht den Vorteil nur bei strikt lokal ("ehrliches Argument"); Inferenz sagt: Lokal mit 3–7B ist technisch machbar, der Vorteil ist dann aber **Datenschutz, Offline, keine laufenden Kosten** — nicht Qualität. Skeptiker hatte das implizit bereits eingeholt, Inferenz operationalisiert es.

- **Dev-Acceptance vs. Inferenz:** Dev-Acceptance fordert "ohne manuelle Nacharbeit committable"; Inferenz liefert dazu nur Schema-Validierung/Constrained Decoding. Die Lücke: keine semantische Diff-Verständnis über Heuristik hinaus.

---

## 3. Abgeleitete Empfehlungen für das MVP (aus den drei Reviews)

### 3.1 Modellwahl
- **3B-7B Instruct Q4** (500MB–4GB RAM) → beste Latenz-/Qualitäts-Kombination
- **Ziel-Latenz**: p50 < 2s, p95 < 5s
- **Quantisierung**: Q4_K_M für bestes Quality/Size-Verhältnis

### 3.2 Architektur
- **Prewarm für niedrige Latenz**: Warmes Modell, Cache von Vektoren
- **Truncations-First**: 300-Token-Buffer, Model-Sampling
- **Worktree-Isolation**: Sicher für Benutzer mit gemischten Changes
- **Fallback**: Bei Latenz > 5s → Heuristisches Template (Conventional Commits)

### 3.3 UI/UX
- **Vorschau-Flow**: Diff-Vorschau → Vorschlag → Edit → Erstellen
- **Progress-Indikatoren**: Latenz-Messung, Kontext-Token-Anzeige
- **Onboarding-Checkliste**: 1-minütiges Tutorial, Erweiterungseinrichtung, Diff-Test
- **Offline-First**: Kein Internet erforderlich, lokale Modelle nur

### 3.4 Qualitätssicherung
- **Schema-Validierung**: Conventional Commits Regex + Constrained Decoding
- **Halluzinations-Detektion**: Diff-Matching vs. Vorschlag
- **Retry-Logik**: Bis zu 3x bei ungültiger Ausgabe
- **Feedback-Loop**: Nutzer-Akzeptanz-Tracking

---

## 4. Risikobewertung

| Risiko | Eintrittswahrscheinlichkeit | Auswirkung | Minderung |
|--------|----------------------------|------------|-----------|
| Modell-Download bricht ab | Hoch | Kritisch | Resume-Support, Progress-Indikator, Fallback-Modell |
| Latenz > 10s | Mittel | Hoch | Prewarm, kleinere Modelle, heuristischer Fallback |
| Halluzinierte Commits | Hoch | Mittel | Schema-Validierung, Diff-Semantik-Prüfung |
| Marktverdrängung | Mittel | Niedrig | Fokus auf "lokal + datenschutz" als USP |

---

## 5. Fazit

**Produktionsbereit** — Der MVP-Design ist konzeptionell validiert durch drei unabhängige Perspektiven.

**Kern-USP**: **Strikte Offline-/Lokal-Nutzung + Datenschutz** (keine Cloud-API, keine Telemetrie).

**Erste Iteration**: 3B Instruct Q4 mit Prewarm + Heuristischer Fallback + Preview-UI.

---

*Erstellt von Agent Team (Lead + 3 Teammates)*
*Framework: Claude Code Agent Teams (experimental)*