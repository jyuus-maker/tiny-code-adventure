import { DEFAULT_SCALE, NIGHT_CSS_FILTER, type Region } from '../../config';
import { PixelSprite } from '../../render/PixelSprite';
import { getAssetRegionPalette, getDistantBgId } from '../../render/region';

type Props = {
  region: Region;
  isNight: boolean;
};

export function DistantAndPathSection({ region, isNight }: Props) {
  const distantBgId = getDistantBgId(region);
  const pathPalette = getAssetRegionPalette('bg-field-path-128', region);

  return (
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
  );
}
