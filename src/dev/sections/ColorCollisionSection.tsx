import { useMemo } from 'react';
import { getAllAssets } from '../../render/assets';
import {
  REGION_COLOR_MAP,
  isRegionPaletteTarget,
  rgbToHex,
} from '../../render/region';

export function ColorCollisionSection() {
  const collisionRows = useMemo(() => {
    const mappedSourceKeys = new Set<string>([
      ...Object.keys(REGION_COLOR_MAP.desert),
      ...Object.keys(REGION_COLOR_MAP.cold),
    ]);

    const rows: { id: string; colors: string[] }[] = [];
    const all = getAllAssets()
      .slice()
      .sort((a, b) => a.id.localeCompare(b.id));

    for (const asset of all) {
      if (isRegionPaletteTarget(asset.id)) continue;
      const matched: string[] = [];
      for (const rgba of asset.palette) {
        if (!rgba || rgba[3] === 0) continue;
        const hex = rgbToHex(rgba[0], rgba[1], rgba[2]);
        if (mappedSourceKeys.has(hex) && !matched.includes(hex)) {
          matched.push(hex);
        }
      }
      if (matched.length > 0) {
        rows.push({ id: asset.id, colors: matched });
      }
    }

    return rows;
  }, []);

  return (
    <section style={{ marginBottom: '32px' }}>
      <h2 style={{ fontSize: '18px', marginBottom: '8px' }}>
        비대상 에셋 색 매핑 충돌 점검 (적용 제외 에셋 중 매핑 표 원본 색 포함 목록)
      </h2>
      {collisionRows.length === 0 ? (
        <p style={{ fontSize: '14px' }}>
          충돌 없음 (적용 제외 에셋 중 매핑 표의 원본 색값을 포함하는 에셋이 없습니다)
        </p>
      ) : (
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
              <th style={{ border: '1px solid #cbd5e1', padding: '8px' }}>
                에셋 id
              </th>
              <th style={{ border: '1px solid #cbd5e1', padding: '8px' }}>
                포함된 매핑 원본 색값
              </th>
            </tr>
          </thead>
          <tbody>
            {collisionRows.map((row) => (
              <tr key={row.id}>
                <td style={{ border: '1px solid #cbd5e1', padding: '8px' }}>
                  <code>{row.id}</code>
                </td>
                <td style={{ border: '1px solid #cbd5e1', padding: '8px' }}>
                  {row.colors.join(', ')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
