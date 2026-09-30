import type { Photo } from '../../shared/types';
import { convertFileSrc } from '@tauri-apps/api/core';

function loadImage(filePath: string): Promise<Photo | null> {
  return new Promise((resolve) => {
    const image = new Image();
    const url = convertFileSrc(filePath);
    image.onload = () => {
      const name = filePath.split(/[\\/]/).pop() ?? filePath;
      resolve({
        id: filePath,
        path: filePath,
        url,
        name,
        width: image.naturalWidth,
        height: image.naturalHeight,
        aspectRatio: image.naturalWidth / image.naturalHeight,
      });
    };
    image.onerror = () => resolve(null);
    image.src = url;
  });
}

export async function inspectPhotos(paths: string[]): Promise<Photo[]> {
  const settled = await Promise.all(paths.map(loadImage));
  return settled.filter((photo): photo is Photo => photo !== null);
}
