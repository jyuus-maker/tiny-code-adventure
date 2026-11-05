import { useMemo, useState } from 'react';
import {
  DEFAULT_SCALE,
  NIGHT_CSS_FILTER,
  REGIONS,
  REGION_TO_LANGUAGE,
  type Region,
} from '../config';
import { getAllAssets, getAsset } from '../render/assets';
import { getAssetRects } from '../render/pixel';
import { PixelSprite } from '../render/PixelSprite';
import { buildRegionPalette, getDistantBgId } from '../render/region';
import type { PixelRect, RegisteredPixelAsset } from '../render/types';

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

export function RenderCheck() {
  const [region, setRegion] = useState<Region>('warm');
  const [isNight, setIsNight] = useState(false);

  const pathAsset = getAsset('bg-field-path-128');
  const pathPalette = useMemo(() => {
    if (!pathAsset) return undefined;
    return buildRegionPalette(pathAsset.palette, region);
  }, [pathAsset, region]);

  const distantBgId = getDistantBgId(region);

  const assetRows = useMemo(() => {
    const order = [
      'bg-title-adventure-512',
      'bg-field-path-128',
      'bg-distant-hills-128',
      'bg-distant-canyon-128',
      'bg-distant-mountains-128',
    ];
    const all = getAllAssets().slice().sort((a, b) => {
      const ia = order.indexOf(a.id);
      const ib = order.indexOf(b.id);
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1;
      if (ib !== -1) return 1;
      return a.id.localeCompare(b.id);
    });

    return all.map((asset) => {
      const rects = getAssetRects(asset.id);
      const pass = verifyAssetPixels(asset, rects);
      return {
        id: asset.id,
        size: asset.size,
        version: asset.version ?? '-',
        runCount: asset.runs.length,
        rectCount: rects.length,
        pass,
      };
    });
  }, []);

  return (
    <div style={{ padding: '24px', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: '24px', marginBottom: '16px' }}>
        픽셀 렌더러 & 지역 메서드 검증 (RenderCheck)
      </h1>

      <div
        style={{
          display: 'flex',
          gap: '16px',
          alignItems: 'center',
          marginBottom: '20px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <strong>지역:</strong>
          {REGIONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRegion(r)}
              style={{
                padding: '6px 12px',
                cursor: 'pointer',
                fontWeight: region === r ? 'bold' : 'normal',
                background: region === r ? '#2563eb' : '#e5e7eb',
                color: region === r ? '#ffffff' : '#111827',
                border: '1px solid #9ca3af',
                borderRadius: '4px',
              }}
            >
              {r} ({REGION_TO_LANGUAGE[r]})
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <strong>시간대:</strong>
          <button
            type="button"
            onClick={() => setIsNight(false)}
            style={{
              padding: '6px 12px',
              cursor: 'pointer',
              fontWeight: !isNight ? 'bold' : 'normal',
              background: !isNight ? '#2563eb' : '#e5e7eb',
              color: !isNight ? '#ffffff' : '#111827',
              border: '1px solid #9ca3af',
              borderRadius: '4px',
            }}
          >
            낮
          </button>
          <button
            type="button"
            onClick={() => setIsNight(true)}
            style={{
              padding: '6px 12px',
              cursor: 'pointer',
              fontWeight: isNight ? 'bold' : 'normal',
              background: isNight ? '#2563eb' : '#e5e7eb',
              color: isNight ? '#ffffff' : '#111827',
              border: '1px solid #9ca3af',
              borderRadius: '4px',
            }}
          >
            밤
          </button>
        </div>
      </div>

      <section style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '18px', marginBottom: '8px' }}>
          지역 원경 & 길 나란히 보기 ({region} / {isNight ? '밤' : '낮'})
        </h2>
        <div
          style={{
            display: 'inline-flex',
            gap: '24px',
            padding: '16px',
            background: '#1e293b',
            borderRadius: '8px',
            filter: isNight ? NIGHT_CSS_FILTER : undefined,
          }}
        >
          <div>
            <div
              style={{
                color: '#f8fafc',
                fontSize: '13px',
                marginBottom: '6px',
              }}
            >
              원경: {distantBgId}
            </div>
            <PixelSprite id={distantBgId} scale={DEFAULT_SCALE} />
          </div>
          <div>
            <div
              style={{
                color: '#f8fafc',
                fontSize: '13px',
                marginBottom: '6px',
              }}
            >
              길: bg-field-path-128 ({region} 팔레트)
            </div>
            <PixelSprite
              id="bg-field-path-128"
              palette={pathPalette}
              scale={DEFAULT_SCALE}
            />
          </div>
        </div>
      </section>

      <section style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '18px', marginBottom: '8px' }}>
          타이틀 배경 (원본, 지역·낮밤 무관)
        </h2>
        <div
          style={{
            display: 'inline-block',
            padding: '16px',
            background: '#1e293b',
            borderRadius: '8px',
          }}
        >
          <PixelSprite id="bg-title-adventure-512" scale={1} />
        </div>
      </section>

      <section>
        <h2 style={{ fontSize: '18px', marginBottom: '8px' }}>에셋 목록 표</h2>
        <table
          style={{
            borderCollapse: 'collapse',
            width: '100%',
            maxWidth: '720px',
            fontSize: '14px',
          }}
        >
          <thead>
            <tr style={{ background: '#f1f5f9', textAlign: 'left' }}>
              <th style={{ border: '1px solid #cbd5e1', padding: '8px' }}>id</th>
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
    </div>
  );
}

