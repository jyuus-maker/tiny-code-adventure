import { getAsset } from './assets';
import { getAssetRects, rgbaToCss } from './pixel';

export type PixelRectsGroupProps = {
  id: string;
  palette?: number[][];
};

export function PixelRectsGroup({ id, palette }: PixelRectsGroupProps) {
  const asset = getAsset(id);
  if (!asset) {
    return null;
  }

  const rects = getAssetRects(id);
  const activePalette = palette ?? asset.palette;

  return (
    <g>
      {rects.map((rect, idx) => {
        const color = activePalette[rect.p];
        if (!color || color[3] === 0) return null;
        return (
          <rect
            key={idx}
            x={rect.x}
            y={rect.y}
            width={rect.w}
            height={rect.h}
            fill={rgbaToCss(color)}
          />
        );
      })}
    </g>
  );
}

export type PixelSpriteProps = {
  id: string;
  palette?: number[][];
  scale?: number;
  flip?: boolean;
  width?: number | string;
  height?: number | string;
  preserveAspectRatio?: string;
};


export function PixelSprite({
  id,
  palette,
  scale = 1,
  flip = false,
  width,
  height,
  preserveAspectRatio,
}: PixelSpriteProps) {
  const asset = getAsset(id);
  if (!asset) {
    return null;
  }

  const rects = getAssetRects(id);
  const activePalette = palette ?? asset.palette;
  const displayWidth = width ?? asset.width * scale;
  const displayHeight = height ?? asset.height * scale;

  return (
    <svg
      width={displayWidth}
      height={displayHeight}
      viewBox={`0 0 ${asset.width} ${asset.height}`}
      preserveAspectRatio={preserveAspectRatio}
      shapeRendering="crispEdges"
      style={{
        display: 'block',
        transform: flip ? 'scaleX(-1)' : undefined,
      }}
    >
      {rects.map((rect, idx) => {
        const color = activePalette[rect.p];
        if (!color || color[3] === 0) return null;
        return (
          <rect
            key={idx}
            x={rect.x}
            y={rect.y}
            width={rect.w}
            height={rect.h}
            fill={rgbaToCss(color)}
          />
        );
      })}
    </svg>
  );
}

