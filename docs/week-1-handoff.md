# 第一週交付紀錄

## 交付目標

第一週目標是完成可擴充的成果報告資訊架構，讓現有 HTML 報告不再互相覆蓋，並能透過首頁 timeline 點擊進入。

## 已完成範圍

- 建立 `reports/` 作為所有成果報告 HTML 的存放區。
- 將既有兩份報告遷移為固定檔名：
  - `reports/2026-05-12-nuva-new-taipei.html`
  - `reports/2026-05-22-itri-n8n-lv1.html`
- 建立首頁 `index.html`，以 timeline 卡片呈現報告。
- 建立 `data/reports.js` 與 `data/reports.json` 作為首頁資料來源。
- 建立 `scripts/build-report-index.mjs`，掃描 `reports/*.html` 自動產生索引資料。
- 建立 `scripts/dev-server.mjs`，提供本機預覽與 reports 監看。
- 建立 metadata 規格與 JSON Schema。
- 建立第一週驗收腳本，檢查第一週交付物是否完整。

## 資訊架構

```text
首頁 index.html
  讀取 data/reports.js
    由 scripts/build-report-index.mjs 產生
      掃描 reports/*.html
```

報告本體保持純 HTML，因此未來可以直接丟入獨立成果書，不需要改寫成框架元件。首頁只負責索引、搜尋、分類與點擊入口。

## Metadata 契約

每份報告 HTML 需在 `<html>` 後放置 `report-meta` 註解：

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

完整欄位規格見 `docs/report-metadata.schema.json`。

## 第一週驗收清單

- `npm run build` 可以成功產生 `data/reports.js` 與 `data/reports.json`。
- `npm run verify:week1` 可以通過。
- 首頁顯示兩份既有報告。
- 首頁依日期由新到舊排序。
- 搜尋「新北」只顯示新北站報告。
- 點擊報告卡片能進入對應 HTML。
- 桌機與手機版首頁沒有明顯重疊或文字爆版。

## 下一週入口

第二週可以直接從報告交付標準開始：整理 HTML 模板、檔名規則、封面日期規則、分類命名表，以及報告送出前的人工檢查表。
