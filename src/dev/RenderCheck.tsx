import { useMemo, useState } from 'react';
import {
  DEFAULT_SCALE,
  NIGHT_CSS_FILTER,
  REGIONS,
  REGION_TO_LANGUAGE,
  type CodeLanguage,
  type Region,
} from '../config';
import {
  ALTAR_BLESSING_TEXT,
  ALTAR_CURSE_TEXT,
  ALTAR_INSCRIPTIONS,
  ALTAR_SITUATION_TEXT,
  resolveAltarChoice,
} from '../data/altar';
import { CLIENTS } from '../data/clients';
import { getCodeQaStats, renderCode } from '../data/codeRender';
import { EVENTS } from '../data/events';
import { getItemEffect } from '../data/itemEffect';
import { ITEMS } from '../data/items';
import { MISSIONS } from '../data/missions';
import { MOBS } from '../data/mobs';
import type { AltarOutcome, ItemEffect } from '../data/types';
import { validateContentData } from '../data/validate';
import { createSeededRng } from '../logic/rng';
import {
  dominantStat,
  rollStatPoints,
  toHeroStats,
  type HeroStats,
  type StatPoints,
} from '../logic/statRoll';
import { getAllAssets, getAsset } from '../render/assets';
import { CODE_SAMPLES } from './codeSamples';


import { getItemSparklePoints } from '../render/itemGrade';
import { CRACK_EFFECT_ID, ItemSprite } from '../render/ItemSprite';

import { getAssetRects } from '../render/pixel';
import { PixelSprite } from '../render/PixelSprite';
import {
  REGION_COLOR_MAP,
  getAssetRegionPalette,
  getDistantBgId,
  isRegionPaletteTarget,
  rgbToHex,
} from '../render/region';
import type {
  ItemGrade,
  PixelRect,
  RegisteredPixelAsset,
} from '../render/types';

const ITEM_GRADES: readonly ItemGrade[] = [
  'shining',
  'normal',
  'broken',
] as const;

const CODE_LANGUAGES: readonly CodeLanguage[] = ['Java', 'JS', 'TS'] as const;

function isExactLinesMatch(actual: string[], expected: string[]): boolean {
  if (actual.length !== expected.length) {
    return false;
  }
  for (let i = 0; i < actual.length; i++) {
    if (actual[i] !== expected[i]) {
      return false;
    }
  }
  return true;
}


const MOB_ITEM_PAIRS: readonly [mobId: string, itemId: string][] = [

  ['mob-grass-slime-64', 'item-jelly-64'],
  ['mob-moss-golem-64', 'item-stone-griddle-64'],
  ['mob-stone-shell-turtle-64', 'item-shell-shard-64'],
  ['mob-field-boar-64', 'item-boar-tusk-64'],
  ['mob-mist-fox-64', 'item-fox-tail-fur-64'],
  ['mob-nightshade-wolf-64', 'item-wolf-fang-64'],
  ['mob-blood-bat-swarm-64', 'item-bat-wing-64'],
  ['mob-wandering-skeleton-64', 'item-bone-fragment-64'],
  ['mob-mimic-64', 'item-mimic-lock-64'],
];

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

function formatItemEffect(effect: ItemEffect): string {
  if (effect.kind === 'score') {
    return 'score (점수 획득)';
  }
  if (effect.kind === 'permanent') {
    return `${effect.stat} 영구 상승`;
  }
  return `${effect.stat} 임시 버프 (다음 ${effect.battles}전투)`;
}

function formatAltarOutcome(outcome: AltarOutcome): string {
  if (outcome.kind === 'blessing') {
    return `축복 +${outcome.amount}`;
  }
  if (outcome.kind === 'curse') {
    return `저주 −${Math.abs(outcome.amount)}`;
  }
  return 'none';
}

export function RenderCheck() {


  const [region, setRegion] = useState<Region>('warm');
  const [isNight, setIsNight] = useState(false);

  const pathPalette = useMemo(
    () => getAssetRegionPalette('bg-field-path-128', region),
    [region],
  );

  const distantBgId = getDistantBgId(region);

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

  const itemGradeRows = useMemo(() => {
    return MOB_ITEM_PAIRS.map(([, itemId]) => ({
      itemId,
      crackPixels: countCrackOverlapPixels(itemId),
      sparklePoints: getItemSparklePoints(itemId),
    }));
  }, []);

  const mobMap = useMemo(() => new Map(MOBS.map((m) => [m.id, m])), []);
  const itemMap = useMemo(() => new Map(ITEMS.map((i) => [i.id, i])), []);
  const clientMap = useMemo(
    () => new Map(CLIENTS.map((c) => [c.id, c])),
    [],
  );
  const validationResults = useMemo(() => validateContentData(), []);

  // 스탯 굴림 상태
  const [singleRoll, setSingleRoll] = useState<{
    points: StatPoints;
    heroStats: HeroStats;
    dominant: 'hp' | 'attack' | 'defense' | null;
  } | null>(null);

  const [distResult, setDistResult] = useState<{
    totalRolls: number;
    seed: number;
    stats: {
      key: 'hp' | 'attack' | 'defense';
      mean: number;
      mode: number;
      rate5: number;
      rate20: number;
      freq: Record<number, number>;
    }[];
    invariants: {
      name: string;
      pass: boolean;
      detail: string;
    }[];
    specChecks: {
      name: string;
      pass: boolean;
      detail: string;
    }[];
  } | null>(null);

  const handleRollSingle = () => {
    const points = rollStatPoints();
    const heroStats = toHeroStats(points);
    const dominant = dominantStat(points);
    setSingleRoll({ points, heroStats, dominant });
  };

  const handleRunSimulation = () => {
    const seed = 20261110;
    const TOTAL_SIM = 200_000;
    const rng = createSeededRng(seed);

    let allSum30 = true;
    let allBetween5And20 = true;

    const hpFreq: Record<number, number> = {};
    const atkFreq: Record<number, number> = {};
    const defFreq: Record<number, number> = {};

    for (let v = 5; v <= 20; v++) {
      hpFreq[v] = 0;
      atkFreq[v] = 0;
      defFreq[v] = 0;
    }

    let hpSum = 0;
    let atkSum = 0;
    let defSum = 0;

    for (let i = 0; i < TOTAL_SIM; i++) {
      const p = rollStatPoints(rng);
      if (p.hp + p.attack + p.defense !== 30) {
        allSum30 = false;
      }
      if (
        p.hp < 5 ||
        p.hp > 20 ||
        p.attack < 5 ||
        p.attack > 20 ||
        p.defense < 5 ||
        p.defense > 20
      ) {
        allBetween5And20 = false;
      }

      hpFreq[p.hp] = (hpFreq[p.hp] ?? 0) + 1;
      atkFreq[p.attack] = (atkFreq[p.attack] ?? 0) + 1;
      defFreq[p.defense] = (defFreq[p.defense] ?? 0) + 1;

      hpSum += p.hp;
      atkSum += p.attack;
      defSum += p.defense;
    }

    // 결정론적 검사: 같은 시드로 두 번 100회 굴린 결과가 같은지
    const rng1 = createSeededRng(seed);
    const rng2 = createSeededRng(seed);
    let deterministicPass = true;
    for (let i = 0; i < 100; i++) {
      const p1 = rollStatPoints(rng1);
      const p2 = rollStatPoints(rng2);
      if (
        p1.hp !== p2.hp ||
        p1.attack !== p2.attack ||
        p1.defense !== p2.defense
      ) {
        deterministicPass = false;
        break;
      }
    }

    const calcStat = (
      key: 'hp' | 'attack' | 'defense',
      sum: number,
      freq: Record<number, number>,
    ) => {
      const mean = sum / TOTAL_SIM;
      let maxCount = -1;
      let mode = 5;
      for (let v = 5; v <= 20; v++) {
        if (freq[v] > maxCount) {
          maxCount = freq[v];
          mode = v;
        }
      }
      const rate5 = (freq[5] / TOTAL_SIM) * 100;
      const rate20 = (freq[20] / TOTAL_SIM) * 100;
      return { key, mean, mode, rate5, rate20, freq };
    };

    const hpStat = calcStat('hp', hpSum, hpFreq);
    const atkStat = calcStat('attack', atkSum, atkFreq);
    const defStat = calcStat('defense', defSum, defFreq);

    const invariants = [
      {
        name: '모든 굴림의 합이 30',
        pass: allSum30,
        detail: allSum30 ? '200,000회 모두 합계 30' : '합계 30이 아닌 굴림 발생',
      },
      {
        name: '모든 스탯이 5 이상 20 이하',
        pass: allBetween5And20,
        detail: allBetween5And20
          ? '모든 스탯이 [5, 20] 범위 내'
          : '범위 벗어남 발생',
      },
      {
        name: '같은 시드로 두 번 100회 굴린 결과가 같음',
        pass: deterministicPass,
        detail: deterministicPass ? '100회 연속 완전 일치' : '결과 불일치 발생',
      },
    ];

    const meanHpPass = Math.abs(hpStat.mean - 10) <= 0.05;
    const meanAtkPass = Math.abs(atkStat.mean - 10) <= 0.05;
    const meanDefPass = Math.abs(defStat.mean - 10) <= 0.05;
    const meansPass = meanHpPass && meanAtkPass && meanDefPass;

    const modesPass =
      hpStat.mode === 9 && atkStat.mode === 9 && defStat.mode === 9;

    const rate5Pass =
      hpStat.rate5 >= 0.9 &&
      hpStat.rate5 <= 1.3 &&
      atkStat.rate5 >= 0.9 &&
      atkStat.rate5 <= 1.3 &&
      defStat.rate5 >= 0.9 &&
      defStat.rate5 <= 1.3;

    const rate20Pass =
      hpStat.rate20 <= 0.01 && atkStat.rate20 <= 0.01 && defStat.rate20 <= 0.01;

    const maxMeanDiff =
      Math.max(hpStat.mean, atkStat.mean, defStat.mean) -
      Math.min(hpStat.mean, atkStat.mean, defStat.mean);
    const meanDiffPass = maxMeanDiff <= 0.05;

    const specChecks = [
      {
        name: '평균 10 ± 0.05',
        pass: meansPass,
        detail: `HP: ${hpStat.mean.toFixed(4)}, Atk: ${atkStat.mean.toFixed(4)}, Def: ${defStat.mean.toFixed(4)}`,
      },
      {
        name: '최빈값 9',
        pass: modesPass,
        detail: `HP: ${hpStat.mode}, Atk: ${atkStat.mode}, Def: ${defStat.mode}`,
      },
      {
        name: '값 5 비율 0.9 ~ 1.3%',
        pass: rate5Pass,
        detail: `HP: ${hpStat.rate5.toFixed(3)}%, Atk: ${atkStat.rate5.toFixed(3)}%, Def: ${defStat.rate5.toFixed(3)}%`,
      },
      {
        name: '값 20 비율 0.01% 이하',
        pass: rate20Pass,
        detail: `HP: ${hpStat.rate20.toFixed(4)}%, Atk: ${atkStat.rate20.toFixed(4)}%, Def: ${defStat.rate20.toFixed(4)}%`,
      },
      {
        name: '세 스탯 평균의 최대 차이 0.05 이하',
        pass: meanDiffPass,
        detail: `최대 차이: ${maxMeanDiff.toFixed(4)}`,
      },
    ];

    setDistResult({
      totalRolls: TOTAL_SIM,
      seed,
      stats: [hpStat, atkStat, defStat],
      invariants,
      specChecks,
    });
  };

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

      <section style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '12px' }}>
          코드 렌더러 (src/data/codeRender.ts — 현재 지역 언어:{' '}
          {REGION_TO_LANGUAGE[region]})
        </h2>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            maxWidth: '960px',
          }}
        >
          {CODE_SAMPLES.map((sample) => {
            const activeLang = REGION_TO_LANGUAGE[region];
            const qaStats = getCodeQaStats(sample.code);
            return (
              <div
                key={sample.id}
                style={{
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '16px',
                  background: '#f8fafc',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '12px',
                    flexWrap: 'wrap',
                    gap: '8px',
                  }}
                >
                  <h3 style={{ fontSize: '16px', margin: 0 }}>
                    {sample.title} (<code>{sample.id}</code>)
                  </h3>
                  <div
                    style={{
                      display: 'flex',
                      gap: '12px',
                      alignItems: 'center',
                      fontSize: '13px',
                      color: '#334155',
                    }}
                  >
                    <span>
                      최대 줄 수: <strong>{qaStats.maxLines}</strong>
                    </span>
                    <span>
                      논리 연산자 수: <strong>{qaStats.logicalOpCount}</strong>
                    </span>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontWeight: 'bold',
                        background: qaStats.needsReview ? '#fef3c7' : '#dcfce7',
                        color: qaStats.needsReview ? '#b45309' : '#15803d',
                      }}
                    >
                      {qaStats.needsReview ? '검수 대상' : '검수 대상 아님'}
                    </span>
                  </div>
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                    gap: '12px',
                  }}
                >
                  {CODE_LANGUAGES.map((lang) => {
                    const renderedLines = renderCode(sample.code, lang);
                    const expectedLines = sample.expected[lang];
                    const pass = isExactLinesMatch(
                      renderedLines,
                      expectedLines,
                    );
                    const isActive = lang === activeLang;
                    return (
                      <div
                        key={lang}
                        style={{
                          border: isActive
                            ? '2px solid #2563eb'
                            : '1px solid #cbd5e1',
                          borderRadius: '6px',
                          background: isActive ? '#eff6ff' : '#ffffff',
                          padding: '10px',
                          boxShadow: isActive
                            ? '0 0 0 2px rgba(37, 99, 235, 0.15)'
                            : undefined,
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '8px',
                            fontSize: '13px',
                          }}
                        >
                          <div>
                            <strong>{lang}</strong>
                            {isActive && (
                              <span
                                style={{
                                  marginLeft: '6px',
                                  padding: '2px 6px',
                                  background: '#2563eb',
                                  color: '#ffffff',
                                  borderRadius: '4px',
                                  fontSize: '11px',
                                  fontWeight: 'bold',
                                }}
                              >
                                선택 지역 ({region})
                              </span>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <span style={{ color: '#475569' }}>
                              {renderedLines.length}줄
                            </span>
                            <strong
                              style={{
                                color: pass ? '#16a34a' : '#dc2626',
                              }}
                            >
                              {pass ? 'PASS' : 'FAIL'}
                            </strong>
                          </div>
                        </div>
                        <pre
                          style={{
                            margin: 0,
                            padding: '10px',
                            background: '#0f172a',
                            color: '#f8fafc',
                            borderRadius: '4px',
                            fontFamily:
                              'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                            fontSize: '13px',
                            lineHeight: 1.5,
                            overflowX: 'auto',
                          }}
                        >
                          {renderedLines.join('\n')}
                        </pre>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '12px' }}>
          고대 제단 (src/data/altar.ts — 현재 선택 지역: {region})
        </h2>
        <div
          style={{
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            padding: '16px',
            background: '#f8fafc',
            maxWidth: '960px',
          }}
        >
          <div style={{ fontSize: '14px', marginBottom: '12px' }}>
            <div>
              <strong>지문:</strong> {ALTAR_SITUATION_TEXT}
            </div>
            <div>
              <strong>축복 문구:</strong> {ALTAR_BLESSING_TEXT} /{' '}
              <strong>저주 문구:</strong> {ALTAR_CURSE_TEXT}
            </div>
          </div>

          {ALTAR_INSCRIPTIONS.map((inscription) => {
            const activeLang = REGION_TO_LANGUAGE[region];
            return (
              <div key={inscription.id} style={{ marginBottom: '20px' }}>
                <h3 style={{ fontSize: '16px', margin: '0 0 8px 0' }}>
                  샘플 술식 3개 (<code>{inscription.id}</code> — 언어 이름 미표시)
                </h3>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                    gap: '12px',
                  }}
                >
                  {CODE_LANGUAGES.map((lang, idx) => {
                    const isAnswer = lang === activeLang;
                    return (
                      <div
                        key={lang}
                        style={{
                          border: isAnswer
                            ? '2px solid #16a34a'
                            : '1px solid #cbd5e1',
                          borderRadius: '6px',
                          background: isAnswer ? '#f0fdf4' : '#ffffff',
                          padding: '10px',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '8px',
                            fontSize: '13px',
                          }}
                        >
                          <strong>술식 #{idx + 1}</strong>
                          {isAnswer && (
                            <span
                              style={{
                                padding: '2px 6px',
                                background: '#16a34a',
                                color: '#ffffff',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: 'bold',
                              }}
                            >
                              현재 지역({region}) 정답 술식
                            </span>
                          )}
                        </div>
                        <pre
                          style={{
                            margin: 0,
                            padding: '10px',
                            background: '#0f172a',
                            color: '#f8fafc',
                            borderRadius: '4px',
                            fontFamily:
                              'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                            fontSize: '13px',
                            lineHeight: 1.5,
                            overflowX: 'auto',
                          }}
                        >
                          {inscription.snippets[lang].join('\n')}
                        </pre>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          <h3 style={{ fontSize: '16px', margin: '0 0 8px 0' }}>
            판정 표 (지역 3 × 고른 언어 3 = 9칸, currentStatValue = 5)
          </h3>
          <table
            style={{
              borderCollapse: 'collapse',
              width: '100%',
              fontSize: '14px',
              background: '#ffffff',
              marginBottom: '12px',
            }}
          >
            <thead>
              <tr style={{ background: '#f1f5f9', textAlign: 'left' }}>
                <th style={{ border: '1px solid #cbd5e1', padding: '8px' }}>
                  지역 (지역 언어)
                </th>
                {CODE_LANGUAGES.map((chosenLang) => (
                  <th
                    key={chosenLang}
                    style={{ border: '1px solid #cbd5e1', padding: '8px' }}
                  >
                    고른 언어: {chosenLang}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {REGIONS.map((r) => {
                const rLang = REGION_TO_LANGUAGE[r];
                return (
                  <tr key={r}>
                    <td style={{ border: '1px solid #cbd5e1', padding: '8px' }}>
                      <strong>{r}</strong> (<code>{rLang}</code>)
                    </td>
                    {CODE_LANGUAGES.map((chosenLang) => {
                      const outcome = resolveAltarChoice(
                        chosenLang,
                        rLang,
                        'attack',
                        5,
                      );
                      const isBlessing = outcome.kind === 'blessing';
                      return (
                        <td
                          key={chosenLang}
                          style={{
                            border: '1px solid #cbd5e1',
                            padding: '8px',
                            fontWeight: 'bold',
                            color: isBlessing ? '#16a34a' : '#dc2626',
                          }}
                        >
                          {formatAltarOutcome(outcome)}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>

          {(() => {
            const zeroCurseOutcome = resolveAltarChoice(
              'Java',
              'TS',
              'attack',
              0,
            );
            const pass = zeroCurseOutcome.kind === 'none';
            return (
              <div style={{ fontSize: '14px' }}>
                <strong>
                  하한 확인 (currentStatValue = 0에서 저주를 고른 경우):
                </strong>{' '}
                <code>{formatAltarOutcome(zeroCurseOutcome)}</code> —{' '}
                <strong style={{ color: pass ? '#16a34a' : '#dc2626' }}>
                  {pass ? 'PASS' : 'FAIL'}
                </strong>
              </div>
            );
          })()}
        </div>
      </section>

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
                        <span>
                          {exItem.name} (<code>{exItem.id}</code>)
                        </span>
                      </div>
                    )}
                  </td>
                  <td style={{ border: '1px solid #cbd5e1', padding: '8px' }}>
                    <code>{exItem?.reward ?? '-'}</code>
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
                이름 (id)
              </th>
              <th style={{ border: '1px solid #cbd5e1', padding: '8px' }}>
                원천 몹
              </th>
              <th style={{ border: '1px solid #cbd5e1', padding: '8px' }}>
                미션 장면
              </th>
              <th style={{ border: '1px solid #cbd5e1', padding: '8px' }}>
                빛나는 (shining) 효과
              </th>
              <th style={{ border: '1px solid #cbd5e1', padding: '8px' }}>
                일반 (normal) 효과
              </th>
              <th style={{ border: '1px solid #cbd5e1', padding: '8px' }}>
                부서진 (broken) 효과
              </th>
            </tr>
          </thead>
          <tbody>
            {ITEMS.map((item) => (
              <tr key={item.id}>
                <td style={{ border: '1px solid #cbd5e1', padding: '8px' }}>
                  <strong>{item.name}</strong> (<code>{item.id}</code>)
                </td>
                <td style={{ border: '1px solid #cbd5e1', padding: '8px' }}>
                  <code>{item.sourceMobId}</code>
                </td>
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
                  {formatItemEffect(getItemEffect(item, 'shining'))}
                </td>
                <td style={{ border: '1px solid #cbd5e1', padding: '8px' }}>
                  {formatItemEffect(getItemEffect(item, 'normal'))}
                </td>
                <td style={{ border: '1px solid #cbd5e1', padding: '8px' }}>
                  {formatItemEffect(getItemEffect(item, 'broken'))}
                </td>
              </tr>
            ))}
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
                아이콘
              </th>
              <th style={{ border: '1px solid #cbd5e1', padding: '8px' }}>
                장소명 (id)
              </th>
              <th style={{ border: '1px solid #cbd5e1', padding: '8px' }}>
                passable
              </th>
              <th style={{ border: '1px solid #cbd5e1', padding: '8px' }}>
                분기 여부 (branch)
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
                    color: '#cbd5e1',
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

      {/* 스탯 굴림 구역 */}
      <section
        style={{
          marginTop: '32px',
          padding: '16px',
          border: '2px solid #6366f1',
          borderRadius: '8px',
          backgroundColor: '#fafafa',
        }}
      >
        <h2 style={{ fontSize: '20px', marginBottom: '12px', color: '#4338ca' }}>
          스탯 굴림 (src/logic/statRoll.ts)
        </h2>
        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
          <button
            type="button"
            onClick={handleRollSingle}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: 'bold',
              backgroundColor: '#6366f1',
              color: '#ffffff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            굴리기 (단일 1회)
          </button>
          <button
            type="button"
            onClick={handleRunSimulation}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: 'bold',
              backgroundColor: '#059669',
              color: '#ffffff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            분포 계산 (시드 20261110, 200,000회)
          </button>
        </div>

        {singleRoll && (
          <div
            style={{
              padding: '12px',
              backgroundColor: '#ffffff',
              border: '1px solid #e0e7ff',
              borderRadius: '6px',
              marginBottom: '16px',
            }}
          >
            <h3 style={{ fontSize: '16px', marginBottom: '8px' }}>
              단일 굴림 결과
            </h3>
            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
              <div>
                <strong>StatPoints:</strong> HP {singleRoll.points.hp} / Atk{' '}
                {singleRoll.points.attack} / Def {singleRoll.points.defense} (합:{' '}
                {singleRoll.points.hp +
                  singleRoll.points.attack +
                  singleRoll.points.defense}
                )
              </div>
              <div>
                <strong>HeroStats:</strong> MaxHP {singleRoll.heroStats.maxHp} / HP{' '}
                {singleRoll.heroStats.hp} / Atk {singleRoll.heroStats.attack} / Def{' '}
                {singleRoll.heroStats.defense}
              </div>
              <div>
                <strong>dominantStat:</strong>{' '}
                <span
                  style={{
                    fontWeight: 'bold',
                    color: singleRoll.dominant ? '#2563eb' : '#64748b',
                  }}
                >
                  {singleRoll.dominant ?? 'null (동점)'}
                </span>
              </div>
            </div>
          </div>
        )}

        {distResult && (
          <div>
            <h3 style={{ fontSize: '16px', marginBottom: '8px' }}>
              분포 계산 결과 ({distResult.totalRolls.toLocaleString()}회, 시드:{' '}
              {distResult.seed})
            </h3>

            {/* 불변 검사 표 */}
            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ fontSize: '14px', marginBottom: '6px' }}>
                1) 불변 검사 (Invariants)
              </h4>
              <table
                style={{
                  borderCollapse: 'collapse',
                  width: '100%',
                  fontSize: '13px',
                  backgroundColor: '#ffffff',
                }}
              >
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9' }}>
                    <th style={{ border: '1px solid #cbd5e1', padding: '6px' }}>
                      검사 항목
                    </th>
                    <th style={{ border: '1px solid #cbd5e1', padding: '6px' }}>
                      결과
                    </th>
                    <th style={{ border: '1px solid #cbd5e1', padding: '6px' }}>
                      상세
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {distResult.invariants.map((inv) => (
                    <tr key={inv.name}>
                      <td style={{ border: '1px solid #cbd5e1', padding: '6px' }}>
                        {inv.name}
                      </td>
                      <td
                        style={{
                          border: '1px solid #cbd5e1',
                          padding: '6px',
                          fontWeight: 'bold',
                          color: inv.pass ? '#16a34a' : '#dc2626',
                          textAlign: 'center',
                          width: '90px',
                        }}
                      >
                        {inv.pass ? 'PASS' : 'FAIL'}
                      </td>
                      <td style={{ border: '1px solid #cbd5e1', padding: '6px' }}>
                        {inv.detail}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 명세 대조 표 */}
            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ fontSize: '14px', marginBottom: '6px' }}>
                2) 명세 대조 (Spec Checks)
              </h4>
              <table
                style={{
                  borderCollapse: 'collapse',
                  width: '100%',
                  fontSize: '13px',
                  backgroundColor: '#ffffff',
                }}
              >
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9' }}>
                    <th style={{ border: '1px solid #cbd5e1', padding: '6px' }}>
                      검사 항목
                    </th>
                    <th style={{ border: '1px solid #cbd5e1', padding: '6px' }}>
                      결과
                    </th>
                    <th style={{ border: '1px solid #cbd5e1', padding: '6px' }}>
                      상세
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {distResult.specChecks.map((sc) => (
                    <tr key={sc.name}>
                      <td style={{ border: '1px solid #cbd5e1', padding: '6px' }}>
                        {sc.name}
                      </td>
                      <td
                        style={{
                          border: '1px solid #cbd5e1',
                          padding: '6px',
                          fontWeight: 'bold',
                          color: sc.pass ? '#16a34a' : '#dc2626',
                          textAlign: 'center',
                          width: '90px',
                        }}
                      >
                        {sc.pass ? 'PASS' : 'FAIL'}
                      </td>
                      <td style={{ border: '1px solid #cbd5e1', padding: '6px' }}>
                        {sc.detail}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 스탯별 요약 표 */}
            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ fontSize: '14px', marginBottom: '6px' }}>
                3) 스탯별 통계 요약
              </h4>
              <table
                style={{
                  borderCollapse: 'collapse',
                  width: '100%',
                  fontSize: '13px',
                  backgroundColor: '#ffffff',
                  textAlign: 'center',
                }}
              >
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9' }}>
                    <th style={{ border: '1px solid #cbd5e1', padding: '6px' }}>
                      스탯
                    </th>
                    <th style={{ border: '1px solid #cbd5e1', padding: '6px' }}>
                      평균 (목표: 10)
                    </th>
                    <th style={{ border: '1px solid #cbd5e1', padding: '6px' }}>
                      최빈값 (목표: 9)
                    </th>
                    <th style={{ border: '1px solid #cbd5e1', padding: '6px' }}>
                      값 5 비율 (목표: 0.9~1.3%)
                    </th>
                    <th style={{ border: '1px solid #cbd5e1', padding: '6px' }}>
                      값 20 비율 (목표: ≤0.01%)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {distResult.stats.map((s) => (
                    <tr key={s.key}>
                      <td
                        style={{
                          border: '1px solid #cbd5e1',
                          padding: '6px',
                          fontWeight: 'bold',
                        }}
                      >
                        {s.key}
                      </td>
                      <td style={{ border: '1px solid #cbd5e1', padding: '6px' }}>
                        {s.mean.toFixed(4)}
                      </td>
                      <td style={{ border: '1px solid #cbd5e1', padding: '6px' }}>
                        {s.mode}
                      </td>
                      <td style={{ border: '1px solid #cbd5e1', padding: '6px' }}>
                        {s.rate5.toFixed(3)}%
                      </td>
                      <td style={{ border: '1px solid #cbd5e1', padding: '6px' }}>
                        {s.rate20.toFixed(4)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 값별(5~20) 분포 표 */}
            <div>
              <h4 style={{ fontSize: '14px', marginBottom: '6px' }}>
                4) 값별(5~20) 빈도 및 비율 표
              </h4>
              <div style={{ overflowX: 'auto' }}>
                <table
                  style={{
                    borderCollapse: 'collapse',
                    width: '100%',
                    fontSize: '12px',
                    backgroundColor: '#ffffff',
                    textAlign: 'center',
                  }}
                >
                  <thead>
                    <tr style={{ backgroundColor: '#f1f5f9' }}>
                      <th
                        style={{
                          border: '1px solid #cbd5e1',
                          padding: '4px',
                          width: '60px',
                        }}
                      >
                        값
                      </th>
                      <th style={{ border: '1px solid #cbd5e1', padding: '4px' }}>
                        HP 빈도 (비율)
                      </th>
                      <th style={{ border: '1px solid #cbd5e1', padding: '4px' }}>
                        Attack 빈도 (비율)
                      </th>
                      <th style={{ border: '1px solid #cbd5e1', padding: '4px' }}>
                        Defense 빈도 (비율)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 16 }, (_, i) => i + 5).map((v) => {
                      const hpCnt = distResult.stats[0].freq[v] ?? 0;
                      const atkCnt = distResult.stats[1].freq[v] ?? 0;
                      const defCnt = distResult.stats[2].freq[v] ?? 0;
                      return (
                        <tr key={v}>
                          <td
                            style={{
                              border: '1px solid #cbd5e1',
                              padding: '4px',
                              fontWeight: 'bold',
                              backgroundColor: v === 9 ? '#eff6ff' : undefined,
                            }}
                          >
                            {v} {v === 9 ? '(최빈값)' : ''}
                          </td>
                          <td
                            style={{
                              border: '1px solid #cbd5e1',
                              padding: '4px',
                              backgroundColor: v === 9 ? '#eff6ff' : undefined,
                            }}
                          >
                            {hpCnt.toLocaleString()} (
                            {((hpCnt / distResult.totalRolls) * 100).toFixed(3)}
                            %)
                          </td>
                          <td
                            style={{
                              border: '1px solid #cbd5e1',
                              padding: '4px',
                              backgroundColor: v === 9 ? '#eff6ff' : undefined,
                            }}
                          >
                            {atkCnt.toLocaleString()} (
                            {((atkCnt / distResult.totalRolls) * 100).toFixed(3)}
                            %)
                          </td>
                          <td
                            style={{
                              border: '1px solid #cbd5e1',
                              padding: '4px',
                              backgroundColor: v === 9 ? '#eff6ff' : undefined,
                            }}
                          >
                            {defCnt.toLocaleString()} (
                            {((defCnt / distResult.totalRolls) * 100).toFixed(3)}
                            %)
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
