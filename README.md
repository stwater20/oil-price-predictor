# ⛽ 台灣油價預測 Oil Price Predictor

依台灣中油「浮動油價機制」的 **7D3B 指標**（70% 杜拜原油 + 30% 北海布蘭特，取一週平均），
以最新國際原油與匯率估算**下週**中油汽柴油參考零售價，並客觀追蹤歷次預測的準確度。

## 功能

- **下週牌價預測**：95 無鉛下週估算價與漲跌方向。
- **本週牌價**：92 / 95 / 98 無鉛、超級柴油。
- **歷史走勢**：2019 至今每週零售油價（可切換四種油品）。
- **近月國際原油**：杜拜、北海布蘭特日走勢。
- **預測準確度追蹤**：每週記錄預測值，下週以官方實際牌價自動比對，累積方向命中率與平均誤差（純客觀、無人工評分）。

## 資料來源

- 汽柴油零售價、國際原油行情：經濟部能源署「油價資訊管理與分析系統」(oil111)
- 原油報價：路透社　·　台幣兌美元匯率：中央銀行

## 自動更新

`.github/workflows/update-data.yml` 每週一自動執行 `fetch-data.mjs`：
重抓最新資料、回填上週預測的實際牌價、附加本週最新預測，並提交回 repo，
GitHub Pages 隨即更新。也可在 **Actions** 分頁手動觸發（Run workflow）。

## 部署（GitHub Pages）

1. 將本目錄所有檔案推送到 GitHub repo。
2. Settings → Pages → Source 選 `Deploy from a branch`，分支 `main`、資料夾 `/ (root)`。
3. 自訂網域：Settings → Pages → Custom domain 填入你的網域，
   於 Cloudflare 設定 `CNAME` 指向 `<帳號>.github.io`（本 repo 會自動產生 `CNAME` 檔）。

## 檔案

| 檔案 | 說明 |
|------|------|
| `index.html` | 網站主體（讀取 `data.json`、`history.json`） |
| `data.json` | 最新油價、原油與預測資料 |
| `history.json` | 歷次預測與驗證紀錄 |
| `fetch-data.mjs` | 每週資料更新與預測腳本 |
| `.github/workflows/update-data.yml` | 每週自動更新排程 |

## 免責聲明

本專案為個人試作，非中油官方資訊。預測以公開資料簡化估算，未完整納入平穩措施、
亞鄰最低價上限與稅費調整，可能與官方公告有出入，僅供參考，不構成投資或消費建議。
