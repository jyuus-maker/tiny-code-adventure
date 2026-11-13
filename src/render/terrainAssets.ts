import type { Region } from '../config';
import { project as terrainProject } from '../assets/terrain/terrain-128-pixelcode';
import type {
  PixelAsset,
  PixelProjectData,
  PixelRun,
  RegisteredPixelAsset,
} from './types';

/**
 * 지형지물 통합 에셋 조회 (§2 그래픽 에셋 규칙).
 *
 * - `terrain-128-pixelcode.ts` 한 파일에 30개 에셋이 들어 있어 기존 "파일 1개 = 그림 1장" 레지스트리(assets.ts)와
 *   구조가 다르다. 여기서 `project`를 한 번만 읽어 `name`(원본 파일명, `.png` 포함)을 키로 Map을 만든다.
 * - 복원·SVG 변환·캐시는 기존 변환 메서드(pixel.ts `buildRectsFromAsset` / `getAssetRects`)를 그대로 쓴다.
 *   assets.ts의 `getAsset(id)`가 이 Map으로 폴백하므로 `PixelSprite id="ts_prop_wayfinder_128.png"`로 바로 그릴 수 있다.
 * - 에셋의 `row`/`col`은 픽셀코드 프로젝트 내부 그리드 위치이며 게임 배치 좌표로 쓰지 않는다.
 * - `getAllAssets()`(RenderCheck 목록·"파일당 그림 1장" 검사)에는 섞지 않는다. 지형지물 목록은 `getTerrainAssets()`로 따로 본다.
 */

/** 지역 ↔ 에셋 이름 접두사 (ts_ 온화평원 / js_ 설원 / java_ 사막) */
export const TERRAIN_REGION_PREFIX: Record<Region, string> = {
  warm: 'ts_',
  cold: 'js_',
  desert: 'java_',
};

export type TerrainAsset = RegisteredPixelAsset & {
  /** 원본 이름 (`.png` 포함). id와 같다 */
  name: string;
  /** 접두사로 판별한 지역. 접두사가 규칙에 없으면 null */
  region: Region | null;
  /** 픽셀코드 프로젝트 내부 그리드 위치 (배치 좌표 아님) */
  gridRow: number;
  gridCol: number;
};

export const TERRAIN_SOURCE_FILENAME = 'terrain-128-pixelcode.ts';

/** 향후 `pixels`(픽셀당 팔레트 인덱스 배열) 형식이 들어와도 같은 변환 경로를 타도록 런으로 바꾼다 */
export function pixelsToRuns(pixels: readonly number[]): PixelRun[] {
  const runs: PixelRun[] = [];
  let i = 0;
  while (i < pixels.length) {
    const p = pixels[i];
    let j = i + 1;
    while (j < pixels.length && pixels[j] === p) j++;
    runs.push([i, j - i, p]);
    i = j;
  }
  return runs;
}

function resolveRuns(asset: PixelAsset): PixelRun[] | null {
  if (asset.runs && asset.runs.length > 0) return asset.runs;
  if (asset.pixels && asset.pixels.length > 0) return pixelsToRuns(asset.pixels);
  return null;
}

function regionOfName(name: string): Region | null {
  for (const region of Object.keys(TERRAIN_REGION_PREFIX) as Region[]) {
    if (name.startsWith(TERRAIN_REGION_PREFIX[region])) return region;
  }
  return null;
}

function buildTerrainMap(data: PixelProjectData): Map<string, TerrainAsset> {
  const map = new Map<string, TerrainAsset>();
  for (const raw of data.assets) {
    if (map.has(raw.name)) {
      console.warn(`[terrainAssets] 이름이 중복됩니다: ${raw.name} (뒤의 것은 무시)`);
      continue;
    }
    const runs = resolveRuns(raw);
    if (!runs) {
      console.warn(`[terrainAssets] ${raw.name}: runs/pixels 데이터가 없습니다 (등록 제외)`);
      continue;
    }
    if (raw.width !== raw.height) {
      console.warn(`[terrainAssets] ${raw.name}: 정사각형이 아닙니다 (${raw.width}x${raw.height})`);
    }
    const region = regionOfName(raw.name);
    if (!region) {
      console.warn(`[terrainAssets] ${raw.name}: 지역 접두사(ts_/js_/java_)가 아닙니다`);
    }
    map.set(raw.name, {
      id: raw.name,
      name: raw.name,
      filename: TERRAIN_SOURCE_FILENAME,
      assetCount: data.assets.length,
      size: raw.width,
      version: null,
      width: raw.width,
      height: raw.height,
      palette: data.palette,
      runs,
      region,
      gridRow: raw.row,
      gridCol: raw.col,
    });
  }
  return map;
}

const terrainMap = buildTerrainMap(terrainProject);

/** 원본 이름(`.png` 포함)으로 조회 */
export function getTerrainAsset(name: string): TerrainAsset | undefined {
  return terrainMap.get(name);
}

export function hasTerrainAsset(name: string): boolean {
  return terrainMap.has(name);
}

export function getTerrainAssets(): TerrainAsset[] {
  return Array.from(terrainMap.values());
}

export function getTerrainAssetsByRegion(region: Region): TerrainAsset[] {
  return getTerrainAssets().filter((a) => a.region === region);
}

export function getTerrainAssetNames(): string[] {
  return Array.from(terrainMap.keys());
}
