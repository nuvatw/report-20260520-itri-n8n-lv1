# 靜態部署指南

這個網站是純靜態網站，可以部署到任何能服務 HTML、JS、JSON、SVG 與圖片的靜態主機。

## 必要檔案

部署時需包含：

```text
index.html
assets/
data/
reports/
```

若要保留專案維護能力，也建議同步保留：

```text
docs/
scripts/
templates/
package.json
README.md
```

## 通用部署流程

1. 在本機執行：

```bash
npm run release:check
```

2. 確認通過後，將整個資料夾部署到靜態主機。
3. 若平台需要指定輸出目錄，使用專案根目錄 `.`。
4. 若平台需要 build command，使用：

```bash
npm run build
```

## GitHub Pages

- Source 選擇 repository root 或部署分支根目錄。
- 不需要額外 build 工具。
- 確保 `data/reports.js` 已被 build 產生並包含在部署內容中。

## Netlify

- Build command：`npm run build`
- Publish directory：`.`

## Vercel

- Framework preset：Other
- Build command：`npm run build`
- Output directory：`.`

## 任意靜態伺服器

只要伺服器能正確回傳以下 MIME type 即可：

- `.html`：`text/html`
- `.js`：`text/javascript` 或 `application/javascript`
- `.json`：`application/json`
- `.svg`：`image/svg+xml`

## 發布後人工抽查

- 開啟首頁，確認報告卡片數量正確。
- 點擊最新報告。
- 搜尋一個客戶名稱。
- 切換分類。
- 用手機尺寸或手機裝置開啟首頁。
