---
name: nuva-report-production
description: Build, revise, verify, commit, and push nuva A4 HTML reports and proposals in this repository. Use when the user asks for report generation, report QA, proposal creation, PDF-friendly report work, or improvements to the report workflow.
---

# nuva Report Production

## Load First

Read these files before editing:

1. `AGENTS.md`
2. `docs/report-agent-workflow.md`
3. `docs/report-intake-template.md`
4. `docs/PRD.md`
5. `docs/TECH_SPEC.md`
6. `docs/report-delivery-standard.md`
7. `docs/report-visual-standard.md`
8. `templates/report-template.html`

For longer browser-visible reports, inspect `reports/2026-05-12-nuva-new-taipei.html` for the `#toc` and `.toc-sub` pattern.

## Workflow

1. Collect only missing intake details using `docs/report-intake-template.md`.
2. Choose a source fidelity mode: full preservation, chapterized synthesis, executive brief, or media report.
3. Keep one main agent responsible for the user conversation, final synthesis, verification, commit, and push.
4. Delegate only bounded work to subagents with clear ownership.
5. Build with existing static HTML, CSS, JavaScript, and Node scripts.
6. Keep every report A4-first, PDF-download-first, and reader-nav compatible.
7. Run `npm run build`, `npm run verify:reports`, and `git diff --check`.
8. Run `npm run release:reports` for publish-ready report work.
9. Run `npm run verify` and `npm run release:check` only when the task touches the n8n course infrastructure or the Docker-backed week-20 checks are available.
10. Commit and push after every file or content update unless the user explicitly says not to push.

## Report Rules

- Visible `nuva` stays lowercase and must not be bolded.
- Use `blue_logo_nuva.png` and `white-nuva-logo.png`; do not invent a logo.
- Every formal report needs `report-meta`, stable section ids, `.page` sections, and shared reader/action scripts.
- Longer reports need a `#toc` page with curated `.toc-sub` links.
- The left reader must never overlap, cover, or press into an A4 page.
- Do not add client-facing sections about UI, animation, interaction, or visual design decisions unless the user asks for that content.
- Preserve source substance unless the user asks for a concise summary.

## Verification

For reader or layout changes, measure desktop, narrow desktop, tablet, and mobile widths. The report is not complete if the reader collides with any `.page`.
