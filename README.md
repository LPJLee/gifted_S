# 學習樂園 (Gifted Learning Suite)

專為 iPad 與 Apple Pencil 設計的國小自主學習 Web 應用程式集，包含**國語生字聽寫**與**數學直式加減運算**兩大模組。

---

## 📂 專案目錄結構

```
gifted_S/
├── index.html                 # 學習大廳首頁 (提供聽寫與數學兩大 App 導覽卡片)
├── deploy_github.py           # GitHub Pages 自動同步部署腳本
├── package.json               # 專案腳本配置
├── README.md                  # 本說明文件
│
├── dictation/                 # 國語生字聽寫 App
│   ├── index.html             # 單檔離線可用版本
│   ├── index_template.html    # 構建模板
│   ├── build_bundle.py        # 單檔打包腳本
│   ├── manifest.json          # PWA 配置
│   ├── sw.js                  # Service Worker 離線快取
│   ├── css/style.css
│   ├── js/                    # 模組原始碼 (app, canvas, sound, speech, timer, bank, bundle)
│   └── icons/icon.svg
│
└── math/                      # 數學直式加減運算 App
    ├── index.html             # 單檔離線可用版本
    ├── index_template.html    # 構建模板
    ├── build_bundle.py        # 單檔打包腳本
    ├── manifest.json          # PWA 配置
    ├── sw.js                  # Service Worker 離線快取
    ├── css/style.css
    ├── js/                    # 模組原始碼 (app, canvas, math_engine, sound, timer, bundle)
    └── icons/icon.svg
```

---

## 🌟 App 核心功能說明

### 1. 國語生字聽寫 App (`/dictation`)
- **自訂題庫管理**：自由新增字詞、貼上文章快速斷詞解析、匯入匯出題庫 JSON。
- **標準國語發音**：以清晰臺灣國語朗讀生字詞語（支援多段語速）。
- **田字格/米字格手寫**：自動根據詞語字數生成田字格，Apple Pencil 極速連筆手寫、防手掌誤觸。
- **自動計時與防寫鎖定**：倒數計時結束自動防寫鎖定。
- **對答案與批改結算**：學生手寫筆跡與標準楷體國字對照，支援即時評分。

### 2. 數學直式加減運算 App (`/math`)
- **自由設定測驗題數**：預設 5、10、20、50 題或自訂任意題數 (1~100 題)。
- **每題作答時間設定**：可選擇不限時、10s、15s、20s、30s、60s 或自訂秒數，最後 3 秒呼吸燈紅框警示與倒數提示音。
- **位數與運算型態設定 (最高三位數)**：
  - 一位數 (1~9)、二位數 (10~99)、三位數 (100~999)。
  - 混合位數：二位數 ± 一位數、三位數 ± 二位數、全隨機 (1~3位)。
  - 運算型態：加法 (+)、減法 (-)、加減混合 (±)。減法自動保證不出現負數。
  - 進退位專項練習：隨機、不進退位 (基礎入門)、必須進退位 (直式精熟)。
- **iPad 直式手寫草稿板 (Scratchpad)**：
  - Apple Pencil 低延遲採樣，支援防手掌誤觸 (Palm Rejection 開關)。
  - 直式對齊輔助線模式（百位、十位、個位虛線對位，防止計算對錯位）、方格紙、純白草稿紙切換。
  - 「蓋印直式」功能：一鍵將當前題目以標準直式格式蓋印在草稿紙上。
  - 復原 (Undo)、一鍵清空 (Clear)、橡皮擦、多種筆觸顏色與粗細。
- **成績結算與手寫錯題筆跡回顧**：
  - 統計答對率、總時間與平均每題秒數。
  - 自動保存每題作答時在草稿板上的手寫筆跡快照，點擊「手寫草稿 📝」即可調閱查看計算過程。

---

## 🚀 本地預覽與打包

### 1. 本地啟動伺服器
```bash
npx serve .
# 或使用 Python
python -m http.server 8080
```
開啟瀏覽器前往 `http://localhost:8080/` 即可進入學習大廳。

### 2. 重新打包單檔
若修改了 CSS 或 JS 原始檔，可執行打包腳本生成單檔 HTML：
```bash
# 打包聽寫 App
python dictation/build_bundle.py

# 打包數學 App
python math/build_bundle.py
```

### 3. 一鍵部署至 GitHub Pages
```bash
python deploy_github.py
```
部署完成後，即可直接在 iPad Safari 開啟託管網址，並點擊「分享 ➔ 加入主畫面」全螢幕離線使用。
