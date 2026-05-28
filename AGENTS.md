# Agent Instructions

For every frontend, UI, UX, landing page, dashboard, animation, redesign, or visual polish task, always use these three skills together:

- impeccable
- design-taste-frontend
- emil-design-eng

If a task includes browser-visible UI, apply all three before implementing or reviewing the design.

Reports and proposals should be A4-first and PDF-download-first: browse as A4 pages, keep print styles clean, and make the downloaded/printed version easy to read.

Every browser-visible report must render the left-side reader table of contents. Follow the New Taipei report pattern (`reports/2026-05-12-nuva-new-taipei.html`): give report pages stable section ids, and for longer reports include a `#toc` page with `.toc-sub` links so `assets/report-reader.js` can build the left navigation from curated titles. Do not ship a report that omits the reader scripts or prevents the left navigation from appearing.

The left-side reader must never overlap, cover, or press into any A4 report page at any viewport width. When the viewport does not have enough left gutter for the full reader, collapse it to a compact entry; when even the compact entry would collide with the report, hide it instead of covering the page. Verify this behavior with browser measurements across desktop, narrow desktop, tablet, and mobile widths before shipping report-reader or report layout changes.

Do not include sections that explain UI, animation, interaction, or visual design decisions inside client-facing reports or proposals unless the user explicitly asks for that content.

After completing any file or content update in this repository, commit the changes and push the current branch to the remote immediately, unless the user explicitly says not to push.
