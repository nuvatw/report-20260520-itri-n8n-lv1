# 第四週交付紀錄

## 交付目標

第四週目標是建立發布與驗收流程，確保新增報告後可以透過一鍵檢查確認首頁、連結與行動版視覺沒有被破壞。

## 已完成範圍

- 建立發布流程文件：`docs/release-process.md`。
- 建立靜態部署指南：`docs/static-deploy-guide.md`。
- 建立連結抽查腳本：`scripts/check-links.mjs`。
- 建立行動版視覺檢查腳本：`scripts/mobile-visual-check.mjs`。
- 建立第四週總驗收腳本：`scripts/verify-week-four.mjs`。
- 將第四週完整驗收保留為 `npm run verify:week4`。
- 新增發布前一鍵檢查流程，後續由最新週次的 `npm run release:check` 執行。

## 第四週驗收清單

- `npm run build` 可以成功。
- `npm run verify:week1`、`npm run verify:week2`、`npm run verify:week3` 可以通過。
- `npm run check:links` 可以通過本機連結檢查。
- `npm run check:visual` 可以產生桌機與手機截圖。
- `npm run verify:week4` 可以通過第四週完整驗收。

## 下一週入口

第五週可以進入維運與擴充評估：縮圖、PDF 下載、客戶分類、權限分流、自動部署，以及報告新增後的長期維護節奏。
