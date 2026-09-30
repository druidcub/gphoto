# GPhoto Frame

繁體中文 | [English](README.en.md)

[下載免安裝 EXE（Windows x64）](https://github.com/druidcub/gphoto/releases/latest/download/GPhoto-Frame-windows-x64-portable.exe) · [支持開發（PayPal）](https://paypal.me/druidcub)

## macOS 測試版（0.4.0）

[Mac 測試下載與版本說明](https://github.com/druidcub/gphoto/releases)：選擇 `GPhoto-Frame_0.4.0_macos-universal.dmg` 或 `GPhoto-Frame-macos-universal.dmg`，核對同一 Release 的校驗碼。推送標籤、CI 成功並人工公開預發行後才可下載。

目標支援 macOS 12 起、Intel／Apple Silicon。DMG 內含完整通用 App，拖入「應用程式」後執行，不需 WebView2。此階段使用 ad-hoc 簽章，尚未完成 Developer ID 簽章、公證及 Mac 實機驗收，可能遭 Gatekeeper 阻擋；不要求關閉安全保護。預發行不取代 Windows 正式版 Latest。

Mac 保留相同照片來源、預覽、柔和模式及小視窗；Space／左右鍵／Esc 不變，全螢幕快捷鍵為 `Control + Command + F`，`Command + Q` 結束程式。小視窗置頂不保證跨 Spaces 或覆蓋其他程式全螢幕。

全螢幕透過 IOKit 防止閒置螢幕休眠；返回設定、最小化及退出時解除，小視窗不啟用。不阻止手動睡眠或闔蓋。Mac 設定與快取位於 Tauri 使用者資料目錄 `~/Library/Application Support/io.gphotoframe.desktop`，不放在 App／DMG 旁，不從 Windows 自動搬移。

Mac 開發需 Node.js 22、Rust stable、Xcode Command Line Tools；可執行相同的 npm／Rust 測試。在 Mac 上建置：

```sh
npm ci
npm test
npm run typecheck
cargo test --locked --manifest-path src-tauri/Cargo.toml
MACOS_SIGNING_MODE=test npm run build:macos
node scripts/release.cjs prepare v0.4.0 macos src-tauri/target/universal-apple-darwin/release release-staging/macos
```

正式模式使用 `MACOS_SIGNING_MODE=formal`，必須提供 `APPLE_SIGNING_IDENTITY`（Developer ID Application）、`APPLE_CERTIFICATE`（base64 p12）、`APPLE_CERTIFICATE_PASSWORD`、`APPLE_API_ISSUER`、`APPLE_API_KEY`、`APPLE_API_KEY_PATH`（p8 檔案）。憑證、公證或驗證失敗即停止，不降級。憑證不得提交 Git；現有 CI 明確使用 test，正式啟用時需由維護者配置 Secrets、p8 路徑及模式。

驗收界線與 Mac 實機清單見 [0.4.0 驗證記錄](VERIFICATION-0.4.0.md)。

### 免安裝版與支持開發

免安裝下載自 **0.3.3 正式發布**後可用。選擇安裝版（setup）或免安裝版（portable）其中一種即可；每種的版本檔名與固定檔名副本內容相同。免安裝 EXE 可直接執行，不建立捷徑或解除安裝項目，但仍需 [Microsoft WebView2 Runtime](https://developer.microsoft.com/microsoft-edge/webview2/)。缺少時請先安裝 Runtime，或改用安裝版。

兩版共用 `%LOCALAPPDATA%\io.gphotoframe.desktop` 的設定與照片快取；不是把資料存到 EXE 旁的隨身碟模式，請勿同時執行兩版。免安裝 EXE 同樣未簽章，請核對來源及 SHA-256。

設定頁左側品牌介紹下方提供「支持開發」及「版本資訊」，與右側功能設定分開。版本資訊可離線查看目前版本與 0.3.0 起的更新摘要，也可用外部瀏覽器查看線上 Releases；不會自動更新。PayPal 贊助完全自願，不影響免費功能；程式不處理付款或追蹤贊助者。

[下載 Windows x64 安裝程式](https://github.com/druidcub/gphoto/releases/latest/download/GPhoto-Frame-windows-x64-setup.exe) · [版本說明與歷史下載](https://github.com/druidcub/gphoto/releases) · [SHA-256 校驗碼](https://github.com/druidcub/gphoto/releases/latest/download/SHA256SUMS.txt)

下載 `.exe`，不是 Source code ZIP。首次正式 Release 公開前，下載連結尚不可用；草稿不會更新最新下載。安裝檔目前未簽章，Windows 可能顯示安全提醒；請核對來源與校驗碼，不要關閉安全防護。

以 Tauri 2、Rust、React 與 TypeScript 開發的 Windows／macOS 相片播放器。從 Google Photos 公開分享相簿或本機資料夾播放照片，支援全螢幕展示與可拖曳的小視窗。

## 功能特色

- 優先完整呈現照片，以同照片的模糊背景填滿畫面；前景放大上限固定為原始尺寸的 2 倍。
- 自動安排橫式單張、直式雙拼與 Pan & Zoom；雙拼背景平滑融合，沒有中央黑框。
- 柔和模式讓照片邊緣淡入背景；沉浸模式隱藏全螢幕控制與游標，兩者預設開啟。
- 投影片縮圖預覽、序號校對與指定頁播放。
- 每頁 10／15／30 秒、1／2／5 分鐘，預設 15 秒；換頁預載與 1.2 秒淡入淡出。
- Google Photos 背景同步、本機快取及離線播放。
- 小視窗可調整大小、移動及置頂；全螢幕播放請求 Windows 保持喚醒。

## 安裝與首次使用

1. 在 Windows 10／11 x64 執行可信任發行者提供的 `GPhoto Frame_<版本>_x64-setup.exe`。
2. 安裝後開啟 GPhoto Frame。程式需要 Microsoft Edge WebView2 Runtime；未安裝時，安裝程序可能需要連網下載。
3. 選擇 Google Photos 或本機資料夾，載入照片後先預覽或直接播放。

首次啟動預設選擇 Google Photos，但**網址欄為空白**，不內建任何真實相簿。網址與設定會自動記住，下次啟動恢復最後來源；更新版本不會清除原本已儲存的網址。

## Google Photos 分享相簿

1. 在 Google Photos 網頁或 App 登入自己的帳號。
2. 開啟要展示的相簿，或建立相簿並加入照片。
3. 使用相簿分享功能，啟用連結分享並複製連結。按鈕名稱可能因裝置而異，詳見 [Google 官方分享說明](https://support.google.com/photos/answer/6131416)。
4. 用未登入帳號的無痕視窗開啟連結，確認訪客能看到相簿。
5. 在 GPhoto Frame 選擇 Google Photos，貼入「公開分享相簿網址」，按載入／重新同步。
6. 第一張可用照片載入後即可播放，不必等整個相簿下載完畢。

只接受 `https://photos.app.goo.gl/…` 或 `https://photos.google.com/…`。程式不提供 Google 登入，只支援匿名可存取的分享相簿與靜態照片，不支援私人相簿、OAuth、影片或 Motion Photo 動態內容。

Google Photos 來源在啟動時同步，並每 5 分鐘背景同步。播放中取得的新清單於下一輪套用，不中斷目前照片。離線或同步失敗時可使用既有快取；沒有可用照片時無法播放。

> 任何持有分享連結的人可能都能查看相簿，請確認內容適合分享。停用連結不會刪除電腦已下載的照片。本功能解析公開分享頁，並非 Google 正式公開 API；Google 改版可能造成同步失效。

## 本機資料夾

切換至「本機資料夾」，使用預設快取資料夾，或瀏覽並選擇自己的資料夾，載入後即可預覽／播放。

支援 JPG、JPEG、PNG、WebP，只讀取所選資料夾的直接子檔案，不遞迴掃描子資料夾。Google Photos 同步時，其快取照片資料夾會成為本機來源的預設路徑；未設定本機路徑時也使用此資料夾。

共用快取可能保留多個曾同步相簿的照片，**不等於目前單一相簿清單**。若要離線播放目前相簿，保留 Google Photos 來源使用其快取即可。

## 播放設定與預覽

| 設定 | 說明 |
| --- | --- |
| 播放秒數 | 10／15／30 秒或 1／2／5 分鐘，預設 15 秒。 |
| 沉浸模式 | 預設開啟，全螢幕不建立右上控制列；關閉後移動滑鼠或暫停可顯示控制列。 |
| 柔和模式 | 預設開啟，照片邊緣羽化融入背景；校對邊緣細節時可關閉。 |
| 小視窗模式 | 預設關閉，開啟後在指定位置與尺寸播放。 |

預覽縮圖右上標示投影片／來源照片序號，下方說明留白方向及動畫或裁切方式；點選縮圖可從該頁播放。預覽清單在開啟時固定，不因背景同步改變校對序號；返回設定再開啟即可更新。

橫式照片一般靜態顯示，直式照片優先雙拼；其他比例或未配對的直式照片可使用 Pan & Zoom。動畫只作用於前景，中段輕微放大與垂直移動，首尾回到完整照片；中途邊緣可能暫時超出畫框。若已達 2 倍放大上限，會降為靜態。暫停會停止動畫，系統減少動態效果設定也可能停用動畫。預覽縮圖保持靜態。

## 小視窗操作

1. 勾選「小視窗模式」，按「設定大小與位置」。
2. 拖曳視窗內部移動，拖曳邊緣／四角調整大小，按儲存；取消或 `Esc` 放棄這次調整。
3. 播放時按住照片可拖動視窗。
4. **滑鼠移入畫面時**才顯示右上控制：📌 切換置頂，× 返回設定／預覽，不是結束整個程式。
5. `Esc` 同樣離開播放；最後位置與尺寸會記住，原設定視窗狀態會恢復。

沉浸模式下仍保留小視窗的滑鼠移入控制。小視窗不啟用防休眠，`F11` 不生效。

## 快捷鍵與防休眠

| 按鍵 | 功能 |
| --- | --- |
| `Space` | 暫停／繼續 |
| `→` / `←` | 下一頁／上一頁 |
| `Esc` | 離開播放回到原頁面；預覽返回設定 |
| `F11` | 切換全螢幕（小視窗除外） |

全螢幕播放會向 Windows 請求保持螢幕與系統喚醒，離開全螢幕、最小化或關閉程式時解除，不修改電源方案。不阻止手動睡眠、闔蓋、螢幕保護程式或系統強制鎖定；長時間展示仍請確認裝置管理政策。

## 設定、快取與隱私

Windows 使用者資料位於：

```text
%LOCALAPPDATA%\io.gphotoframe.desktop\
├── settings.json       # 最後來源、網址與播放／視窗設定
└── photo-cache\        # 下載照片與快取清單
    └── files\          # 本機來源的預設照片資料夾
```

快取目標上限為 2 GB，優先淘汰非目前相簿的較舊資料；目前相簿受保護，極端情況可能暫時超過上限。下載照片以 3840×2160 邊界限制尺寸，不要求裁切。

要重設設定，先關閉程式並備份，再刪除 `settings.json`。要清除下載照片，可在程式關閉時刪除上述 `photo-cache` 資料夾；這會失去離線照片，需要重新同步，不會刪除雲端相簿或自行選取的其他本機照片資料夾。

不要將個人設定、快取或真實分享網址放入公開原始碼。`.gitignore` 已排除設定、快取、安裝檔、相依套件與建置產物。

## 常見問題

- **網址無法同步：** 確認未登入的無痕視窗能開啟連結、網路可用且網域受支援；分享頁改版也可能需要更新程式。
- **本機來源出現其他相簿照片：** 共用快取可能保留舊相簿；改選自己的資料夾，或回到 Google Photos 來源使用目前相簿快取。
- **邊緣仍偏黑：** 背景沿用照片色彩，原照片自帶黑框或暗景仍可能顯暗；柔和模式減輕邊界，但不修復原始圖片。
- **安裝／建置遇到檔案被占用：** 關閉正在執行的 GPhoto Frame 後重試。

## 開發與測試

Windows 開發環境需要 Node.js（符合 Vite 6 的版本需求）、npm、Rust stable MSVC 工具鏈、Microsoft C++ Build Tools 的「Desktop development with C++」及 WebView2 Runtime。前端為 React/Vite，桌面與網路處理由 Rust 負責，沒有 Electron 或 Node backend。

在專案根目錄執行：

```powershell
npm ci
npm run dev
```

```powershell
npm test
npm run test:release
npm run typecheck
cargo test --manifest-path src-tauri/Cargo.toml
```

一般測試不依賴真實相簿。選用的網路測試需先將 `GPHOTO_TEST_ALBUM_URL` 環境變數設為自己的公開測試相簿，再執行：

```powershell
cargo test --manifest-path src-tauri/Cargo.toml live_shared_album_smoke_test -- --ignored
```

`npm run dev:web` 只啟動 Vite，不能取代含原生功能的 Tauri 測試。不要把開發／測試伺服器暴露到外網。歷史驗收與待人工驗證事項見 [0.3.0 驗證記錄](VERIFICATION-0.3.0.md)。

## 建置與發行

```powershell
npm run release:check -- v0.4.0
npm run build -- --bundles nsis -- --locked
npm run release:prepare -- v0.4.0
```

安裝檔輸出於 `src-tauri/target/release/bundle/nsis/`；`release:prepare` 將當前版本安裝檔、固定名稱 `GPhoto-Frame-windows-x64-setup.exe` 及 `SHA256SUMS.txt` 放到專案根目錄。兩份安裝檔內容相同，均不納入 Git，舊檔不刪除。整理腳本只整理既有輸出，必須先成功建置，不要將舊輸出當成新建置結果。

公開發行請使用 0.3.2 或後續已清除預設相簿的版本，不要混用舊安裝檔。以全新使用者資料驗證網址欄空白，並確認發行包不含個人快取或設定。可使用 `Get-FileHash -Algorithm SHA256 .\GPhoto-Frame-windows-x64-setup.exe` 與校驗碼檔比對。

### 發布至 GitHub（維護者）

確認遠端為 `https://github.com/druidcub/gphoto.git`，GitHub 儲存庫已存在且 Actions 可用。先提交所有改動，再執行（請勿覆寫已存在的版本標籤）：

```powershell
git push -u origin main
git tag -a v0.4.0 -m "GPhoto Frame 0.4.0"
git push origin v0.4.0
```

推送版本標籤會啟動 Windows、Mac ARM 建置及 Mac Intel 測試；全部成功後由單一工作合併資產與校驗碼，再建立或更新 **prerelease 草稿**，不自動公開。一般測試不存取真實相簿；版本不一致或測試失敗時停止。已公開的 Release 不可由此流程覆寫。

到 GitHub Actions 確認成功，再到 Releases 開啟草稿、下載測試、比對校驗碼，確認後手動公開預發行，保留 prerelease，不要設為 Latest。Windows 的 latest 入口仍提供上一個正式版；Mac 測試版從 Releases 頁取得。發布前不要在 workflow 執行中手動公開草稿。

未來版本需同步更新 npm／Tauri／Cargo 與 lockfile 的專案版本，新增 `release-notes/vX.Y.Z.md` 中英文發行說明，再推送相符標籤。流程使用內建 `GITHUB_TOKEN` 的 `contents: write`，不用個人 token；不包含程式內自動更新；Mac 正式簽章模式已預留，Windows 仍未簽章。

整理腳本現在也從同次建置的 `src-tauri/target/release/gphoto-frame.exe` 產生兩份免安裝 EXE，全部四個 EXE 都列入 `SHA256SUMS.txt`，缺少任一來源時停止。本機 Windows 整理只有四份 EXE 的校驗碼；GitHub 完整草稿須有四份 EXE、兩份 DMG 及一份包含六份檔案的校驗碼。未來更新時也請維護內建的 `src/shared/changelog.ts` 中英文摘要。

Sponsor 按鈕由 `.github/FUNDING.yml` 提供 PayPal 自訂連結；推送至預設分支後，在 GitHub Settings → General → Features 確認 Sponsorships 已啟用。

## 專案結構

```text
src/renderer/         React 頁面、照片版型、播放與預覽
src/shared/           TypeScript 共用型別
src-tauri/src/        Rust 設定、相簿同步／快取、跨平台電源控制
src-tauri/icons/      應用程式圖示
tests/                前端單元與元件測試
assets/               原始圖示素材
```

## 授權

[MIT License](LICENSE)。本專案不是 Google 官方產品，與 Google Photos 無隸屬關係；照片的使用與分享仍須遵守權利人的授權。
