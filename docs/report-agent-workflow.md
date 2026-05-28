# Report Agent Workflow

This is the operating workflow for making future reports easier, more complete, and closer to the user's preferred output: readable A4-first reports that preserve source fidelity, render well in the browser, and download or print cleanly as PDFs.

## Research Basis

External references checked on 2026-05-28:

| Source | Useful lesson for this repo |
| --- | --- |
| `https://agents.md/` | `AGENTS.md` is the predictable repo-level instruction file. It should hold setup, tests, style, safety, and project rules. Nested or closest instructions can override broader ones. |
| `https://developers.openai.com/api/docs/guides/agents` | Agents are useful when orchestration, tools, approvals, state, and specialist collaboration matter. |
| `https://openai.github.io/openai-agents-python/agents/` | Multi-agent work usually fits either a manager pattern or handoffs. This repo should prefer the manager pattern so one agent keeps the report narrative, user dialogue, and final QA together. |
| `https://openai.github.io/openai-agents-python/handoffs/` | Handoffs are best when a specialist should fully take over. Report production usually needs specialist input, not a full user-facing handoff. |
| `https://claude.com/docs/skills/overview` | Skills package reusable procedures and load on demand. Keep skills focused so they do not overload every session. |
| `https://code.claude.com/docs/en/subagents` | Project subagents can live in `.claude/agents/`, with Markdown plus YAML frontmatter. They work best when each role has a specific scope and clear output. |

## Local Project Read

This repository is a static report hub:

| Area | Current role |
| --- | --- |
| `reports/` | Final browser-visible HTML reports and proposals. |
| `templates/report-template.html` | Reusable A4 report shell with shared reader/action scripts. |
| `assets/report-reader.js` | Left reader navigation, search, progress, visitor lock, and responsive collision handling. |
| `assets/report-actions.js` | Floating actions, including PDF download or browser print fallback. |
| `assets/report-theme.js` | Shared background and visual tokens. |
| `scripts/build-report-index.mjs` | Parses `report-meta`, injects shared controls, counts pages, and writes `data/reports.*`. |
| `scripts/verify-week-twenty.mjs` | Main verification entrypoint behind `npm run verify` and `npm run release:check`. |
| `docs/report-delivery-standard.md` | Metadata, filename, category, page-count, and delivery checklist. |
| `docs/report-visual-standard.md` | Shared A4 paper, white/blue background, ink line, type, and print-safe design language. |
| `docs/PRD.md` and `docs/TECH_SPEC.md` | Product goals, static architecture, accessibility, print, and validation expectations. |

The repo should stay static unless a future requirement cannot be handled by HTML, CSS, JavaScript, and Node scripts.

## Operating Model

Use a manager-led workflow.

| Role | Responsibility |
| --- | --- |
| Report Orchestrator | Owns the user conversation, intake, source-truth decisions, final report integration, verification, commit, and push. |
| Specialist subagents | Handle bounded side tasks: intake gaps, source research, content architecture, report build, reader QA, release verification. |
| Skills | Store repeatable project procedures so future agents do not rediscover the same workflow. |
| `AGENTS.md` | Stores mandatory repo behavior and points agents to this workflow. |

Use handoffs only when the user explicitly wants a specialist to take over the conversation. For normal report production, specialists should return findings to the Report Orchestrator.

## Trigger

Follow this workflow whenever the user asks to:

- Create a new report, proposal, course report, research report, or PDF-friendly deliverable.
- Continue a multi-week or chapterized report.
- Convert source material into a browser-visible A4 report.
- Improve the report production workflow.
- Review a report before publishing.

## Standard Flow

### 0. Load Project Context

Read these first:

1. `AGENTS.md`
2. `docs/report-agent-workflow.md`
3. `docs/report-intake-template.md`
4. `docs/PRD.md`
5. `docs/TECH_SPEC.md`
6. `docs/report-delivery-standard.md`
7. `docs/report-visual-standard.md`
8. `templates/report-template.html`
9. A nearby report that matches the task type, especially `reports/2026-05-12-nuva-new-taipei.html` for `#toc` and `.toc-sub` patterns.

If the task is visual or browser-visible, also apply `impeccable`, `design-taste-frontend`, and `emil-design-eng`.

### 1. Intake And Clarify

Start from `docs/report-intake-template.md`.

Ask only for missing information that affects the output. Prefer one concise question when the path is obvious. Ask up to three short questions when the missing information changes scope, source fidelity, or publication details.

Stop asking and start building when these are known:

- Report type and intended reader.
- Source materials and how faithfully they must be preserved.
- Desired outcome after reading.
- Client, date, visibility, and category.
- Required media, links, logos, PDFs, or embeds.

### 2. Assign Specialist Work

Use subagents when their tasks can run in parallel and do not block the next local step.

| Need | Suggested role |
| --- | --- |
| The brief is vague or missing inputs | `report-intake-strategist` |
| Sources need fact extraction, web research, or citation tracing | `report-source-researcher` |
| The report needs a strong table of contents, chapter map, or source-preserving structure | `report-content-architect` |
| A bounded HTML or generator implementation is ready | `report-builder` |
| A4, left reader, responsive, PDF, or browser QA is risky | `report-reader-qa` |
| Final checks, generated data, and release readiness need review | `report-release-verifier` |

Do not let two agents edit the same file family at the same time. Give each writer a clear write scope.

### 3. Source Processing

Choose the source fidelity mode before writing:

| Mode | Use when | Output rule |
| --- | --- | --- |
| Full preservation | The user says not to compress, or the source is a formal plan/research report. | Convert into report-native chapters and append or preserve source detail. Do not reduce to a thin summary. |
| Chapterized synthesis | The source is long but the deliverable must be readable. | Keep all substantive points, reorganized into clear A4 pages with stable section ids. |
| Curated brief | The user asks for a proposal, executive report, or decision memo. | Prioritize reader decisions, but mark assumptions and do not invent unsupported claims. |

For current facts, company details, prices, laws, schedules, or public claims, use web verification and record the source in the report only when client-facing citations are appropriate.

### 4. Structure The Report

Every longer browser-visible report should have:

- `report-meta` JSON comment after `<html>`.
- A cover page.
- A `#toc` page with curated `.toc-sub` links for long reports.
- Stable section ids that match TOC links.
- `.page` sections sized for A4 browsing.
- `.pgn` page numbers where appropriate.
- Reader scripts: `../assets/report-reader.js` and `../assets/report-actions.js`.
- Print CSS that hides fixed controls and avoids clipping tables, cards, media, and source sections.

Do not include a client-facing section that explains design, UI, animation, or interaction decisions unless the user explicitly asks for it.

### 5. Build

Prefer existing patterns:

- Use `templates/report-template.html` for standalone reports.
- Use `scripts/build-n8n-deployment-course-report.mjs` only for the generated n8n report lineage.
- Keep visible `nuva` lowercase and do not bold it.
- Use provided logo assets: `blue_logo_nuva.png` and `white-nuva-logo.png`.
- Use existing shared scripts instead of duplicating reader/action UI inside a report.
- Keep A4 as the primary layout and PDF/print as a first-class target.

After creating or editing reports, run `npm run build` so `data/reports.js` and `data/reports.json` stay current.

### 6. Verify

Minimum checks for any content or file update:

```bash
npm run build
npm run verify:reports
git diff --check
```

For n8n course infrastructure work or full historical release checks, also run:

```bash
npm run verify
npm run release:check
```

Note: `npm run verify` and `npm run release:check` currently point to the week-20 n8n verification chain. They may require Docker and local n8n runtime state. For generic report and proposal publishing, prefer `npm run verify:reports` or `npm run release:reports`.

When report layout, reader navigation, print behavior, or shared assets change, verify browser-visible behavior. `npm run check:reader` now measures all reports at the standard widths and warns about long reports that still need curated TOC cleanup.

| Width | Expectation |
| --- | --- |
| 1440 desktop | Left reader visible and not overlapping the A4 page. |
| 1180 narrow desktop | Reader collapses if the left gutter is too small. |
| 900 tablet landscape | Reader does not press into or cover the page. |
| 768 tablet | Reader is compact or hidden as needed. |
| 390 mobile | No horizontal overflow, no reader collision, report remains readable. |

Measure actual element rectangles when shared reader or page layout changes. A report is not done if the left reader overlaps, covers, or pushes into an A4 page.

For reports over about 10 pages, do not rely on runtime fallback ids alone. Provide a curated `#toc` page with `.toc-sub` links whose `href` targets exist in the HTML source. Very long reports should not create thousands of pixels of fixed reader links; use curated chapters and, if needed, an internally scrolling reader list.

### 7. Publish

After any file or content update, commit and push the current branch unless the user explicitly says not to push.

Before committing:

- Check `git status --short`.
- Distinguish intentional generated file updates from unrelated working-tree changes.
- Do not revert user changes.
- Use a concise commit message that names the workflow or report changed.

## Known Automation Gaps

These are the next workflow improvements to automate when report production repeats often:

| Gap | Why it matters | Suggested command or agent |
| --- | --- | --- |
| Generic report lint | Current checks do not enforce metadata schema, filename date, shared scripts, `.page`, `.pgn`, or long-report TOC in one place. | `agent:lint-report` or `npm run lint:reports` |
| Reader collision sweep | `check:visual` currently covers the homepage, not every report and not the left reader rectangle. | `report-reader-qa` |
| PDF smoke check | PDF output is still mostly browser print or manual export. | `agent:pdf-check` |
| TOC enforcement | Very long reports can fallback to scanned page titles instead of curated `#toc .toc-sub` navigation. | `report-content-architect` plus `report-reader-qa` |
| Schema drift | `report-metadata.schema.json` should stay aligned with implemented fields such as visitor PIN metadata. | `report-release-verifier` |
| Build side effects | `npm run build` writes data and may inject report scripts, so agents must inspect generated diffs before commit. | `report-release-verifier` |

Current known warning: `reports/2026-05-28-n8n-deployment-complete-guide.html` is a very long generated report and still relies on fallback reader generation rather than curated `#toc .toc-sub` links. Treat this as a future report-structure cleanup, not as permission to ship new long reports without curated TOC.

## Subagent Handoff Packet

When delegating, provide this packet:

```text
Task:
Write scope:
Read-only context:
Source files:
Output expected:
Acceptance criteria:
Do not modify:
```

For writing agents, make the write scope disjoint. For read-only agents, ask for file paths, risks, and concrete next actions.

## Definition Of Done

A report or workflow update is done only when:

- The requested artifact exists in the repo.
- Source fidelity matches the chosen mode.
- A4 browser reading works.
- PDF/print behavior is clean enough for delivery.
- Left reader navigation appears where required and never overlaps the page.
- Metadata, index data, and local links are valid.
- Verification commands have passed or the blocker is documented.
- Changes are committed and pushed when repo instructions require it.
