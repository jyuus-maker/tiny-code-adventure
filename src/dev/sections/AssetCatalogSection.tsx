import { useMemo } from 'react';
import { type Region } from '../../config';
import { getAllAssets } from '../../render/assets';
import { getAssetRects } from '../../render/pixel';
import { getAssetRegionPalette } from '../../render/region';
import type { PixelRect, RegisteredPixelAsset } from '../../render/types';
import { MOB_ITEM_PAIRS } from '../common';

function verifyAssetPixels(
  asset: RegisteredPixelAsset,
  rects: PixelRect[],
): boolean {
  const total = asset.width * asset.height;
  const fromRuns = new Int32Array(total).fill(0);
  const fromRects = new Int32Array(total).fill(0);

  for (const [offset, length, p] of asset.runs) {
    const color = asset.palette[p];
    if (!color || color[3] === 0) continue;
    for (let i = 0; i < length; i++) {
      const idx = offset + i;
      if (idx >= 0 && idx < total) {
        fromRuns[idx] = p;
      }
    }
  }

  for (const r of rects) {
    const color = asset.palette[r.p];
    if (!color || color[3] === 0) continue;
    for (let dy = 0; dy < r.h; dy++) {
      const rowOffset = (r.y + dy) * asset.width;
      for (let dx = 0; dx < r.w; dx++) {
        const idx = rowOffset + (r.x + dx);
        if (idx >= 0 && idx < total) {
          fromRects[idx] = r.p;
        }
      }
    }
  }

  for (let i = 0; i < total; i++) {
    if (fromRuns[i] !== fromRects[i]) {
      return false;
    }
  }
  return true;
}

function countChangedOpaqueColors(
  asset: RegisteredPixelAsset,
  region: Region,
): { opaqueCount: number; changedCount: number } {
  const mappedPalette = getAssetRegionPalette(asset.id, region) ?? asset.palette;
  let opaqueCount = 0;
  let changedCount = 0;

  for (let i = 0; i < asset.palette.length; i++) {
    const orig = asset.palette[i];
    if (!orig || orig[3] === 0) continue;
    opaqueCount++;

    const next = mappedPalette[i];
    if (
      next &&
      (orig[0] !== next[0] || orig[1] !== next[1] || orig[2] !== next[2])
    ) {
      changedCount++;
    }
  }

  return { opaqueCount, changedCount };
}

export function AssetCatalogSection() {
  const assetRows = useMemo(() => {
    const priorityOrder = [
      'bg-title-adventure-512',
      'bg-field-path-128',
      'bg-distant-hills-128',
      'bg-distant-canyon-128',
      'bg-distant-mountains-128',
      ...MOB_ITEM_PAIRS.flat(),
    ];

    const all = getAllAssets().slice().sort((a, b) => {
      const ia = priorityOrder.indexOf(a.id);
      const ib = priorityOrder.indexOf(b.id);
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1;
      if (ib !== -1) return 1;
      return a.id.localeCompare(b.id);
    });

    return all.map((asset) => {
      const rects = getAssetRects(asset.id);
      const pass = verifyAssetPixels(asset, rects);
      const desertStats = countChangedOpaqueColors(asset, 'desert');
      const coldStats = countChangedOpaqueColors(asset, 'cold');
      return {
        id: asset.id,
        size: asset.size,
        version: asset.version ?? '-',
        runCount: asset.runs.length,
        rectCount: rects.length,
        opaqueCount: desertStats.opaqueCount,
        desertChanged: desertStats.changedCount,
        coldChanged: coldStats.changedCount,
        pass,
      };
    });
  }, []);

  return (
    <section>
      <h2 style={{ fontSize: '18px', marginBottom: '8px' }}>
        에셋 목록 표 ({assetRows.length}종)
      </h2>
      <table
        style={{
          borderCollapse: 'collapse',
          width: '100%',
          maxWidth: '960px',
          fontSize: '14px',
        }}
      >
        <thead>
          <tr style={{ background: '#f1f5f9', textAlign: 'left' }}>
            <th style={{ border: '1px solid #cbd5e1', padding: '8px' }}>
              에셋 id
            </th>
            <th style={{ border: '1px solid #cbd5e1', padding: '8px' }}>
              크기
            </th>
            <th style={{ border: '1px solid #cbd5e1', padding: '8px' }}>
              버전
            </th>
            <th style={{ border: '1px solid #cbd5e1', padding: '8px' }}>
              런 수
            </th>
            <th style={{ border: '1px solid #cbd5e1', padding: '8px' }}>
              사각형 수
            </th>
            <th style={{ border: '1px solid #cbd5e1', padding: '8px' }}>
              불투명 색 수
            </th>
            <th style={{ border: '1px solid #cbd5e1', padding: '8px' }}>
              desert 변경 색 수
            </th>
            <th style={{ border: '1px solid #cbd5e1', padding: '8px' }}>
              cold 변경 색 수
            </th>
            <th style={{ border: '1px solid #cbd5e1', padding: '8px' }}>
              픽셀 일치 검사
            </th>
          </tr>
        </thead>
        <tbody>
          {assetRows.map((row) => (
            <tr key={row.id}>
              <td style={{ border: '1px solid #cbd5e1', padding: '8px' }}>
                <code>{row.id}</code>
              </td>
              <td style={{ border: '1px solid #cbd5e1', padding: '8px' }}>
                {row.size}
              </td>
              <td style={{ border: '1px solid #cbd5e1', padding: '8px' }}>
                {row.version}
              </td>
              <td style={{ border: '1px solid #cbd5e1', padding: '8px' }}>
                {row.runCount.toLocaleString()}
              </td>
              <td style={{ border: '1px solid #cbd5e1', padding: '8px' }}>
                {row.rectCount.toLocaleString()}
              </td>
              <td style={{ border: '1px solid #cbd5e1', padding: '8px' }}>
                {row.opaqueCount}
              </td>
              <td style={{ border: '1px solid #cbd5e1', padding: '8px' }}>
                {row.desertChanged}
              </td>
              <td style={{ border: '1px solid #cbd5e1', padding: '8px' }}>
                {row.coldChanged}
              </td>
              <td
                style={{
                  border: '1px solid #cbd5e1',
                  padding: '8px',
                  fontWeight: 'bold',
                  color: row.pass ? '#16a34a' : '#dc2626',
                }}
              >
                {row.pass ? 'PASS' : 'FAIL'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
