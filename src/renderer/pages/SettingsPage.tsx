import type { AppSettings, SourceMode } from '../../shared/types';
import { SLIDE_DURATIONS } from '../core/playback';
import { AppInfo } from '../components/AppInfo';

type SettingsPageProps = {
  settings: AppSettings;
  photoCount: number;
  isLoading: boolean;
  syncMessage: string;
  syncProgress?: { ready: number; total: number };
  error: string;
  onSettingsChange: (patch: Partial<AppSettings>) => void;
  onChooseFolder: () => void;
  onSyncAlbum: () => void;
  onStart: () => void;
  onPreview: () => void;
  onConfigureMiniWindow: () => void;
};

export function SettingsPage({
  settings, photoCount, isLoading, syncMessage, syncProgress, error,
  onSettingsChange, onChooseFolder, onSyncAlbum, onStart, onPreview, onConfigureMiniWindow,
}: SettingsPageProps) {
  const setSource = (sourceMode: SourceMode) => onSettingsChange({ sourceMode });
  const progressPercent = syncProgress?.total
    ? Math.round((syncProgress.ready / syncProgress.total) * 100)
    : 0;

  return (
    <main className="settings-page">
      <section className="brand-block">
        <span className="eyebrow">AMBIENT PHOTO DISPLAY</span>
        <h1>GPhoto <em>Frame</em></h1>
        <p>完整保留每張照片，再用它自己的色彩填滿空間。</p>
        <AppInfo />
      </section>

      <section className="setup-card">
        <div className="step-marker">01 · PHOTO SOURCE</div>
        <div className="source-tabs" role="tablist" aria-label="照片來源">
          <button className={settings.sourceMode === 'googlePhotos' ? 'active' : ''} type="button" disabled={isLoading} onClick={() => setSource('googlePhotos')}>Google Photos</button>
          <button className={settings.sourceMode === 'local' ? 'active' : ''} type="button" disabled={isLoading} onClick={() => setSource('local')}>本機資料夾</button>
        </div>

        {settings.sourceMode === 'googlePhotos' ? (
          <div className="source-panel">
            <label htmlFor="album-url">公開分享相簿網址</label>
            <div className="url-row">
              <input
                id="album-url"
                type="url"
                value={settings.albumUrl}
                placeholder="請貼上 Google 相簿分享連結"
                onChange={(event) => onSettingsChange({ albumUrl: event.target.value })}
                spellCheck={false}
              />
              <button type="button" onClick={onSyncAlbum} disabled={isLoading || !settings.albumUrl.trim()}>
                {isLoading ? '同步中' : photoCount ? '重新同步' : '載入相簿'}
              </button>
            </div>
            {syncProgress && syncProgress.total > 0 && (
              <div className="sync-progress" aria-label={`同步進度 ${progressPercent}%`}>
                <span style={{ width: `${progressPercent}%` }} />
              </div>
            )}
            <small className="source-status">{syncMessage || (settings.albumUrl.trim() ? '啟動時同步，播放期間每 5 分鐘檢查更新。' : '首次使用請貼上分享連結；網址會自動記住。')}</small>
            <details className="album-help">
              <summary>第一次使用？如何取得相簿分享網址</summary>
              <ol>
                <li>在電腦瀏覽器開啟 photos.google.com，或在手機開啟 Google 相簿 App，登入你的 Google 帳戶。</li>
                <li>開啟要播放的相簿。還沒有相簿時，先選取照片並新增至相簿，再開啟該相簿。</li>
                <li>在相簿內按「分享」，選擇「建立連結」，再按「複製連結」。如果相簿已開啟連結分享，直接複製現有連結即可；按鈕名稱可能依版本略有不同。</li>
                <li>回到這裡，將完整連結貼入上方網址欄，按「載入相簿」或「重新同步」。第一張照片準備好後就能預覽或播放。</li>
              </ol>
              <p>請複製「相簿分享連結」，不要直接複製私人相簿的瀏覽器網址，也不要只分享單張照片。本程式只支援不需登入即可觀看的分享相簿。</p>
              <p>無法載入？先在瀏覽器的無痕視窗開啟連結；若要求登入或存取權限，請回到相簿的分享選項確認已開啟「連結分享」。</p>
              <p className="album-help-privacy">隱私提醒：任何取得分享連結的人都可能查看相簿。只分享適合公開的照片；不再分享時，可到相簿的分享選項關閉「連結分享」。本機已快取的照片不會因此自動刪除。</p>
            </details>
          </div>
        ) : (
          <div className="source-panel">
            <button className="folder-picker" type="button" onClick={onChooseFolder} disabled={isLoading}>
              <span className="folder-icon">⌁</span>
              <span className="folder-details">
                <strong>{isLoading ? '正在分析照片…' : settings.localFolderPath ? '已選擇資料夾' : '瀏覽本機照片'}</strong>
                <small>{settings.localFolderPath || '選擇包含照片的資料夾'}</small>
              </span>
              <span className="arrow">→</span>
            </button>
            <small className="source-status">同步相簿後，預設使用照片快取資料夾；也可選擇其他資料夾。快取可能包含先前同步的其他相簿照片。</small>
          </div>
        )}

        <div className="playback-options">
          <label className="toggle-row">
            <span><strong>柔和模式</strong><small>照片邊緣羽化，與模糊背景自然融合</small></span>
            <input type="checkbox" checked={settings.softMode} onChange={(event) => onSettingsChange({ softMode: event.target.checked })} />
          </label>
          <label className="toggle-row">
            <span><strong>小視窗模式</strong><small>在指定位置播放，可拖曳與釘選置頂</small></span>
            <input type="checkbox" checked={settings.miniWindowMode} onChange={(event) => onSettingsChange({ miniWindowMode: event.target.checked })} />
          </label>
          {settings.miniWindowMode && <div className="mini-settings">
            <small>{settings.miniWindowBounds.width} × {settings.miniWindowBounds.height} px · X {settings.miniWindowBounds.x} / Y {settings.miniWindowBounds.y}</small>
            <button type="button" className="preview-button" onClick={onConfigureMiniWindow}>設定大小與位置</button>
          </div>}
          <label className="select-row">
            <span><strong>每張投影片播放時間</strong><small>動畫隨播放時間調整</small></span>
            <select value={settings.slideDurationSeconds} onChange={(event) => onSettingsChange({ slideDurationSeconds: Number(event.target.value) })}>
              {SLIDE_DURATIONS.map((seconds) => <option key={seconds} value={seconds}>{seconds < 60 ? `${seconds} 秒` : `${seconds / 60} 分鐘`}</option>)}
            </select>
          </label>
          <label className="toggle-row">
            <span><strong>沉浸模式</strong><small>全螢幕隱藏控制與張數；小視窗滑鼠移入才顯示按鈕</small></span>
            <input type="checkbox" checked={settings.immersiveMode} onChange={(event) => onSettingsChange({ immersiveMode: event.target.checked })} />
          </label>
        </div>

        {photoCount > 0 && <div className="selection-summary"><span>{photoCount}</span> 張可播放照片</div>}
        {error && <p className="error-message">{error}</p>}

        <button className="preview-button" type="button" onClick={onPreview} disabled={photoCount === 0}>
          預覽所有投影片
        </button>
        <button className="start-button" type="button" onClick={onStart} disabled={photoCount === 0}>
          {settings.miniWindowMode ? '開始小視窗播放' : '開始全螢幕播放'} <span>↗</span>
        </button>
      </section>

      <footer>
        <span>TAURI 2 · SMART PHOTO FRAME</span>
        <span>Space 暫停 · ← → 切換 · Esc 返回設定</span>
      </footer>
    </main>
  );
}
