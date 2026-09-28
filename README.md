# 國語生字聽寫 Web App (iPad + Apple Pencil 手寫田字格)

專為 iPad 與 Apple Pencil 設計的國語生字/詞語聽寫練習與測驗 Web 應用程式。

---

## 🌟 核心特色

1. **自訂題庫管理**：
   - 自由建立多組題庫（如：「第一單元 生字」、「成語聽寫」）。
   - 支援直接複製貼上多行文字或逗號分隔文字，一秒建立題庫。
   - 支援 JSON 匯出與匯入，方便備份或跨裝置轉移。
2. **20 題測驗規則**：
   - 題庫若大於 20 題，系統會抽取 20 題；小於或等於 20 題則全部出題。
   - 支援「隨機打亂出題」或「依序出題」。
3. **臺灣國語語音朗讀**：
   - 點擊「播放發音」按鈕，以清晰的臺灣國語朗讀題目（iPad Safari 原生高品質 Siri 語音）。
   - 支援調整語速（慢速 0.7x、推薦 0.85x、標準 1.0x）。
4. **倒數 30 秒自動防寫鎖定**：
   - 點擊發音後立即啟動倒數（預設 30 秒，可在設定調整 15s~60s）。
   - 最後 5 秒會有嗶聲與變色警示。
   - 時間歸零（00:00）時自動鎖定田字格，禁止繼續作答。
5. **iPad + Apple Pencil 田字格手寫板**：
   - 根據詞語字數**自動生成對應格數**（單字 1 格、雙字詞 2 格、四字成語 4 格）。
   - 支援 Apple Pencil 壓感與貝茲曲線平滑筆觸，字跡流暢如同真筆。
   - 深度防手掌誤觸（Palm Rejection），手靠在螢幕上不會誤觸或滑動畫布。
   - 提供「清除重寫」與「復原筆劃 (Undo)」按鈕。
   - 支援切換「田字格」或「米字格」，以及調整格子大小（標準 2cm 或舒適手寫）。
6. **對答案與批改結算**：
   - 測驗完成後，並列顯示學生的「手寫筆跡」與電腦「標準楷體國字」。
   - 提供「✓ 正確 / ✗ 錯誤」按鈕，家長或學生可手動核對並即時計算總分。
7. **PWA 全螢幕模式**：
   - iPad Safari 點擊「分享 ➔ 加入主畫面」，即可像原生 App 一樣無網址列全螢幕運行，且支援離線使用。

---

## 🚀 部署至 GitHub Pages 教學 (給 iPad 使用)

只需三個步驟，就能讓您的 iPad 透過專屬網址隨時隨地練習：

### 步驟 1：安裝 Git 並推送到 GitHub
1. 開啟 PowerShell 安裝 Git（若尚未安裝）：
   ```powershell
   winget install --id Git.Git -e --source winget
   ```
2. 在此專案資料夾初始化並上傳：
   ```powershell
   git init
   git add .
   git commit -m "Initial commit: 國語生字聽寫 Web App"
   git branch -M main
   # 替換為您在 GitHub 上建立的 Repository 網址：
   git remote add origin https://github.com/您的帳號/gifted_S.git
   git push -u origin main
   ```
   *(或者直接使用 **GitHub Desktop** 軟體點擊 Add Local Repository，然後點 Publish Repository)*

### 步驟 2：開啟 GitHub Pages 免費靜態託管
1. 進入您在 GitHub 的專案頁面。
2. 點擊頂部的 **Settings** ➔ 側邊欄點選 **Pages**。
3. 在 **Build and deployment** 下方的 **Branch** 選擇 `main`，資料夾選擇 `/ (root)`，點擊 **Save**。
4. 等候約 1~2 分鐘，上方會出現專屬網址：
   `https://您的帳號.github.io/gifted_S/`

### 步驟 3：在 iPad 上開啟並設為全螢幕 App
1. 在 iPad 上使用 **Safari 瀏覽器** 開啟上述 GitHub Pages 網址。
2. 點擊瀏覽器右上角的 **「分享」按鈕 (方框加向上箭頭)**。
3. 下拉選單點選 **「加入主畫面 (Add to Home Screen)」**。
4. 桌面上會出現紅色「字」的專屬圖示，點開即可全螢幕、無干擾地搭配 Apple Pencil 聽寫練習！

---

## 💻 本地測試預覽方式 (電腦端)

在電腦端若想立刻體驗：
* 直接在專案目錄使用任意靜態伺服器，例如：
  ```powershell
  npx.cmd serve .
  ```
  或 Python：
  ```powershell
  python -m http.server 8080
  ```
* 開啟瀏覽器訪問 `http://localhost:8080` 即可！
