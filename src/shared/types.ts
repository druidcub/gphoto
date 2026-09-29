export type Photo = {
  id: string;
  path: string;
  url: string;
  name: string;
  width: number;
  height: number;
  aspectRatio: number;
};

export type SourceMode = 'googlePhotos' | 'local';
export type MiniWindowBounds = { x: number; y: number; width: number; height: number };

export type AppSettings = {
  sourceMode: SourceMode;
  albumUrl: string;
  localFolderPath: string;
  immersiveMode: boolean;
  maxUpscale: number;
  syncIntervalMinutes: number;
  slideDurationSeconds: number;
  softMode: boolean;
  miniWindowMode: boolean;
  miniWindowBounds: MiniWindowBounds;
};

export type SyncEvent =
  | { type: 'cached'; paths: string[]; folderPath: string }
  | { type: 'manifest'; total: number }
  | { type: 'photoReady'; path: string; mediaId: string }
  | { type: 'progress'; ready: number; total: number }
  | { type: 'warning'; message: string }
  | { type: 'complete'; added: number; removed: number };

export type SyncSummary = {
  added: number;
  removed: number;
  paths: string[];
};

export type Slide =
  | { id: string; type: 'landscape'; photo: Photo }
  | { id: string; type: 'panzoom'; photo: Photo }
  | { id: string; type: 'verticalPair'; left: Photo; right: Photo };

export type FolderSelection = {
  folderPath: string;
  files: string[];
};
