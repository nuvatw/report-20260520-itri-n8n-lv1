# 報告交付標準

第二週目標是讓每一份新丟進來的 HTML 報告，都能用同一套規格被首頁辨識、排序、搜尋與點擊。

## 1. 檔名規則

所有成果報告 HTML 都放在 `reports/`。

檔名格式：

```text
YYYY-MM-DD-project-slug.html
```

範例：

```text
2026-06-01-client-workshop.html
2026-06-12-youth-ai-forum.html
```

規則：

- 日期使用西元 `YYYY-MM-DD`。
- 日期需與 metadata 的 `date` 相同。
- slug 使用小寫英文字母、數字與 hyphen。
- 不使用空白、底線、中文、括號或特殊符號。
- 同一天多份報告時，在 slug 補上客戶或主題。

## 2. Metadata 規則

每份報告的 `<html>` 後方必須放置 `report-meta` 註解：

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

欄位說明：

| 欄位 | 必填 | 規則 |
| --- | --- | --- |
| `title` | 是 | 首頁卡片主標題，建議 8-24 字。 |
| `subtitle` | 是 | 報告類型或補充說明，建議 8-36 字。 |
| `date` | 是 | timeline 排序日期，格式固定為 `YYYY-MM-DD`。 |
| `period` | 是 | 報告涵蓋期間，可為單日或區間。 |
| `category` | 是 | 必須使用分類命名表內的值。 |
| `client` | 是 | 客戶、主辦、合作或執行對象。 |
| `timeline` | 是 | 首頁月份群組，格式建議 `YYYY 中文月`，例如 `2026 六月`。 |
| `clientGroup` | 建議 | 客戶分類，例如 `政府與公共部門`、`企業與研究機構`。 |
| `tags` | 建議 | 搜尋與維運用關鍵字陣列。 |
| `thumbnail` | 否 | 未來縮圖使用，目前首頁尚不顯示。 |
| `pdf` | 否 | 未來 PDF 下載使用，目前首頁尚不顯示。 |
| `visibility` | 建議 | `public`、`internal` 或 `private`，只作為標籤。 |

機器可讀 schema 位於 `docs/report-metadata.schema.json`。

第五週後，正式維運建議每份報告都填寫 `clientGroup`、`tags` 與 `visibility`。`thumbnail` 與 `pdf` 可等素材穩定後再填。

## 3. 分類命名表

分類來源以 `docs/report-categories.json` 為準。

目前允許：

- `課程成果`
- `活動成果`
- `專案成果`
- `研究摘要`
- `媒體成果`
- `其他成果`

新增分類前，先確認是否真的需要新的篩選入口。若需要，請同步更新 `docs/report-categories.json` 與首頁資料。

## 4. 封面日期規則

報告封面或第一頁可見區域必須出現與 metadata 對應的日期。

最低要求：

- `metadata.date` 必須與檔名前綴日期相同。
- 報告第一個 `.page` 區塊或開頭內容必須能看到該日期，接受 `2026-06-01`、`2026/06/01`、`2026.06.01`、`2026 / 06 / 01`、`2026 · 06 · 01` 等格式。
- 若報告涵蓋多日，封面可同時呈現 `period`，但 `date` 仍作為排序日期。

## 5. 頁數規則

報告頁面以 `.page` 作為頁數單位。

規則：

- 每份報告至少要有一個 `.page`。
- 首頁索引會自動統計 `.page` 數量。
- 若是 A4 成果書，建議每頁保留 `.pgn` 頁碼元素。
- 交付前執行 `npm run verify`，確認頁數可被讀取。

## 6. 新報告交付流程

1. 複製 `templates/report-template.html`。
2. 將檔案命名為 `YYYY-MM-DD-project-slug.html`。
3. 放入 `reports/`。
4. 替換 metadata、封面文字、摘要、指標與內容頁。
5. 執行 `npm run build`。
6. 執行 `npm run verify`。
7. 用 `npm run dev` 開首頁，確認 timeline 卡片與報告連結。
8. 若是正式發布，執行 `npm run release:check`。

## 7. 交付前檢查清單

- 檔名符合 `YYYY-MM-DD-project-slug.html`。
- `metadata.date` 與檔名前綴相同。
- `metadata.category` 使用分類命名表。
- 第一頁可見日期與 metadata 對得起來。
- 報告至少有一個 `.page`。
- 首頁卡片標題、客戶、分類、頁數顯示正常。
- 搜尋客戶或主題可以找到該報告。
- `clientGroup`、`tags`、`visibility` 已填寫。
