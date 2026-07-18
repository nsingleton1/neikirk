const LOAD_TIMEOUT_MS = 15000;
const RETRIES = 2;

export class AssetLoader {
  private cache = new Map<string, HTMLImageElement>();
  private pending = new Map<string, Promise<HTMLImageElement>>();

  get(url: string): HTMLImageElement | undefined {
    return this.cache.get(url);
  }

  private loadOne(url: string): Promise<HTMLImageElement> {
    const existing = this.pending.get(url);
    if (existing) return existing;
    const attempt = (retriesLeft: number): Promise<HTMLImageElement> =>
      new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        const timer = setTimeout(() => {
          img.src = "";
          fail(new Error(`timeout loading ${url}`));
        }, LOAD_TIMEOUT_MS);
        const fail = (err: Error) => {
          clearTimeout(timer);
          if (retriesLeft > 0) resolve(attempt(retriesLeft - 1));
          else reject(err);
        };
        img.onload = () => {
          clearTimeout(timer);
          this.cache.set(url, img);
          resolve(img);
        };
        img.onerror = () => fail(new Error(`failed loading ${url}`));
        img.src = url;
      });
    const p = attempt(RETRIES);
    this.pending.set(url, p);
    return p;
  }

  /** Load a batch, reporting fractional progress. Rejects if any asset fails. */
  async loadAll(
    urls: string[],
    onProgress?: (fraction: number) => void,
  ): Promise<void> {
    const unique = [...new Set(urls)].filter((u) => !this.cache.has(u));
    if (unique.length === 0) {
      onProgress?.(1);
      return;
    }
    let done = 0;
    await Promise.all(
      unique.map((u) =>
        this.loadOne(u).then(() => {
          done++;
          onProgress?.(done / unique.length);
        }),
      ),
    );
  }

  /** Fire-and-forget background preload; failures surface later on use. */
  preload(urls: string[]): void {
    for (const u of new Set(urls)) {
      if (!this.cache.has(u)) this.loadOne(u).catch(() => undefined);
    }
  }
}
