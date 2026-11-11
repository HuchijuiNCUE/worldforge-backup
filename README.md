# 異世界地圖繪製室：GitHub 備份與獨立部署

這是原網站多國語言改版之前的繁體中文版原始碼備份，包含網頁與 AI 生圖後端。建立此備份不會修改原網站。這份專案並非多國語言版本。

## 先認識兩個服務

- **GitHub 儲存庫**：保存程式碼，也可以下載作為備份；上傳不會自動產生完整可用的網站。
- **Cloudflare Workers**：執行此專案的網站與後端，提供獨立網址。**請選 Workers，勿選 GitHub Pages 或 Cloudflare Pages 靜態網站。**

此程式的 `/api/generate` 需要後端；單獨透過 GitHub Pages 開啟網頁，AI 生圖無法使用。原始底圖與網頁套件需要網路連線，生圖則需要使用者自行提供相應服務的 API 金鑰與額度。請確認上傳底圖與參考圖的使用權。

## 步驟一：上傳到 GitHub

1. 解壓縮 ZIP，打開解壓後的 `worldforge-github` 資料夾。
2. 登入 GitHub，建立新的 repository，例如 `worldforge-backup`。如果僅供備份，可先選 Private。
3. 進入新建的 repository，選擇 **Add file → Upload files**。
4. 上傳資料夾**裡面的內容**（`src`、`scripts`、`tests`、`README.md`、`wrangler.jsonc` 及 `.gitignore`），不要多套一層 `worldforge-github`。某些系統可能隱藏 `.gitignore`；它只避免誤上傳本機暫存檔，可稍後補上。
5. 按 **Commit changes**。檢查 repository 首頁可以直接看到 `src` 與 `wrangler.jsonc`。

## 步驟二：建立獨立可操作網站

1. 註冊並登入 Cloudflare，在控制台進入 **Workers & Pages**，選擇建立 Worker，並選擇連接 GitHub 儲存庫的方式。介面名稱可能隨 Cloudflare 更新而不同。
2. 授權 Cloudflare 讀取剛建立的 repository，選擇該 repository 與 `main` 分支。
3. 專案根目錄使用 repository 根目錄；如可設定建置命令，輸入 `node scripts/build.mjs`；部署命令輸入 `npx wrangler deploy`。如果要求版本預覽命令，可保留平台預設。
4. 開始部署，等待 Cloudflare 顯示成功，再使用提供的 `workers.dev` 網址開啟。首次使用可能需依 Cloudflare 指示設定 workers.dev 子網域。
5. 測試地圖是否顯示、可否選區和設定場景；再以自己的 API 金鑰進行一次實際生圖測試，確認後端與 API 權限正常。

如 Worker 名稱與帳號內既有名稱衝突，修改 `wrangler.jsonc` 中的 `name`，只使用小寫英文字母、數字與連字號，再提交到 GitHub。請確認部署所用 Cloudflare 帳號的用量及限制。

## 檔案說明

- `src/index.html`：操作介面、地圖與使用說明。
- `src/worker.mjs`：提供網頁及安全轉送 AI 生圖請求的後端程式。
- `scripts/build.mjs`：將網頁嵌入後端，產生 `dist/server/index.js`。
- `wrangler.jsonc`：Cloudflare Workers 的設定。
- `tests/`：原專案的自動化檢查。

## 備份範圍及金鑰

程式碼不包含瀏覽器中已有的專案、生成圖片、參考圖或 API 金鑰。請在原網站使用「下載完整專案 JSON」備份成果；參考圖與 API 金鑰不包含在 JSON 中。備份站與原站的瀏覽器資料不會自動同步。

AI 服務的金鑰由使用者在網站輸入，無須寫入 GitHub 或 Worker 設定。不要把金鑰、`.env` 或 `.dev.vars` 上傳到 GitHub；公開儲存庫的任何人都能查看程式碼。瀏覽器儲存金鑰並非加密保險箱。API 請求可能產生費用，並須由提供者帳號具備對應模型權限。

## 本機開發者檢查（選用）

需要 Node.js 22 或以上。在此資料夾執行 `node scripts/build.mjs`；可以逐一執行 `node tests/worker.test.mjs`、`node tests/layout.test.mjs`、`node tests/key-storage.test.mjs`、`node tests/marker-clip.test.mjs`。這些檢查使用模擬資料，不代表實際 AI 服務或部署已驗證。

官方文件：[Cloudflare GitHub 整合](https://developers.cloudflare.com/workers/ci-cd/builds/git-integration/github-integration/)｜[Workers 建置設定](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/)｜[GitHub Pages 說明](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)
