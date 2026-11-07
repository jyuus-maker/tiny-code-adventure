import { useId } from 'react';
import {
  SHINING_SPARKLE_PERIOD_MS,
  SHINING_SPARKLE_SIZE_RATIOS,
  type Region,
} from '../config';
import { getAsset } from './assets';
import { buildBrokenItemPalette, getItemSparklePoints } from './itemGrade';
import './ItemSprite.css';
import { getAssetRects } from './pixel';
import { PixelRectsGroup } from './PixelSprite';
import { getAssetRegionPalette } from './region';
import type { ItemGrade } from './types';

export const SHINING_EFFECT_ID = 'eff-loot-burst-64';
export const CRACK_EFFECT_ID = 'eff-crack-64';

export type ItemSpriteProps = {
  id: string;
  grade: ItemGrade;
  region: Region;
  scale: number;
};

function renderEffectCentered(
  effectId: string,
  itemId: string,
  itemWidth: number,
  itemHeight: number,
) {
  const effectAsset = getAsset(effectId);
  if (!effectAsset) {
    return null;
  }

  if (effectAsset.width !== itemWidth || effectAsset.height !== itemHeight) {
    console.warn(
      `[ItemSprite] 이펙트(${effectId}: ${effectAsset.width}x${effectAsset.height})와 아이템(${itemId}: ${itemWidth}x${itemHeight})의 크기가 다릅니다.`,
    );
    const offsetX = (itemWidth - effectAsset.width) / 2;
    const offsetY = (itemHeight - effectAsset.height) / 2;
    return (
      <g transform={`translate(${offsetX}, ${offsetY})`}>
        <PixelRectsGroup id={effectId} />
      </g>
    );
  }

  return <PixelRectsGroup id={effectId} />;
}

export function ItemSprite({ id, grade, region, scale }: ItemSpriteProps) {
  const rawClipId = useId();
  const clipPathId = `item-clip-${rawClipId.replace(/[^a-zA-Z0-9_-]/g, '')}`;

  const itemAsset = getAsset(id);
  if (!itemAsset) {
    return null;
  }

  const regionPalette = getAssetRegionPalette(id, region) ?? itemAsset.palette;
  const itemPalette =
    grade === 'broken' ? buildBrokenItemPalette(regionPalette) : regionPalette;

  const displayWidth = itemAsset.width * scale;
  const displayHeight = itemAsset.height * scale;
  const itemRects = grade === 'broken' ? getAssetRects(id) : [];
  const sparklePoints = grade === 'shining' ? getItemSparklePoints(id) : [];
  const sparkleAsset =
    grade === 'shining' ? getAsset(SHINING_EFFECT_ID) : undefined;

  return (
    <svg
      width={displayWidth}
      height={displayHeight}
      viewBox={`0 0 ${itemAsset.width} ${itemAsset.height}`}
      shapeRendering="crispEdges"
      style={{ display: 'block', overflow: 'visible' }}
    >
      <PixelRectsGroup id={id} palette={itemPalette} />

      {grade === 'shining' &&
        sparkleAsset &&
        sparklePoints.map((pt, idx) => {
          const ratio =
            SHINING_SPARKLE_SIZE_RATIOS[idx] ??
            SHINING_SPARKLE_SIZE_RATIOS[SHINING_SPARKLE_SIZE_RATIOS.length - 1];
          const targetW = itemAsset.width * ratio;
          const targetH = itemAsset.height * ratio;
          const scaleX = targetW / sparkleAsset.width;
          const scaleY = targetH / sparkleAsset.height;
          const tx = pt.x - targetW / 2;
          const ty = pt.y - targetH / 2;
          const delayMs = (SHINING_SPARKLE_PERIOD_MS * idx) / 3;

          return (
            <g
              key={idx}
              transform={`translate(${tx}, ${ty}) scale(${scaleX}, ${scaleY})`}
            >
              <g
                className="item-sparkle-twinkle"
                style={{
                  animationDuration: `${SHINING_SPARKLE_PERIOD_MS}ms`,
                  animationDelay: `${delayMs}ms`,
                }}
              >
                <PixelRectsGroup id={SHINING_EFFECT_ID} />
              </g>
            </g>
          );
        })}

      {grade === 'broken' && (
        <>
          <defs>
            <clipPath id={clipPathId}>
              {itemRects.map((rect, idx) => (
                <rect
                  key={idx}
                  x={rect.x}
                  y={rect.y}
                  width={rect.w}
                  height={rect.h}
                />
              ))}
            </clipPath>
          </defs>
          <g clipPath={`url(#${clipPathId})`}>
            {renderEffectCentered(
              CRACK_EFFECT_ID,
              id,
              itemAsset.width,
              itemAsset.height,
            )}
          </g>
        </>
      )}
    </svg>
  );
}
