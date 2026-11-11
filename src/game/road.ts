import { DEFAULT_SCALE, REGION_TO_LANGUAGE, type Region } from '../config';
import { getAsset } from '../render/assets';
import { getAssetRects, rgbaToCss } from '../render/pixel';
import { getAssetRegionPalette } from '../render/region';
import { PREVIEW_CARD_COUNT } from './adventure';

/**
 * 3D 카드 길 기하·연출 설정. 전부 구조 확인용 초안이며 아트 작업에서 조정한다.
 */
// TEMP: 3D 길 기하 초안 (px, deg)
export const ROAD_GEOMETRY = {
  perspective: 900,
  /** 프레임 높이 대비 소실점 위치 */
  perspectiveOriginY: 0.4,
  /** 길 바닥 기울기. 90이면 완전히 눕는다 */
  floorTilt: 78,
  floorDepth: 1800,
  /** 바닥 폭. 프레임보다 넓게 두어 가장자리 사다리꼴이 보이지 않게 한다 */
  floorWidth: 2400,
  /** 길 타일 에셋 배율 = 게임 장면 공통 배율 */
  tileScale: DEFAULT_SCALE,
  cardWidth: 288,
  cardHeight: 340,
  /** 앞 카드 깊이와 카드 간격 */
  cardFirstDepth: 140,
  cardStep: 280,
  /** 대열에 선 카드가 뒤로 기운 각도 */
  cardLean: 14,
  /** 떠오른 카드의 들림·확대 */
  cardRiseLift: 28,
  cardRiseZ: 40,
  cardRiseScale: 1.06,
  /** 원경 배율(예외 배율) */
  distantScale: 6.25,
} as const;

// TEMP: 연출 길이 초안 (ms). 연출 중 입력 잠금
export const ROAD_ANIM = {
  advanceMs: 520,
  riseMs: 380,
  modalMs: 220,
  exitMs: 480,
} as const;

/** 소품 한 주기의 슬롯 수. 주기 길이 = cardStep × 슬롯 수 */
const PROP_PERIOD_SLOTS = PREVIEW_CARD_COUNT + 3;
export const PROP_PERIOD = ROAD_GEOMETRY.cardStep * PROP_PERIOD_SLOTS;

export type TerrainShape = 'tree' | 'rock' | 'bush';

export type TerrainPropDef = {
  id: string;
  side: 'left' | 'right';
  /** 길 중심에서의 가로 거리(px) */
  x: number;
  /** 주기 안의 기준 깊이 */
  baseDepth: number;
  shape: TerrainShape;
  /**
   * 지형지물 픽셀 에셋 id. 현재 에셋 47종에 길가 지형지물 전용 그림이 없어 null이며,
   * 아트 작업에서 에셋이 들어오면 여기만 채운다. null이면 TEMP 종이공예 실루엣을 그린다.
   */
  assetId: string | null;
};

// TEMP: 길 양옆 지형지물 배치 초안 (각 4개, 주기 반복)
export const TERRAIN_PROPS: readonly TerrainPropDef[] = [
  { id: 'L1', side: 'left', x: -300, baseDepth: 60, shape: 'tree', assetId: null },
  { id: 'L2', side: 'left', x: -240, baseDepth: 500, shape: 'rock', assetId: null },
  { id: 'L3', side: 'left', x: -320, baseDepth: 920, shape: 'bush', assetId: null },
  { id: 'L4', side: 'left', x: -260, baseDepth: 1340, shape: 'tree', assetId: null },
  { id: 'R1', side: 'right', x: 260, baseDepth: 280, shape: 'bush', assetId: null },
  { id: 'R2', side: 'right', x: 320, baseDepth: 700, shape: 'tree', assetId: null },
  { id: 'R3', side: 'right', x: 250, baseDepth: 1120, shape: 'rock', assetId: null },
  { id: 'R4', side: 'right', x: 300, baseDepth: 1540, shape: 'tree', assetId: null },
];

export type PlacedProp = {
  def: TerrainPropDef;
  /** 현재 깊이 (0 < depth ≤ PROP_PERIOD) */
  depth: number;
  /** 주기를 넘긴 횟수. 바뀌면 소품을 뒤로 재배치한다(React key) */
  wraps: number;
};

/** 대열 전진 횟수에 따른 소품 위치. 카메라를 지난 소품은 뒤로 돌아가 재사용된다 */
export function placeProps(advanceCount: number): PlacedProp[] {
  const shift = advanceCount * ROAD_GEOMETRY.cardStep;
  return TERRAIN_PROPS.map((def) => {
    const shifted = def.baseDepth - shift;
    // depth가 (0, PROP_PERIOD] 안에 오도록 주기만큼 뒤로 보낸다 (0 이하 = 카메라를 지남)
    const wraps = shifted > 0 ? 0 : Math.floor(-shifted / PROP_PERIOD) + 1;
    return { def, depth: shifted + wraps * PROP_PERIOD, wraps };
  });
}

export function cardSlotDepth(slot: number): number {
  return ROAD_GEOMETRY.cardFirstDepth + slot * ROAD_GEOMETRY.cardStep;
}

/**
 * 바닥 먼 가장자리(지평선)의 프레임 y 좌표(px). 원경 배치용.
 * 바닥은 프레임 아래 가장자리를 축으로 floorTilt만큼 눕고, 원근은 perspectiveOriginY에서 본다.
 */
export function computeHorizonY(frameHeight = 500): number {
  const g = ROAD_GEOMETRY;
  const rad = (g.floorTilt * Math.PI) / 180;
  const originY = frameHeight * g.perspectiveOriginY;
  const yWorld = frameHeight - g.floorDepth * Math.cos(rad);
  const z = g.floorDepth * Math.sin(rad);
  const s = g.perspective / (g.perspective + z);
  return originY + (yWorld - originY) * s;
}

/** 지역 이름 표시 (언어 지역 + §5-1 지역 성격). TEMP 표기 */
export const REGION_DISPLAY: Record<Region, string> = {
  warm: `${REGION_TO_LANGUAGE.warm} 지역 · 온화`,
  desert: `${REGION_TO_LANGUAGE.desert} 지역 · 사막`,
  cold: `${REGION_TO_LANGUAGE.cold} 지역 · 설원`,
};

// ---------------------------------------------------------------------------
// 팔레트 유틸 (기존 렌더 캐시 재사용)
// ---------------------------------------------------------------------------

/** 에셋의 (x, y) 픽셀 색을 CSS 문자열로. 투명이면 null */
export function getAssetPixelColor(
  assetId: string,
  x: number,
  y: number,
  palette?: number[][],
): string | null {
  const asset = getAsset(assetId);
  if (!asset) return null;
  const rect = getAssetRects(assetId).find(
    (r) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h,
  );
  if (!rect) return null;
  const color = (palette ?? asset.palette)[rect.p];
  if (!color || color[3] === 0) return null;
  return rgbaToCss(color);
}

function shade(cssHex: string, factor: number): string {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(cssHex);
  if (!m) return cssHex;
  const ch = (h: string) =>
    Math.max(0, Math.min(255, Math.round(parseInt(h, 16) * factor)))
      .toString(16)
      .padStart(2, '0');
  return `#${ch(m[1])}${ch(m[2])}${ch(m[3])}`.toUpperCase();
}

export type RoadColors = {
  sky: string;
  grass: string;
  foliage: string;
  trunk: string;
  rock: string;
};

export const ROAD_TILE_ASSET_ID = 'bg-field-path-128';

/** 지역 팔레트에서 바닥·소품 색을 끌어낸다 (별도 색 상수를 두지 않기 위함) */
export function getRoadColors(region: Region, distantBgId: string): RoadColors {
  const pathPalette = getAssetRegionPalette(ROAD_TILE_ASSET_ID, region);
  const grass =
    getAssetPixelColor(ROAD_TILE_ASSET_ID, 0, 0, pathPalette) ?? '#7FA85A';
  const dirt =
    getAssetPixelColor(ROAD_TILE_ASSET_ID, 64, 64, pathPalette) ?? '#C8AA7A';
  const sky = getAssetPixelColor(distantBgId, 0, 0) ?? '#BFD8E6';
  return {
    sky,
    grass,
    foliage: shade(grass, 0.72),
    trunk: shade(dirt, 0.55),
    rock: shade(dirt, 0.8),
  };
}
