export function preloadImages(urls: string[]): Promise<void> {
  return Promise.all(urls.map((src) => new Promise<void>((resolve, reject) => {
    const image = new Image();
    const timer = window.setTimeout(() => { image.onload = null; image.onerror = null; reject(new Error('照片載入逾時')); }, 15000);
    const finish = (error?: Error) => { window.clearTimeout(timer); image.onload = null; image.onerror = null; error ? reject(error) : resolve(); };
    image.onload = () => { void image.decode().then(() => finish()).catch(() => finish()); };
    image.onerror = () => finish(new Error('照片無法載入'));
    image.src = src;
  }))).then(() => undefined);
}
