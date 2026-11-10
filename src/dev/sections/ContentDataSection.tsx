import { useMemo } from 'react';
import { NIGHT_CSS_FILTER, type Region } from '../../config';
import { CLIENTS } from '../../data/clients';
import { EVENTS } from '../../data/events';
import { getItemEffect } from '../../data/itemEffect';
import { ITEMS } from '../../data/items';
import { MISSIONS } from '../../data/missions';
import { MOBS } from '../../data/mobs';
import type { ItemEffect } from '../../data/types';
import { validateContentData } from '../../data/validate';
import { PixelSprite } from '../../render/PixelSprite';
import { getAssetRegionPalette } from '../../render/region';

function formatItemEffect(effect: ItemEffect): string {
  if (effect.kind === 'score') {
    return 'score (점수 획득)';
  }
  if (effect.kind === 'permanent') {
    return `${effect.stat} 영구 상승`;
  }
  return `${effect.stat} 임시 버프 (다음 ${effect.battles}전투)`;
}

type Props = {
  region: Region;
  isNight: boolean;
};

export function ContentDataSection({ region, isNight }: Props) {
  const mobMap = useMemo(() => new Map(MOBS.map((m) => [m.id, m])), []);
  const itemMap = useMemo(() => new Map(ITEMS.map((i) => [i.id, i])), []);
  const clientMap = useMemo(
    () => new Map(CLIENTS.map((c) => [c.id, c])),
    [],
  );
  const validationResults = useMemo(() => validateContentData(), []);

  return (
    <section style={{ marginBottom: '32px' }}>
      <h2 style={{ fontSize: '20px', marginBottom: '12px' }}>
        콘텐츠 데이터 (src/data)
      </h2>

      <h3 style={{ fontSize: '16px', marginBottom: '8px' }}>
        1) 연결 검사 결과 ({validationResults.length}항목)
      </h3>
      <table
        style={{
          borderCollapse: 'collapse',
          width: '100%',
          maxWidth: '960px',
          fontSize: '14px',
          marginBottom: '24px',
        }}
      >
        <thead>
          <tr style={{ background: '#f1f5f9', textAlign: 'left' }}>
            <th style={{ border: '1px solid #cbd5e1', padding: '8px' }}>
              검사 항목
            </th>
            <th style={{ border: '1px solid #cbd5e1', padding: '8px' }}>
              상세
            </th>
            <th style={{ border: '1px solid #cbd5e1', padding: '8px' }}>
              결과
            </th>
          </tr>
        </thead>
        <tbody>
          {validationResults.map((v) => (
            <tr key={v.id}>
              <td style={{ border: '1px solid #cbd5e1', padding: '8px' }}>
                {v.label}
              </td>
              <td style={{ border: '1px solid #cbd5e1', padding: '8px' }}>
                {v.detail}
              </td>
              <td
                style={{
                  border: '1px solid #cbd5e1',
                  padding: '8px',
                  fontWeight: 'bold',
                  color: v.pass ? '#16a34a' : '#dc2626',
                }}
              >
                {v.pass ? 'PASS' : 'FAIL'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3 style={{ fontSize: '16px', marginBottom: '8px' }}>
        2) 몹 목록 ({MOBS.length}종 — 선택 지역: {region} /{' '}
        {isNight ? '밤' : '낮'})
      </h3>
      <table
        style={{
          borderCollapse: 'collapse',
          width: '100%',
          maxWidth: '960px',
          fontSize: '14px',
          marginBottom: '24px',
        }}
      >
        <thead>
          <tr style={{ background: '#f1f5f9', textAlign: 'left' }}>
            <th style={{ border: '1px solid #cbd5e1', padding: '8px' }}>
              그림 ({region})
            </th>
            <th style={{ border: '1px solid #cbd5e1', padding: '8px' }}>
              기본 이름 (id)
            </th>
            <th style={{ border: '1px solid #cbd5e1', padding: '8px' }}>
              시간대
            </th>
            <th style={{ border: '1px solid #cbd5e1', padding: '8px' }}>
              타입
            </th>
            <th style={{ border: '1px solid #cbd5e1', padding: '8px' }}>
              전용템 그림 ({region})
            </th>
            <th style={{ border: '1px solid #cbd5e1', padding: '8px' }}>
              전용템 보상
            </th>
          </tr>
        </thead>
        <tbody>
          {MOBS.map((mob) => {
            const exItem = itemMap.get(mob.exclusiveItemId);
            return (
              <tr key={mob.id}>
                <td
                  style={{
                    border: '1px solid #cbd5e1',
                    padding: '8px',
                    background: '#1e293b',
                    filter: isNight ? NIGHT_CSS_FILTER : undefined,
                  }}
                >
                  <PixelSprite
                    id={mob.assetId}
                    palette={getAssetRegionPalette(mob.assetId, region)}
                    scale={1}
                  />
                </td>
                <td style={{ border: '1px solid #cbd5e1', padding: '8px' }}>
                  <strong>{mob.name}</strong> (<code>{mob.id}</code>)
                </td>
                <td style={{ border: '1px solid #cbd5e1', padding: '8px' }}>
                  <code>{mob.time}</code>
                </td>
                <td style={{ border: '1px solid #cbd5e1', padding: '8px' }}>
                  <code>{mob.type}</code>
                </td>
                <td
                  style={{
                    border: '1px solid #cbd5e1',
                    padding: '8px',
                    background: '#1e293b',
                    filter: isNight ? NIGHT_CSS_FILTER : undefined,
                  }}
                >
                  {exItem && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        color: '#f8fafc',
                      }}
                    >
                      <PixelSprite
                        id={exItem.assetId}
                        palette={getAssetRegionPalette(
                          exItem.assetId,
                          region,
                        )}
                        scale={1}
                      />
                      <code>{exItem.id}</code>
                    </div>
                  )}
                </td>
                <td style={{ border: '1px solid #cbd5e1', padding: '8px' }}>
                  {exItem ? (
                    formatItemEffect(getItemEffect(exItem, 'shining'))
                  ) : (
                    '(연결 실패)'
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <h3 style={{ fontSize: '16px', marginBottom: '8px' }}>
        3) 아이템 목록 및 등급별 효과 ({ITEMS.length}종)
      </h3>
      <table
        style={{
          borderCollapse: 'collapse',
          width: '100%',
          maxWidth: '960px',
          fontSize: '14px',
          marginBottom: '24px',
        }}
      >
        <thead>
          <tr style={{ background: '#f1f5f9', textAlign: 'left' }}>
            <th style={{ border: '1px solid #cbd5e1', padding: '8px' }}>
              미션 장면 그림
            </th>
            <th style={{ border: '1px solid #cbd5e1', padding: '8px' }}>
              아이템 (id)
            </th>
            <th style={{ border: '1px solid #cbd5e1', padding: '8px' }}>
              원천 몹
            </th>
            <th style={{ border: '1px solid #cbd5e1', padding: '8px' }}>
              shining 효과
            </th>
            <th style={{ border: '1px solid #cbd5e1', padding: '8px' }}>
              normal 효과
            </th>
            <th style={{ border: '1px solid #cbd5e1', padding: '8px' }}>
              broken 효과
            </th>
          </tr>
        </thead>
        <tbody>
          {ITEMS.map((item) => {
            const sourceMob = mobMap.get(item.sourceMobId);
            return (
              <tr key={item.id}>
                <td
                  style={{
                    border: '1px solid #cbd5e1',
                    padding: '8px',
                    background: '#1e293b',
                  }}
                >
                  <PixelSprite id={item.missionSceneAssetId} scale={1} />
                </td>
                <td style={{ border: '1px solid #cbd5e1', padding: '8px' }}>
                  <strong>{item.name}</strong> (<code>{item.id}</code>)
                </td>
                <td style={{ border: '1px solid #cbd5e1', padding: '8px' }}>
                  {sourceMob?.name ?? '-'} (<code>{item.sourceMobId}</code>)
                </td>
                <td style={{ border: '1px solid #cbd5e1', padding: '8px' }}>
                  {formatItemEffect(getItemEffect(item, 'shining'))}
                </td>
                <td style={{ border: '1px solid #cbd5e1', padding: '8px' }}>
                  {formatItemEffect(getItemEffect(item, 'normal'))}
                </td>
                <td style={{ border: '1px solid #cbd5e1', padding: '8px' }}>
                  {formatItemEffect(getItemEffect(item, 'broken'))}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <h3 style={{ fontSize: '16px', marginBottom: '8px' }}>
        4) 이벤트 목록 ({EVENTS.length}종)
      </h3>
      <table
        style={{
          borderCollapse: 'collapse',
          width: '100%',
          maxWidth: '960px',
          fontSize: '14px',
          marginBottom: '24px',
        }}
      >
        <thead>
          <tr style={{ background: '#f1f5f9', textAlign: 'left' }}>
            <th style={{ border: '1px solid #cbd5e1', padding: '8px' }}>
              장면 그림
            </th>
            <th style={{ border: '1px solid #cbd5e1', padding: '8px' }}>
              아이콘 그림
            </th>
            <th style={{ border: '1px solid #cbd5e1', padding: '8px' }}>
              이름 (id)
            </th>
            <th style={{ border: '1px solid #cbd5e1', padding: '8px' }}>
              passable
            </th>
            <th style={{ border: '1px solid #cbd5e1', padding: '8px' }}>
              branch
            </th>
          </tr>
        </thead>
        <tbody>
          {EVENTS.map((ev) => (
            <tr key={ev.id}>
              <td
                style={{
                  border: '1px solid #cbd5e1',
                  padding: '8px',
                  background: '#1e293b',
                }}
              >
                <PixelSprite id={ev.sceneAssetId} scale={1} />
              </td>
              <td
                style={{
                  border: '1px solid #cbd5e1',
                  padding: '8px',
                  background: '#1e293b',
                }}
              >
                {ev.iconAssetIds && ev.iconAssetIds.length > 0 ? (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {ev.iconAssetIds.map((iconId) => (
                      <PixelSprite key={iconId} id={iconId} scale={1} />
                    ))}
                  </div>
                ) : (
                  '(없음)'
                )}
              </td>
              <td style={{ border: '1px solid #cbd5e1', padding: '8px' }}>
                <strong>{ev.name}</strong> (<code>{ev.id}</code>)
              </td>
              <td style={{ border: '1px solid #cbd5e1', padding: '8px' }}>
                <code>{String(ev.passable)}</code>
              </td>
              <td style={{ border: '1px solid #cbd5e1', padding: '8px' }}>
                <code>{String(ev.branch)}</code>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3 style={{ fontSize: '16px', marginBottom: '8px' }}>
        5) 미션 목록 ({MISSIONS.length}종 — 의뢰자 {CLIENTS.length}명)
      </h3>
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
              의뢰 장면 그림
            </th>
            <th style={{ border: '1px solid #cbd5e1', padding: '8px' }}>
              의뢰자
            </th>
            <th style={{ border: '1px solid #cbd5e1', padding: '8px' }}>
              종류
            </th>
            <th style={{ border: '1px solid #cbd5e1', padding: '8px' }}>
              난이도
            </th>
            <th style={{ border: '1px solid #cbd5e1', padding: '8px' }}>
              대상 (몹 또는 아이템)
            </th>
            <th style={{ border: '1px solid #cbd5e1', padding: '8px' }}>
              개수
            </th>
            <th style={{ border: '1px solid #cbd5e1', padding: '8px' }}>
              의뢰 대사
            </th>
          </tr>
        </thead>
        <tbody>
          {MISSIONS.map((mission) => {
            const client = clientMap.get(mission.clientId);
            const targetMob = mission.targetMobId
              ? mobMap.get(mission.targetMobId)
              : undefined;
            const targetItem = mission.targetItemId
              ? itemMap.get(mission.targetItemId)
              : undefined;
            return (
              <tr key={mission.id}>
                <td
                  style={{
                    border: '1px solid #cbd5e1',
                    padding: '8px',
                    background: '#1e293b',
                  }}
                >
                  {client && (
                    <PixelSprite id={client.sceneAssetId} scale={1} />
                  )}
                </td>
                <td
                  style={{
                    border: '1px solid #cbd5e1',
                    padding: '8px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <strong>{client?.name ?? '-'}</strong> (
                  <code>{mission.clientId}</code>)
                </td>
                <td style={{ border: '1px solid #cbd5e1', padding: '8px' }}>
                  <code>{mission.kind}</code>
                </td>
                <td style={{ border: '1px solid #cbd5e1', padding: '8px' }}>
                  <code>{mission.difficulty}</code>
                </td>
                <td
                  style={{
                    border: '1px solid #cbd5e1',
                    padding: '8px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {mission.kind === 'battle' ? (
                    <span>
                      몹: <strong>{targetMob?.name ?? '-'}</strong> (
                      <code>{mission.targetMobId}</code>)
                    </span>
                  ) : (
                    <span>
                      아이템: <strong>{targetItem?.name ?? '-'}</strong> (
                      <code>{mission.targetItemId}</code>)
                    </span>
                  )}
                </td>
                <td
                  style={{
                    border: '1px solid #cbd5e1',
                    padding: '8px',
                    textAlign: 'center',
                  }}
                >
                  <strong>{mission.count}</strong>
                </td>
                <td style={{ border: '1px solid #cbd5e1', padding: '8px' }}>
                  {mission.dialogue}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
