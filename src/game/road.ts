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
  /** 길 바닥 세로 깊이 (원경 4 : 길 6 비율 = 지평선 Y=200px에 맞춤) */
  floorDepth: 1440,
  /** 바닥 폭. 프레임보다 넓게 두어 가장자리 사다리꼴이 보이지 않게 한다 */
  floorWidth: 2400,
  /** 길 타일 에셋 배율 = 게임 장면 공통 배율 */
  tileScale: DEFAULT_SCALE,
  cardWidth: 288,
  cardHeight: 340,
  /** 앞 카드 깊이와 카드 간격 */
  cardFirstDepth: 20,
  cardStep: 270,
  /** 대열에 선 카드가 뒤로 기운 각도 */
  cardLean: 14,
  /** 떠오른 카드의 들림·확대 */
  cardRiseLift: 20,
  cardRiseZ: 40,
  cardRiseScale: 1.06,
  /** 원경 배율(예외 배율) */
  distantScale: 6.25,
  /** 지형지물 일괄 하단 접지 오프셋(px) // TEMP */
  propGroundOffsetY: 35,
} as const;

// TEMP: 연출 길이 초안 (ms). 텀 2배 조정 (사용자 요청 #3)
export const ROAD_ANIM = {
  advanceMs: 1040,
  riseMs: 760,
  modalMs: 440,
  exitMs: 960,
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
   * 지형지물 픽셀 에셋 id. null 또는 미지정이면 슬롯별 지역 에셋(TERRAIN_SLOT_ASSETS)으로 자동 조회
   */
  assetId?: string | null;
  /** 슬롯별 개별 표시 배율 (미지정 시 getPropVisualScale 기본값 사용) */
  customScale?: number;
};

// 길 양옆 지형지물 배치.
// - 모달 클리어 존 준수: 전투/이벤트 모달(가로 약 420px, X: 190~610) 뒤로 에셋이 가려지지 않도록 좌우 외곽에 여유 배치
// - 안쪽 잘림 금지: 소품의 안쪽은 온전히 보이고, 잘리는 부분은 화면 바깥 가장자리(0px 바깥, 800px 바깥) 쪽으로만 넘어가게 함
// - 크기 체계: 집(1.35배)을 인공물 기본으로 삼고, 나무(1.3배)는 집 크기의 1.15배 수준으로 편안하게 어우러짐 (집 2배 이내 준수)
export const TERRAIN_PROPS: readonly TerrainPropDef[] = [
  // --- 좌측 소품 (L1 ~ L4) : 화면 X < 175px 영역에 위치하여 모달 뒤로 가려지지 않음 ---
  { id: 'L1', side: 'left', x: -460, baseDepth: 320, shape: 'tree' }, // 좌측 외곽 나무 (모달과 70px 이상 떨어짐, 바깥 가장자리로 살짝 걸침)
  { id: 'L2', side: 'left', x: -650, baseDepth: 650, shape: 'rock', customScale: 3.8 }, // 좌측 원경 산 (안쪽은 온전하고 바깥쪽으로 30% 넘어가 메움)
  { id: 'L3', side: 'left', x: -500, baseDepth: 950, shape: 'bush' }, // 좌측 수풀 (모달 좌측 트인 들판)
  { id: 'L4', side: 'left', x: -580, baseDepth: 1250, shape: 'tree' }, // 좌측 원경 앞 나무

  // --- 우측 소품 (R1 ~ R4) : 화면 X > 625px 영역에 위치하여 모달 뒤로 가려지지 않음 ---
  { id: 'R1', side: 'right', x: 450, baseDepth: 280, shape: 'bush' }, // 우하단 외곽 수풀
  { id: 'R2', side: 'right', x: 460, baseDepth: 580, shape: 'tree', customScale: 1.35 }, // 인공물 기본 기준인 집
  { id: 'R3', side: 'right', x: 680, baseDepth: 850, shape: 'rock', customScale: 2.6 }, // 집 뒤가 아닌 우측 빈 들판(2번째 캡처 영역)에 단단히 안착한 돌
  { id: 'R4', side: 'right', x: 500, baseDepth: 1250, shape: 'tree' }, // 상단 지평선 부근 표지판/나무
];

/**
 * 지형지물 종류별 표시 배율:
 * - 인공물(집, 망루, 게이트 등): 1.35 (인공물 크기의 기본 기준)
 * - 나무: 1.3 (집 높이의 1.15배 수준으로 지붕 위로 살짝 올라오는 자연스러운 마을 나무 크기)
 * - 수풀/풀덤불: 1.15 (길가 아기자기한 풀덤불)
 * - 산/바위: 기본 2.2배 (개별 슬롯에서 customScale로 2.6~3.8배 적용)
 */
export function getPropVisualScale(
  assetName: string | null | undefined,
  shape: TerrainShape,
): number {
  if (!assetName) {
    return shape === 'tree' ? 1.3 : shape === 'bush' ? 1.15 : 2.2;
  }
  const lower = assetName.toLowerCase();
  if (
    lower.includes('house') ||
    lower.includes('gate') ||
    lower.includes('watchtower') ||
    lower.includes('wayfinder') ||
    lower.includes('flag')
  ) {
    return 1.35;
  }
  if (lower.includes('tree') || lower.includes('pine')) {
    if (lower.startsWith('java_') && lower.includes('desert_tree')) {
      return 1.3 * 1.5;
    }
    return 1.3;
  }
  if (lower.includes('bush') || lower.includes('grass') || lower.includes('scrub')) {
    return 1.15;
  }
  return 2.2;
}

/**
 * 슬롯별 지형지물 에셋 배치 데이터 (지역 × 슬롯 id → 통합 파일의 원본 에셋 이름).
 * - 이름은 `terrain-128-pixelcode.ts`의 `name` 그대로(`.png` 포함). 조회는 getAsset → terrainAssets 폴백.
 * - 좌표(x, baseDepth)는 위 TERRAIN_PROPS가 소유한다. 여기서는 "어느 슬롯에 어느 그림"만 정한다.
 * - 슬롯 모양(tree=키 큰 소품, rock=바위, bush=수풀)에 맞춰 배정했다. 각 지역 10개 중 8개를 쓰고
 *   나머지 2개(ts_prop_fence / ts_distant_stretch_green_hills, js_prop_covered_well / js_prop_house_raised,
 *   java_prop_house_flat_roof / java_prop_market_awning)는 슬롯이 8개뿐이라 배치하지 않았다(레지스트리에는 등록됨).
 */
export const TERRAIN_SLOT_ASSETS: Record<Region, Readonly<Record<string, string>>> = {
  warm: {
    L1: 'ts_prop_tree_round_128.png',
    L2: 'ts_terrain_rock_mossy_128.png',
    L3: 'ts_terrain_bush_round_128.png',
    L4: 'ts_prop_tree_wide_128.png',
    R1: 'ts_terrain_bush_spreading_128.png',
    R2: 'ts_prop_house_stonewall_128.png',
    R3: 'ts_terrain_rock_round_128.png',
    R4: 'ts_prop_wayfinder_128.png',
  },
  cold: {
    L1: 'js_prop_pine_tall_128.png',
    L2: 'js_terrain_cliff_rock_128.png',
    L3: 'js_terrain_crevice_grass_128.png',
    L4: 'js_prop_pine_windswept_128.png',
    R1: 'js_terrain_windswept_grass_128.png',
    R2: 'js_prop_house_steep_roof_128.png',
    R3: 'js_terrain_split_rock_128.png',
    R4: 'js_prop_wind_flag_128.png',
  },
  desert: {
    L1: 'java_prop_desert_tree_bent_128.png',
    L2: 'java_terrain_angular_sandstone_128.png',
    L3: 'java_terrain_dry_grass_128.png',
    L4: 'java_prop_desert_tree_wide_128.png',
    R1: 'java_terrain_thorn_scrub_128.png',
    R2: 'java_prop_watchtower_128.png',
    R3: 'java_terrain_layered_sandstone_128.png',
    R4: 'java_prop_sandstone_gate_128.png',
  },
};

/** 슬롯 id와 지역으로 에셋 이름을 찾는다. 등록되지 않은 이름이면 null(실루엣 폴백) */
export function resolveTerrainAssetId(
  slotId: string,
  region: Region | null | undefined,
): string | null {
  if (!region) return null;
  const name = TERRAIN_SLOT_ASSETS[region]?.[slotId];
  if (!name) return null;
  return getAsset(name) ? name : null;
}

export type PlacedProp = {
  def: TerrainPropDef;
  /** 현재 깊이 (0 < depth ≤ PROP_PERIOD) */
  depth: number;
  /** 주기를 넘긴 횟수. 바뀌면 소품을 뒤로 재배치한다(React key) */
  wraps: number;
};

/**
 * 대열 전진 횟수에 따른 소품 위치. 카메라를 지난 소품은 뒤로 돌아가 재사용된다.
 * region을 넘기면 슬롯별 지역 에셋 이름을 def.assetId에 채운다(위치 계산은 바뀌지 않는다).
 */
export function placeProps(
  advanceCount: number,
  region: Region | null = null,
): PlacedProp[] {
  const shift = advanceCount * ROAD_GEOMETRY.cardStep;
  return TERRAIN_PROPS.map((slot) => {
    const shifted = slot.baseDepth - shift;
    // depth가 (0, PROP_PERIOD] 안에 오도록 주기만큼 뒤로 보낸다 (0 이하 = 카메라를 지남)
    const wraps = shifted > 0 ? 0 : Math.floor(-shifted / PROP_PERIOD) + 1;
    const assetId = slot.assetId ?? resolveTerrainAssetId(slot.id, region);
    const def = assetId === slot.assetId ? slot : { ...slot, assetId };
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
