# 第二週交付紀錄

## 交付目標

第二週目標是制定報告交付標準，讓後續新增 HTML 報告時有固定格式、可複製模板與自動檢查。

## 已完成範圍

- 建立報告交付標準文件：`docs/report-delivery-standard.md`。
- 建立分類命名表：`docs/report-categories.json`。
- 建立可複製 HTML 模板：`templates/report-template.html`。
- 建立第二週驗收腳本：`scripts/verify-week-two.mjs`。
- 將第二週完整驗收保留為 `npm run verify:week2`。
- 保留 `npm run verify:week1` 供第一週基礎驗收回查。

## 第二週驗收清單

- 檔名符合 `YYYY-MM-DD-project-slug.html`。
- `metadata.date` 與檔名前綴相同。
- metadata 必填欄位完整。
- category 必須存在於 `docs/report-categories.json`。
- 第一頁可見日期與 metadata date 對得起來。
- 報告至少有一個 `.page`。
- template 檔案存在，且含有 `report-meta`、`.page`、`.pgn` 與 favicon。
- `npm run build` 可以產生索引。
- `npm run verify:week2` 可以通過。

## 下一週入口

第三週可以開始強化首頁瀏覽體驗：進一步優化搜尋、分類、年份月份分組、最新報告標示、空狀態與大量報告時的掃描效率。
