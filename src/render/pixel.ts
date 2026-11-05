import { getAsset } from './assets';
import type { PixelRect, RegisteredPixelAsset } from './types';

type RowSegment = {
  x: number;
  w: number;
  p: number;
};

const rectCache = new Map<string, PixelRect[]>();

export function buildRectsFromAsset(asset: RegisteredPixelAsset): PixelRect[] {
  const { width, height, palette, runs } = asset;
  const rows: RowSegment[][] = Array.from({ length: height }, () => []);

  for (const [offset, length, p] of runs) {
    const color = palette[p];
    if (!color || color[3] === 0) {
      continue;
    }

    let cur = offset;
    let rem = length;

    while (rem > 0) {
      const y = Math.floor(cur / width);
      const x = cur % width;
      const w = Math.min(rem, width - x);

      if (y >= 0 && y < height) {
        const row = rows[y];
        const last = row[row.length - 1];
        if (last && last.x + last.w === x && last.p === p) {
          last.w += w;
        } else {
          row.push({ x, w, p });
        }
      }

      cur += w;
      rem -= w;
    }
  }

  const result: PixelRect[] = [];
  let active = new Map<string, PixelRect>();

  for (let y = 0; y < height; y++) {
    const nextActive = new Map<string, PixelRect>();

    for (const seg of rows[y]) {
      const key = `${seg.x}:${seg.w}:${seg.p}`;
      const prev = active.get(key);
      if (prev) {
        prev.h += 1;
        nextActive.set(key, prev);
      } else {
        const rect: PixelRect = {
          x: seg.x,
          y,
          w: seg.w,
          h: 1,
          p: seg.p,
        };
        result.push(rect);
        nextActive.set(key, rect);
      }
    }

    active = nextActive;
  }

  return result;
}

export function getAssetRects(id: string): PixelRect[] {
  const cached = rectCache.get(id);
  if (cached) {
    return cached;
  }

  const asset = getAsset(id);
  if (!asset) {
    return [];
  }

  const rects = buildRectsFromAsset(asset);
  rectCache.set(id, rects);
  return rects;
}

export function rgbaToCss(rgba: number[]): string {
  const [r, g, b, a = 255] = rgba;
  if (a === 255) {
    return (
      '#' +
      [r, g, b]
        .map((v) => v.toString(16).padStart(2, '0'))
        .join('')
        .toUpperCase()
    );
  }
  return `rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(3)})`;
}

