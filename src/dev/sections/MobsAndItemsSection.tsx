import { DEFAULT_SCALE, NIGHT_CSS_FILTER, type Region } from '../../config';
import { PixelSprite } from '../../render/PixelSprite';
import { getAssetRegionPalette } from '../../render/region';
import { MOB_ITEM_PAIRS } from '../common';

type Props = {
  region: Region;
  isNight: boolean;
};

export function MobsAndItemsSection({ region, isNight }: Props) {
  return (
    <section style={{ marginBottom: '32px' }}>
      <h2 style={{ fontSize: '18px', marginBottom: '8px' }}>
        몹 · 전용템 ({region} / {isNight ? '밤' : '낮'})
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
        {MOB_ITEM_PAIRS.map(([mobId, itemId]) => (
          <div
            key={mobId}
            style={{
              display: 'flex',
              gap: '24px',
              alignItems: 'center',
              borderBottom: '1px solid #334155',
              paddingBottom: '8px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                minWidth: '280px',
              }}
            >
              <PixelSprite
                id={mobId}
                palette={getAssetRegionPalette(mobId, region)}
                scale={DEFAULT_SCALE}
              />
              <code style={{ color: '#f8fafc', background: 'transparent' }}>
                {mobId}
              </code>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                minWidth: '260px',
              }}
            >
              <PixelSprite
                id={itemId}
                palette={getAssetRegionPalette(itemId, region)}
                scale={DEFAULT_SCALE}
              />
              <code style={{ color: '#f8fafc', background: 'transparent' }}>
                {itemId}
              </code>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
