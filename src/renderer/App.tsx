import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AppSettings, Photo, Slide, SyncEvent } from '../shared/types';
import {
  choosePhotoFolder, loadSettings, saveSettings, setFullscreen,
  syncGoogleAlbum, toggleFullscreen, scanPhotoFolder,
} from './core/desktop';
import { buildSlides, slidePhotoUrls } from './core/playlist';
import { inspectPhotos } from './core/photos';
import { PlayerPage } from './pages/PlayerPage';
import { SettingsPage } from './pages/SettingsPage';
import { PreviewPage } from './pages/PreviewPage';
import { normalizeDuration, playbackKey } from './core/playback';
import { preloadImages } from './core/preload';
import { MiniWindowSetup } from './pages/MiniWindowSetup';
import { enterMiniWindow, restoreWindow, readMiniBounds, dragMiniWindow, pinMiniWindow } from './core/miniWindow';
import { appPlatform, isFullscreenShortcut, type DesktopPlatform } from './core/platform';

const DEFAULT_SETTINGS: AppSettings = {
  sourceMode: 'googlePhotos',
  albumUrl: '',
  localFolderPath: '',
  immersiveMode: true,
  maxUpscale: 2,
  syncIntervalMinutes: 5,
  slideDurationSeconds: 15,
  softMode: true,
  miniWindowMode: false,
  miniWindowBounds: { x: 80, y: 80, width: 640, height: 360 },
};
const TRANSITION_DURATION_MS = 1_200;

function mergePhotos(current: Photo[], incoming: Photo[]): Photo[] {
  const byId = new Map(current.map((photo) => [photo.id, photo]));
  for (const photo of incoming) byId.set(photo.id, photo);
  return [...byId.values()];
}

export default function App() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [initialized, setInitialized] = useState(false);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const photosRef = useRef<Photo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const syncingRef = useRef(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [syncProgress, setSyncProgress] = useState<{ ready: number; total: number }>();
  const [error, setError] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [preview, setPreview] = useState<{ slides: Slide[]; photos: Photo[] } | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [activeSlides, setActiveSlides] = useState<Slide[]>([]);
  const [slideIndex, setSlideIndex] = useState(0);
  const [previousSlide, setPreviousSlide] = useState<Slide | null>(null);
  const transitionTimer = useRef<number>();
  const transitioning = useRef(false);
  const transitionGeneration = useRef(0);
  const [editingMiniWindow, setEditingMiniWindow] = useState(false);
  const [pinned, setPinned] = useState(false);
  const windowBusy = useRef(false);
  const [platform, setPlatform] = useState<DesktopPlatform>('web');
  useEffect(() => {
    let active = true;
    void appPlatform().then(value => { if (active) setPlatform(value); }).catch(reason => { if (active) setError(`無法取得平台資訊：${String(reason)}`); });
    return () => { active = false; };
  }, []);

  useEffect(() => { photosRef.current = photos; }, [photos]);
  const previewSlides = useMemo(() => buildSlides(photos), [photos]);
  const slides = isPlaying ? activeSlides : previewSlides;
  const currentSlide = slides[slideIndex];

  const inspectAndMerge = useCallback(async (paths: string[], replace = false) => {
    if (!paths.length) {
      if (replace) setPhotos([]);
      return;
    }
    const inspected = await inspectPhotos(paths);
    setPhotos((current) => replace ? inspected : mergePhotos(current, inspected));
  }, []);

  const loadLocalFolder = useCallback(async (folderPath: string) => {
    if (!folderPath) return;
    setIsLoading(true); setError('');
    try {
      const files = await scanPhotoFolder(folderPath);
      const inspected = await inspectPhotos(files);
      setPhotos(inspected); setSlideIndex(0);
      if (!inspected.length) setError('此資料夾目前沒有可播放照片，可先同步相簿或選擇其他資料夾。');
    } catch (reason) { setPhotos([]); setError(String(reason)); }
    finally { setIsLoading(false); }
  }, []);

  const runAlbumSync = useCallback(async (albumUrl: string, replaceAtStart = false) => {
    if (syncingRef.current || !albumUrl.trim()) return;
    syncingRef.current = true;
    setIsLoading(true);
    setError('');
    setSyncProgress(undefined);
    setSyncMessage('正在讀取相簿快取…');
    if (replaceAtStart) setPhotos([]);
    let pendingInspection = Promise.resolve();
    const queueInspection = (paths: string[]) => {
      pendingInspection = pendingInspection.then(() => inspectAndMerge(paths)).catch((reason) => setError(String(reason)));
    };

    const onEvent = (event: SyncEvent) => {
      if (event.type === 'cached') {
        setSettings((current) => ({ ...current, localFolderPath: event.folderPath }));
        setSyncMessage(event.paths.length ? `已載入 ${event.paths.length} 張快取，正在檢查更新…` : '正在取得相簿內容…');
        queueInspection(event.paths);
      } else if (event.type === 'manifest') {
        setSyncProgress({ ready: 0, total: event.total });
        setSyncMessage(`找到 ${event.total} 張照片，正在同步…`);
      } else if (event.type === 'photoReady') {
        queueInspection([event.path]);
      } else if (event.type === 'progress') {
        setSyncProgress({ ready: event.ready, total: event.total });
        setSyncMessage(`已準備 ${event.ready} / ${event.total} 張照片`);
      } else if (event.type === 'warning') {
        setSyncMessage(event.message);
      }
    };

    try {
      const summary = await syncGoogleAlbum(albumUrl.trim(), onEvent);
      await pendingInspection;
      await inspectAndMerge(summary.paths, true);
      setSyncMessage(`同步完成：${summary.paths.length} 張照片${summary.added ? `，新增 ${summary.added} 張` : ''}`);
      setSyncProgress({ ready: summary.paths.length, total: summary.paths.length });
    } catch (reason) {
      await pendingInspection;
      const message = reason instanceof Error ? reason.message : String(reason);
      setError(photosRef.current.length ? `同步失敗，繼續使用既有快取：${message}` : message);
      setSyncMessage('同步未完成');
    } finally {
      await pendingInspection;
      syncingRef.current = false;
      setIsLoading(false);
    }
  }, [inspectAndMerge]);

  useEffect(() => {
    let cancelled = false;
    void loadSettings().then((loaded) => {
      if (cancelled) return;
      setSettings({ ...DEFAULT_SETTINGS, ...loaded, maxUpscale: 2, slideDurationSeconds: normalizeDuration(loaded.slideDurationSeconds) });
      setInitialized(true);
      if (loaded.sourceMode === 'googlePhotos') void runAlbumSync(loaded.albumUrl, true);
      else if (loaded.localFolderPath) void loadLocalFolder(loaded.localFolderPath);
    }).catch((reason) => {
      if (cancelled) return;
      setInitialized(true);
      setError(`無法載入設定，已使用預設值：${String(reason)}`);
      void runAlbumSync(DEFAULT_SETTINGS.albumUrl, true);
    });
    return () => { cancelled = true; };
  }, [runAlbumSync, loadLocalFolder]);

  useEffect(() => {
    if (!initialized) return;
    const timer = window.setTimeout(() => void saveSettings(settings).catch((reason) => setError(`設定儲存失敗：${String(reason)}`)), 250);
    return () => window.clearTimeout(timer);
  }, [initialized, settings]);

  useEffect(() => {
    if (!initialized || settings.sourceMode !== 'googlePhotos' || !settings.albumUrl.trim()) return;
    const timer = window.setInterval(
      () => void runAlbumSync(settings.albumUrl),
      settings.syncIntervalMinutes * 60_000,
    );
    return () => window.clearInterval(timer);
  }, [initialized, runAlbumSync, settings.albumUrl, settings.sourceMode, settings.syncIntervalMinutes]);

  const showTransition = useCallback((nextIndex: number, nextSlides = activeSlides) => {
    if (!nextSlides.length || transitioning.current) return;
    const index = (nextIndex + nextSlides.length) % nextSlides.length;
    if (nextSlides[index].id === activeSlides[slideIndex]?.id) return;
    transitioning.current = true;
    setError('');
    const generation = ++transitionGeneration.current;
    void preloadImages(slidePhotoUrls(nextSlides[index])).then(() => {
      if (generation !== transitionGeneration.current) return;
      setPreviousSlide(activeSlides[slideIndex] ?? null);
      setActiveSlides(nextSlides);
      setSlideIndex(index);
      transitionTimer.current = window.setTimeout(() => { setPreviousSlide(null); transitioning.current = false; }, TRANSITION_DURATION_MS);
    }).catch((reason) => {
      if (generation !== transitionGeneration.current) return;
      transitioning.current = false;
      setError(`無法切換照片：${String(reason)}`);
    });
  }, [activeSlides, slideIndex]);

  const moveBy = useCallback((offset: number) => {
    if (!activeSlides.length) return;
    if (offset > 0 && slideIndex === activeSlides.length - 1) {
      showTransition(0, buildSlides(photosRef.current));
    } else {
      showTransition(slideIndex + offset);
    }
  }, [activeSlides.length, showTransition, slideIndex]);

  useEffect(() => {
    if (!isPlaying || isPaused || activeSlides.length < 2) return;
    const timer = window.setTimeout(() => moveBy(1), settings.slideDurationSeconds * 1000);
    return () => window.clearTimeout(timer);
  }, [activeSlides.length, isPaused, isPlaying, moveBy, settings.slideDurationSeconds]);

  useEffect(() => {
    if (!isPlaying || activeSlides.length < 2) return;
    const upcoming = activeSlides[(slideIndex + 1) % activeSlides.length];
    for (const url of slidePhotoUrls(upcoming)) { const image = new Image(); image.src = url; }
  }, [activeSlides, isPlaying, slideIndex]);

  const leavePlayer = useCallback(async () => {
    if (windowBusy.current) return;
    windowBusy.current = true;
    ++transitionGeneration.current;
    window.clearTimeout(transitionTimer.current);
    transitioning.current = false;
    try {
      if (settings.miniWindowMode) {
        const bounds = await readMiniBounds();
        setSettings((current) => ({ ...current, miniWindowBounds: bounds }));
      }
      await setFullscreen(false);
      if (settings.miniWindowMode) await restoreWindow();
      setIsPlaying(false); setIsPaused(false); setPreviousSlide(null); setPinned(false);
    } catch (reason) { setError(`無法恢復視窗：${String(reason)}`); }
    finally { windowBusy.current = false; }
  }, [settings.miniWindowMode]);

  useEffect(() => {
    if (!isPlaying) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const key = playbackKey(event);
      if (key === 'Space') { event.preventDefault(); if (!event.repeat) setIsPaused((paused) => !paused); }
      else if (key === 'ArrowRight') { event.preventDefault(); moveBy(1); }
      else if (key === 'ArrowLeft') { event.preventDefault(); moveBy(-1); }
      else if (key === 'Escape') { event.preventDefault(); void leavePlayer(); }
      else if (isFullscreenShortcut(event, platform)) { event.preventDefault(); if (!event.repeat && !settings.miniWindowMode) void toggleFullscreen().catch((reason) => setError(String(reason))); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isPlaying, leavePlayer, moveBy, settings.miniWindowMode, platform]);

  useEffect(() => () => { window.clearTimeout(transitionTimer.current); ++transitionGeneration.current; }, []);

  const chooseFolder = async () => {
    setError(''); setIsLoading(true);
    try {
      const selection = await choosePhotoFolder(settings.localFolderPath);
      if (!selection) return;
      setSettings((current) => ({ ...current, sourceMode: 'local', localFolderPath: selection.folderPath }));
      const inspected = await inspectPhotos(selection.files);
      setPhotos(inspected); setSlideIndex(0);
      if (!inspected.length) setError('此資料夾沒有可讀取的照片。');
      else if (inspected.length < selection.files.length) setError(`有 ${selection.files.length - inspected.length} 張照片無法讀取，已略過。`);
    } catch (reason) { setPhotos([]); setError(reason instanceof Error ? reason.message : String(reason)); }
    finally { setIsLoading(false); }
  };

  const changeSettings = (patch: Partial<AppSettings>) => {
    if (patch.sourceMode && isLoading) return;
    if (patch.sourceMode && patch.sourceMode !== settings.sourceMode) {
      setPhotos([]); setSyncMessage(''); setSyncProgress(undefined); setError('');
      if (patch.sourceMode === 'googlePhotos') void runAlbumSync(settings.albumUrl, true);
      else if (settings.localFolderPath) void loadLocalFolder(settings.localFolderPath);
    }
    setSettings((current) => ({ ...current, ...patch }));
  };

  const startPlayer = async (startIndex = 0, nextSlides = buildSlides(photos)) => {
    if (!nextSlides.length || windowBusy.current) return;
    windowBusy.current = true;
    setError('');
    try {
      await preloadImages(slidePhotoUrls(nextSlides[startIndex]));
      if (settings.miniWindowMode) await enterMiniWindow(settings.miniWindowBounds, false);
      else await setFullscreen(true);
      setActiveSlides(nextSlides); setSlideIndex(startIndex); setIsPlaying(true); setPinned(false);
    } catch (reason) {
      await setFullscreen(false).catch(() => {});
      if (settings.miniWindowMode) await restoreWindow().catch(() => {});
      setError(`無法開始播放：${String(reason)}`);
    } finally { windowBusy.current = false; }
  };

  const configureMiniWindow = async () => {
    if (windowBusy.current) return;
    windowBusy.current = true;
    try { await enterMiniWindow(settings.miniWindowBounds, true); setEditingMiniWindow(true); }
    catch (reason) { await restoreWindow().catch(() => {}); setError(String(reason)); }
    finally { windowBusy.current = false; }
  };
  const finishMiniSetup = useCallback(async (save: boolean) => {
    if (windowBusy.current) return;
    windowBusy.current = true;
    try {
      const bounds = save ? await readMiniBounds() : undefined;
      await restoreWindow();
      if (bounds) setSettings((current) => ({ ...current, miniWindowBounds: bounds }));
      setEditingMiniWindow(false);
    } catch (reason) { setError(String(reason)); }
    finally { windowBusy.current = false; }
  }, []);

  if (editingMiniWindow) return <MiniWindowSetup onFinish={finishMiniSetup} />;

  if (isPlaying && currentSlide) {
    return <PlayerPage slide={currentSlide} previousSlide={previousSlide} paused={isPaused}
      slideNumber={slideIndex + 1} totalSlides={slides.length} immersiveMode={settings.immersiveMode}
      maxUpscale={2} slideDurationSeconds={settings.slideDurationSeconds} onExit={() => void leavePlayer()}
      softMode={settings.softMode} miniWindowMode={settings.miniWindowMode} pinned={pinned} error={error}
      onDrag={() => void dragMiniWindow().catch((reason) => setError(String(reason)))}
      onPin={() => { void pinMiniWindow(!pinned).then(() => setPinned(!pinned)).catch((reason) => setError(String(reason))); }} />;
  }

  if (preview) return <PreviewPage slides={preview.slides} photos={preview.photos} syncing={isLoading} softMode={settings.softMode}
    onBack={() => setPreview(null)} onPlay={(index) => void startPlayer(index, preview.slides)} />;

  return <SettingsPage settings={settings} photoCount={photos.length} isLoading={isLoading}
    syncMessage={syncMessage} syncProgress={syncProgress} error={error}
    onSettingsChange={changeSettings} onChooseFolder={() => void chooseFolder()}
    onSyncAlbum={() => void runAlbumSync(settings.albumUrl, true)} onStart={() => void startPlayer()}
    onPreview={() => setPreview({ slides: previewSlides, photos: [...photos] })} onConfigureMiniWindow={() => void configureMiniWindow()} />;
}
