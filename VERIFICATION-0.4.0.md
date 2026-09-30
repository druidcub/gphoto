# 0.4.0 跨平台驗收 / Cross-platform validation

## 驗收界線

開發主機為 Windows，沒有 Mac 實機。Mac CI、DMG 產生、Gatekeeper 與實際播放尚未執行，不宣稱已完成；本次為 macOS 12+ Universal 測試版架構。

## 本機驗證命令

已通過：41 項前端測試、11 項發行腳本測試、TypeScript 檢查、13 項 Rust 測試（另 1 項網路測試依設計略過）及 0.4.0 版本一致性檢查。正式依賴 `npm audit --omit=dev` 為 0 項弱點；開發依賴仍有既有的 5 項警告，本次未強制升級測試框架。

Windows NSIS release 建置及根目錄交付整理已完成，兩份安裝程式副本及兩份免安裝副本各自內容相同。Mac 的自訂邊緣縮放使用指標捕捉及實體座標計算，因底層 Tao 的 macOS `drag_resize_window` 回傳不支援；計算已有單元測試，實際指標捕捉仍須 Mac 實機驗收。

| Windows 格式 | SHA-256（版本檔名與固定檔名相同） |
| --- | --- |
| 安裝版 | `6716a92978f81443207a0770c6290b2a13a86ccc64060f43d0dece5cf543572c` |
| 免安裝版 | `e8f8a23175c156dc2e091db62869ebfd506d78fa15cbae6b1648bda66ddc149a` |

Git 未納入 EXE、DMG、校驗碼、個人設定、快取或 Apple 憑證。本次未自動推送、建立遠端標籤或公開 Release；Windows 原生視覺回歸與 Mac 實機檢查保留為人工驗收。

```text
npm test
npm run typecheck
npm run test:release
cargo test --offline --locked --manifest-path src-tauri/Cargo.toml
node scripts/release.cjs check v0.4.0
npm run build -- --bundles nsis -- --locked
node scripts/release.cjs prepare v0.4.0 windows
```

本機 Windows 整理只產生四份 EXE 及 Windows 校驗碼，不冒充含 Mac 的完整交付。CI 完整交付必須包含四份 EXE、兩份 DMG 及一份涵蓋六份檔案的校驗碼。

## CI／正式發布前待驗證

- [ ] 推送後 Windows、macos-15 ARM 與 macos-15-intel 三個工作成功。
- [ ] Universal 執行檔含 arm64、x86_64；bundle 版本、識別碼、macOS 12 最低版本正確。
- [ ] 單一彙整工作建立 prerelease 草稿；七項資產完整，固定檔名與版本檔名雜湊相同。
- [ ] 缺少任一平台、校驗碼不符或測試失敗時停止；已公開版本不被覆寫。
- [ ] 新使用者網址空白、不同步個人相簿；既有設定不被清除。
- [ ] Intel、Apple Silicon 及 macOS 12 實機的本機相片、Google 相簿同步、離線快取。
- [ ] 16:9、4:3、3:4、9:16、800×600、雙拼比例不同：完整照片、柔和邊緣、背景融合、動畫與交叉淡入淡出。
- [ ] 原生全螢幕／Esc／Control+Command+F、Command+Q、快速操作及視窗恢復。
- [ ] Retina、負座標副螢幕、跨 DPI 移動、拔除螢幕後小視窗位置與邊緣縮放。
- [ ] 小視窗滑鼠移入控制、置頂、取消置頂、回設定；不保證跨 Spaces 置頂。
- [ ] 長時間全螢幕維持顯示器喚醒，最小化、離開播放、關閉及退出後釋放 assertion；不阻止手動睡眠或闔蓋。
- [ ] macOS 12 舊 WebKit 的對話框開關、Esc、Tab／Shift+Tab 焦點限制及返回觸發按鈕。
- [ ] 正式模式缺少憑證停止；Developer ID 簽章、公證、staple 與下載後 Gatekeeper 驗證。

不要同時啟動安裝版與免安裝版寫入資料；不使用真實個人相簿作為一般 CI 測試來源。
