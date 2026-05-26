# 發布與驗收流程

第四週目標是讓每次新增報告後，都有固定的發布前檢查，不靠臨時人工記憶。

## 發布前流程

1. 將新報告 HTML 放入 `reports/`。
2. 確認檔名與 metadata 符合 `docs/report-delivery-standard.md`。
3. 執行 `npm run build` 重新產生 `data/reports.js` 與 `data/reports.json`。
4. 執行 `npm run check:links` 抽查首頁、報告頁與模板中的連結。
5. 執行 `npm run check:visual` 產出桌機與手機截圖。
6. 執行 `npm run verify` 進行第四週完整驗收。
7. 用 `npm run dev` 開啟本機預覽，人工快速確認首頁與新增報告。

## 一鍵驗收

```bash
npm run release:check
```

`release:check` 會執行第四週完整驗收，包含：

- 前三週的架構、metadata、交付標準與首頁瀏覽體驗檢查。
- build 檢查。
- 本機連結檢查。
- 少量外部連結抽查。
- 桌機與手機截圖產出。

## 驗收產物

視覺檢查會產生：

```text
artifacts/qa/home-desktop.png
artifacts/qa/home-mobile.png
```

若截圖檔案不存在或檔案過小，視覺檢查會失敗。

## 失敗處理

- build 失敗：先檢查 `report-meta` JSON 是否合法。
- metadata 失敗：依 `docs/report-delivery-standard.md` 修正。
- 本機連結失敗：確認檔案路徑、圖片、favicon、報告連結是否存在。
- 外部連結警告：通常不阻擋發布，但要人工判斷是否需要更換或移除。
- 視覺檢查失敗：確認本機 Chrome 或 Edge 是否可執行，並重新檢查首頁是否正常載入。
