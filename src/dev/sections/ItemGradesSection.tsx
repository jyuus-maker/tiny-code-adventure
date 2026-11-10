import { useMemo } from 'react';
import { DEFAULT_SCALE, NIGHT_CSS_FILTER, type Region } from '../../config';
import { getAsset } from '../../render/assets';
import { getItemSparklePoints } from '../../render/itemGrade';
import { CRACK_EFFECT_ID, ItemSprite } from '../../render/ItemSprite';
import { getAssetRects } from '../../render/pixel';
import type { ItemGrade } from '../../render/types';
import { MOB_ITEM_PAIRS } from '../common';

const ITEM_GRADES: readonly ItemGrade[] = [
  'shining',
  'normal',
  'broken',
] as const;

function countCrackOverlapPixels(itemId: string): number {
  const itemAsset = getAsset(itemId);
  const crackAsset = getAsset(CRACK_EFFECT_ID);
  if (!itemAsset || !crackAsset) {
    return 0;
  }

  const itemWidth = itemAsset.width;
  const itemHeight = itemAsset.height;
  const itemOpaque = new Uint8Array(itemWidth * itemHeight);

  for (const r of getAssetRects(itemId)) {
    const color = itemAsset.palette[r.p];
    if (!color || color[3] === 0) continue;
    for (let dy = 0; dy < r.h; dy++) {
      const iy = r.y + dy;
      if (iy < 0 || iy >= itemHeight) continue;
      const rowOffset = iy * itemWidth;
      for (let dx = 0; dx < r.w; dx++) {
        const ix = r.x + dx;
        if (ix >= 0 && ix < itemWidth) {
          itemOpaque[rowOffset + ix] = 1;
        }
      }
    }
  }

  const offsetX = Math.floor((itemWidth - crackAsset.width) / 2);
  const offsetY = Math.floor((itemHeight - crackAsset.height) / 2);
  let overlap = 0;

  for (const r of getAssetRects(CRACK_EFFECT_ID)) {
    const color = crackAsset.palette[r.p];
    if (!color || color[3] === 0) continue;
    for (let dy = 0; dy < r.h; dy++) {
      const iy = r.y + dy + offsetY;
      if (iy < 0 || iy >= itemHeight) continue;
      const rowOffset = iy * itemWidth;
      for (let dx = 0; dx < r.w; dx++) {
        const ix = r.x + dx + offsetX;
        if (ix >= 0 && ix < itemWidth && itemOpaque[rowOffset + ix] === 1) {
          overlap++;
        }
      }
    }
  }

  return overlap;
}

type Props = {
  region: Region;
  isNight: boolean;
};

export function ItemGradesSection({ region, isNight }: Props) {
  const itemGradeRows = useMemo(() => {
    return MOB_ITEM_PAIRS.map(([, itemId]) => ({
      itemId,
      crackPixels: countCrackOverlapPixels(itemId),
      sparklePoints: getItemSparklePoints(itemId),
    }));
  }, []);

  return (
    <section style={{ marginBottom: '32px' }}>
      <h2 style={{ fontSize: '18px', marginBottom: '8px' }}>
        아이템 등급 ({region} / {isNight ? '밤' : '낮'})
      </h2>
      <div
        style={{
          display: 'inline-flex',
          flexDirection: 'column',
          gap: '12px',
          padding: '16px',
          background: '#1e293b',
          borderRadius: '8px',
          filter: isNight ? NIGHT_CSS_FILTER : undefined,
        }}
      >
        {itemGradeRows.map(({ itemId, crackPixels, sparklePoints }) => (
          <div
            key={itemId}
            style={{
              display: 'flex',
              gap: '24px',
              alignItems: 'center',
              borderBottom: '1px solid #334155',
              paddingBottom: '8px',
            }}
          >
            <code
              style={{
                color: '#f8fafc',
                background: 'transparent',
                minWidth: '210px',
              }}
            >
              {itemId}
            </code>
            {ITEM_GRADES.map((grade) => (
              <div
                key={grade}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <ItemSprite
                  id={itemId}
                  grade={grade}
                  region={region}
                  scale={DEFAULT_SCALE}
                />
                <span style={{ color: '#cbd5e1', fontSize: '12px' }}>
                  {grade}
                </span>
              </div>
            ))}
            <div
              style={{
                color: '#f8fafc',
                fontSize: '13px',
                minWidth: '240px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}
            >
              <div>
                반짝임 점 3개:{' '}
                <strong>
                  {sparklePoints
                    .map((pt) => `(${pt.x}, ${pt.y})`)
                    .join(', ')}
                </strong>
              </div>
              <div>
                크랙 표시 픽셀 수: <strong>{crackPixels}</strong>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
