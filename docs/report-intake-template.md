# Report Intake Template

Use this template to guide the user before producing a report. Do not dump the whole form into chat unless the user asks for a full questionnaire. Ask the smallest set of questions needed to move forward.

## First Question

Ask this first when the request is vague:

```text
這份 report 主要要給誰看，對方看完後你希望他採取什麼行動或形成什麼判斷？
```

## Minimum Inputs

| Field | Why it matters | Default if unknown |
| --- | --- | --- |
| Report type | Decides structure and tone. | 成果報告 |
| Reader | Decides detail level and language. | 客戶與內部利害關係人 |
| Desired outcome | Decides what the report should make easy to decide. | 清楚理解成果與下一步 |
| Source materials | Determines evidence, content depth, and media. | Ask user to provide files, links, or notes. |
| Source fidelity | Controls whether to preserve full content or summarize. | Chapterized synthesis without deleting substantive points. |
| Client or project name | Required for metadata and cover. | Ask user. |
| Date or period | Required for filename, metadata, cover, and timeline. | Use today's date only if the user confirms it is a new report. |
| Category | Required for homepage filters. | Pick from `docs/report-categories.json` based on content. |
| Visibility | Controls metadata and visitor flow. | `public` unless user says internal/private. |

## Optional Inputs

| Field | Use when |
| --- | --- |
| Reference report | User wants the style to match a previous report. |
| Logos or brand assets | Client-facing report needs partner branding. |
| Photos, videos, embeds | Report needs direct media evidence. Include fallback links. |
| Metrics | Outcomes, attendance, completion, views, cost, schedule, or comparison. |
| Required sections | Client or grant report has mandatory headings. |
| PDF file | User already has a final PDF download target. |
| Call to action | Proposal or sales report needs a next step. |
| Language | Bilingual, Chinese-only, English-only, or mixed. |

## Question Ladder

Use this order. Stop when enough information is known.

1. Purpose: reader, desired decision, report type.
2. Source: files, links, meeting notes, photos, videos, transcript, existing proposal.
3. Fidelity: preserve full content, chapterize, or create an executive version.
4. Publication: title, client, date, category, visibility.
5. Media: logos, images, video embeds, source links, PDF field.
6. Preference: reference report, tone, must-include or must-avoid sections.

## Ready Brief Format

Before building, condense the intake into this internal brief:

```text
Title:
Type:
Reader:
Desired outcome:
Source materials:
Source fidelity mode:
Client:
Date and period:
Category:
Visibility:
Media and links:
Reference style:
Known constraints:
Open assumptions:
```

If assumptions are low risk, proceed and state them briefly in the work notes. If assumptions would change the report's meaning, ask the user before building.

## Source Fidelity Modes

| Mode | User signal | Agent behavior |
| --- | --- | --- |
| Full preservation | "不要壓縮", "完整轉成 report", "保留所有內容" | Keep all substantive source content. Use pages, chapters, appendix, tables, and source notes to keep it readable. |
| Chapterized synthesis | "整理成好讀的 report", long source with many sections | Reorganize into chapters while preserving all important points. |
| Executive brief | "給主管看", "提案", "比較方案", "快速決策" | Prioritize decision clarity and clearly mark assumptions. |
| Media report | User gives photos, video, or social links | Embed media directly when possible and include a plain-link fallback. |

## Build Prompt Template

When enough inputs are collected, the Report Orchestrator can start with:

```text
我要製作一份 nuva A4-first browser report。
請依照 docs/report-agent-workflow.md 和 AGENTS.md 執行。
本次 brief:
[paste ready brief]

請先檢查現有 repo 規格與參考報告，再產出 HTML/report files，完成 build/verify/release checks，最後 commit/push。
```

## Client-Facing Content Guardrails

- Do not include process notes about UI, animation, or design decisions in the report.
- Do not invent facts, client claims, business metrics, prices, legal claims, or public-current details.
- Use readable structure instead of shortening source material by default.
- Keep A4 and PDF readability ahead of decorative effects.
- Use direct embeds plus fallback links for media.
