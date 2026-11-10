import { useState } from 'react';
import { REGIONS, type Region } from '../config';
import { AltarSection } from './sections/AltarSection';
import { AssetCatalogSection } from './sections/AssetCatalogSection';
import { CodeRendererSection } from './sections/CodeRendererSection';
import { ColorCollisionSection } from './sections/ColorCollisionSection';
import { ContentDataSection } from './sections/ContentDataSection';
import { DistantAndPathSection } from './sections/DistantAndPathSection';
import { ItemGradesSection } from './sections/ItemGradesSection';
import { MobsAndItemsSection } from './sections/MobsAndItemsSection';
import { StatRollSection } from './sections/StatRollSection';
import { TitleBgSection } from './sections/TitleBgSection';

type TabId =
  | 'distant-path'
  | 'mobs-items'
  | 'item-grades'
  | 'title-bg'
  | 'code-render'
  | 'altar'
  | 'content-data'
  | 'color-collision'
  | 'asset-catalog'
  | 'stat-roll';

interface TabItem {
  id: TabId;
  label: string;
}

const TABS: readonly TabItem[] = [
  { id: 'distant-path', label: '지역 원경 & 길' },
  { id: 'mobs-items', label: '몹 · 전용템' },
  { id: 'item-grades', label: '아이템 등급' },
  { id: 'title-bg', label: '타이틀 배경' },
  { id: 'code-render', label: '코드 렌더러' },
  { id: 'altar', label: '고대 제단' },
  { id: 'content-data', label: '콘텐츠 데이터' },
  { id: 'color-collision', label: '색 매핑 충돌 점검' },
  { id: 'asset-catalog', label: '에셋 목록 표' },
  { id: 'stat-roll', label: '스탯 굴림' },
] as const;

export function RenderCheck() {
  const [region, setRegion] = useState<Region>('warm');
  const [isNight, setIsNight] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('distant-path');

  return (
    <div style={{ padding: '24px', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: '24px', marginBottom: '16px' }}>
        픽셀 렌더러 & 지역 메서드 검증 (RenderCheck)
      </h1>

      {/* 공용 컨트롤 (지역 선택, 낮밤) */}
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
              {r}
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

      {/* 탭 버튼 줄 */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '2px solid #cbd5e1',
          marginBottom: '24px',
          flexWrap: 'wrap',
        }}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '10px 16px',
                cursor: 'pointer',
                fontWeight: isActive ? 'bold' : 'normal',
                background: isActive ? '#f8fafc' : 'transparent',
                color: isActive ? '#2563eb' : '#475569',
                border: 'none',
                borderBottom: isActive ? '3px solid #2563eb' : '3px solid transparent',
                borderRadius: '6px 6px 0 0',
                fontSize: '14px',
                marginBottom: '-2px',
                transition: 'all 0.15s ease',
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 탭 본문 (선택한 탭의 구역 하나만 렌더링) */}
      <div>
        {activeTab === 'distant-path' && (
          <DistantAndPathSection region={region} isNight={isNight} />
        )}
        {activeTab === 'mobs-items' && (
          <MobsAndItemsSection region={region} isNight={isNight} />
        )}
        {activeTab === 'item-grades' && (
          <ItemGradesSection region={region} isNight={isNight} />
        )}
        {activeTab === 'title-bg' && <TitleBgSection />}
        {activeTab === 'code-render' && (
          <CodeRendererSection region={region} />
        )}
        {activeTab === 'altar' && <AltarSection region={region} />}
        {activeTab === 'content-data' && (
          <ContentDataSection region={region} isNight={isNight} />
        )}
        {activeTab === 'color-collision' && <ColorCollisionSection />}
        {activeTab === 'asset-catalog' && <AssetCatalogSection />}
        {activeTab === 'stat-roll' && <StatRollSection />}
      </div>
    </div>
  );
}
