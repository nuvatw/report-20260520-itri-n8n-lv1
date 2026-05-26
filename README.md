# Report Timeline Hub

這個資料夾現在是一個可擴充的成果報告入口。首頁 `index.html` 會讀取 `data/reports.js`，把 `reports/` 裡的 HTML 報告整理成 timeline。

## 使用方式

1. 把新的成果報告 HTML 放進 `reports/`。
2. 檔名建議使用 `YYYY-MM-DD-project-name.html`，例如 `2026-06-01-client-workshop.html`。
3. 執行 `npm run build` 重新產生首頁資料。
4. 開發或預覽時執行 `npm run dev`，再到終端顯示的網址查看。
5. 交付前執行 `npm run release:check`，確認 build、連結、首頁瀏覽、行動版視覺與維運稽核都通過。

## 報告 metadata

每份 HTML 可以在 `<html>` 後加上這段註解，首頁會優先讀取這些資料：

```html
<!-- report-meta
{
  "title": "報告標題",
  "subtitle": "報告副標",
  "date": "2026-06-01",
  "period": "2026/06/01-06/05",
  "category": "課程成果",
  "client": "客戶或合作單位",
  "timeline": "2026 六月"
}
-->
```

完整交付標準請看 `docs/report-delivery-standard.md`。沒有 metadata 時，系統可以推估部分資訊，但交付檢查會要求每份正式報告都具備完整 metadata。

## 資料夾結構

```text
.
├── index.html
├── reports/
│   ├── 2026-05-12-nuva-new-taipei.html
│   └── 2026-05-22-itri-n8n-lv1.html
├── data/
│   ├── reports.js
│   └── reports.json
├── scripts/
│   ├── build-report-index.mjs
│   ├── audit-maintenance.mjs
│   ├── check-links.mjs
│   ├── dev-server.mjs
│   ├── mobile-visual-check.mjs
│   ├── verify-week-one.mjs
│   ├── verify-week-two.mjs
│   ├── verify-week-three.mjs
│   ├── verify-week-four.mjs
│   └── verify-week-five.mjs
├── docs/
│   ├── expansion-roadmap.md
│   ├── feedback-log-template.md
│   ├── homepage-browsing-standard.md
│   ├── maintenance-playbook.md
│   ├── release-process.md
│   ├── report-categories.json
│   ├── report-delivery-standard.md
│   ├── report-metadata.schema.json
│   ├── static-deploy-guide.md
│   ├── week-1-handoff.md
│   ├── week-2-handoff.md
│   ├── week-3-handoff.md
│   ├── week-4-handoff.md
│   └── week-5-handoff.md
├── templates/
│   └── report-template.html
├── assets/
│   └── favicon.svg
└── package.json
```

## 第一週交付狀態

第一週已完成。交付紀錄在 `docs/week-1-handoff.md`，metadata 機器可讀規格在 `docs/report-metadata.schema.json`。目前兩份既有報告已經遷移到 `reports/`，首頁會依 `data/reports.js` 產生 timeline 卡片並連到各報告 HTML。

## 第二週交付狀態

第二週已完成。報告交付標準在 `docs/report-delivery-standard.md`，分類命名表在 `docs/report-categories.json`，可複用 HTML 模板在 `templates/report-template.html`。目前 `npm run verify` 會執行第二週完整驗收；若只要回查第一週基礎架構，可執行 `npm run verify:week1`。

## 第三週交付狀態

第三週已完成。首頁瀏覽體驗標準在 `docs/homepage-browsing-standard.md`，交付紀錄在 `docs/week-3-handoff.md`。首頁現在支援搜尋、分類、年度、月份索引、最新報告標示、active filter tokens、清除條件與分情境空狀態。目前 `npm run verify` 會執行第三週完整驗收；若要回查前兩週，可執行 `npm run verify:week1` 或 `npm run verify:week2`。

## 第四週交付狀態

第四週已完成。發布流程在 `docs/release-process.md`，靜態部署指南在 `docs/static-deploy-guide.md`，交付紀錄在 `docs/week-4-handoff.md`。目前 `npm run verify` 與 `npm run release:check` 都會執行第四週完整驗收，包含 build、前三週驗收、連結抽查與桌機/手機截圖檢查。若要回查前幾週，可執行 `npm run verify:week1`、`npm run verify:week2` 或 `npm run verify:week3`。

## 第五週交付狀態

第五週已完成。擴充決策矩陣在 `docs/expansion-roadmap.md`，維運手冊在 `docs/maintenance-playbook.md`，回饋紀錄模板在 `docs/feedback-log-template.md`，交付紀錄在 `docs/week-5-handoff.md`。metadata 已支援 `clientGroup`、`tags`、`thumbnail`、`pdf` 與 `visibility`，目前 `npm run verify` 與 `npm run release:check` 會執行第五週完整驗收。若要回查第四週，可執行 `npm run verify:week4`。

## 五周執行計畫

第 1 周：完成資訊架構與既有報告遷移。建立 `reports/`、首頁、metadata 規格與索引產生器，讓現有兩份報告先能被 timeline 點擊。

第 2 周：制定報告交付標準。統一檔名、metadata、封面日期、分類與頁數檢查，整理一份可複製的 HTML 報告模板。

第 3 周：強化首頁瀏覽體驗。補上搜尋、分類、年度月份分組、最新報告標示與空狀態，讓報告數量增加後仍然好找。

第 4 周：建立發布與驗收流程。加入 build 檢查、連結抽查、行動版視覺檢查與靜態部署流程，確保新增報告不破壞首頁。

第 5 周：進入維運與擴充。評估是否加入縮圖、PDF 下載、客戶分類、權限分流或自動部署，並回收前四周使用回饋調整流程。
