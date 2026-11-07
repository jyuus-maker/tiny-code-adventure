import {
  BROKEN_ITEM_LIGHTNESS_SCALE,
  BROKEN_ITEM_SATURATION_SCALE,
} from '../config';
import { getAsset } from './assets';
import { getAssetRects } from './pixel';

export type SparklePoint = {
  x: number;
  y: number;
};

const sparklePointsCache = new Map<string, SparklePoint[]>();


function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;

  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;

  if (max === min) {
    return [0, 0, l];
  }

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let h = 0;
  if (max === rn) {
    h = (gn - bn) / d + (gn < bn ? 6 : 0);
  } else if (max === gn) {
    h = (bn - rn) / d + 2;
  } else {
    h = (rn - gn) / d + 4;
  }
  h /= 6;

  return [h, s, l];
}

function hueToRgb(p: number, q: number, t: number): number {
  let tn = t;
  if (tn < 0) tn += 1;
  if (tn > 1) tn -= 1;
  if (tn < 1 / 6) return p + (q - p) * 6 * tn;
  if (tn < 1 / 2) return q;
  if (tn < 2 / 3) return p + (q - p) * (2 / 3 - tn) * 6;
  return p;
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) {
    const v = Math.round(l * 255);
    return [v, v, v];
  }

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;

  const r = Math.round(hueToRgb(p, q, h + 1 / 3) * 255);
  const g = Math.round(hueToRgb(p, q, h) * 255);
  const b = Math.round(hueToRgb(p, q, h - 1 / 3) * 255);

  return [r, g, b];
}

export function buildBrokenItemPalette(palette: number[][]): number[][] {
  return palette.map((rgba) => {
    if (!rgba) return rgba;
    const [r, g, b, a = 255] = rgba;
    if (a === 0) {
      return rgba;
    }

    const [h, s, l] = rgbToHsl(r, g, b);
    const nextS = Math.max(0, Math.min(1, s * BROKEN_ITEM_SATURATION_SCALE));
    const nextL = Math.max(0, Math.min(1, l * BROKEN_ITEM_LIGHTNESS_SCALE));
    const [nr, ng, nb] = hslToRgb(h, nextS, nextL);

    return [nr, ng, nb, a];
  });
}

export function getItemSparklePoints(assetId: string): SparklePoint[] {
  const cached = sparklePointsCache.get(assetId);
  if (cached) {
    return cached;
  }

  const asset = getAsset(assetId);
  if (!asset) {
    return [];
  }

  const { width, height, palette } = asset;
  const opaque = new Uint8Array(width * height);

  for (const r of getAssetRects(assetId)) {
    const color = palette[r.p];
    if (!color || color[3] === 0) continue;
    for (let dy = 0; dy < r.h; dy++) {
      const y = r.y + dy;
      if (y < 0 || y >= height) continue;
      const rowOffset = y * width;
      for (let dx = 0; dx < r.w; dx++) {
        const x = r.x + dx;
        if (x >= 0 && x < width) {
          opaque[rowOffset + x] = 1;
        }
      }
    }
  }

  const isOpaque = (x: number, y: number): boolean => {
    if (x < 0 || x >= width || y < 0 || y >= height) {
      return false;
    }
    return opaque[y * width + x] === 1;
  };

  const edgePixels: SparklePoint[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!isOpaque(x, y)) continue;
      if (
        !isOpaque(x, y - 1) ||
        !isOpaque(x, y + 1) ||
        !isOpaque(x - 1, y) ||
        !isOpaque(x + 1, y)
      ) {
        edgePixels.push({ x, y });
      }
    }
  }

  if (edgePixels.length === 0) {
    sparklePointsCache.set(assetId, []);
    return [];
  }

  let firstIdx = 0;
  let bestScore = edgePixels[0].x - edgePixels[0].y;
  let bestY = edgePixels[0].y;

  for (let i = 1; i < edgePixels.length; i++) {
    const pt = edgePixels[i];
    const score = pt.x - pt.y;
    if (score > bestScore || (score === bestScore && pt.y < bestY)) {
      bestScore = score;
      bestY = pt.y;
      firstIdx = i;
    }
  }

  const chosen: SparklePoint[] = [edgePixels[firstIdx]];
  const usedIndices = new Set<number>([firstIdx]);

  while (chosen.length < 3 && chosen.length < edgePixels.length) {
    let bestIdx = -1;
    let maxMinDistSq = -1;

    for (let i = 0; i < edgePixels.length; i++) {
      if (usedIndices.has(i)) continue;
      const candidate = edgePixels[i];
      let minDistSq = Infinity;

      for (const picked of chosen) {
        const dx = candidate.x - picked.x;
        const dy = candidate.y - picked.y;
        const distSq = dx * dx + dy * dy;
        if (distSq < minDistSq) {
          minDistSq = distSq;
        }
      }

      if (minDistSq > maxMinDistSq) {
        maxMinDistSq = minDistSq;
        bestIdx = i;
      }
    }

    if (bestIdx === -1) break;
    usedIndices.add(bestIdx);
    chosen.push(edgePixels[bestIdx]);
  }

  sparklePointsCache.set(assetId, chosen);
  return chosen;
}

