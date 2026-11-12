import { getTerrainAsset } from './terrainAssets';
import type { PixelProjectData, RegisteredPixelAsset } from './types';

type PixelModule = {
  project: PixelProjectData;
};

const modules = import.meta.glob<PixelModule>('../assets/pixel/*-pixelcode.ts', {
  eager: true,
});

const assetMap = new Map<string, RegisteredPixelAsset>();

const FILENAME_REGEX = /^(.+)-(\d+)(?:-v([^/-]+))?-pixelcode\.ts$/;

for (const [path, mod] of Object.entries(modules)) {
  const filename = path.split('/').pop() ?? path;
  const id = filename.replace(/-pixelcode\.ts$/, '');
  const match = filename.match(FILENAME_REGEX);

  let size = 0;
  let version: string | null = null;

  if (match) {
    size = Number(match[2]);
    version = match[3] ?? null;
  } else {
    console.warn(`[assets] 파일명이 규칙에 맞지 않습니다: ${filename}`);
  }

  const project = mod.project;
  if (!project || project.assets.length !== 1) {
    console.warn(
      `[assets] ${filename}: assets 배열의 개수가 1개가 아닙니다 (현재: ${project?.assets.length ?? 0})`,
    );
  }

  const rawAsset = project?.assets[0];
  if (!rawAsset) continue;

  if (rawAsset.width !== size || rawAsset.height !== size) {
    console.warn(
      `[assets] ${filename}: 파일명의 크기(${size})와 실제 크기(${rawAsset.width}x${rawAsset.height})가 다릅니다.`,
    );
  }

  assetMap.set(id, {
    id,
    filename,
    assetCount: project.assets.length,
    size,
    version,
    width: rawAsset.width,
    height: rawAsset.height,
    palette: project.palette,
    runs: rawAsset.runs ?? [],
  });
}

/**
 * id로 에셋 조회. 파일당 1장 레지스트리에 없으면 지형지물 통합 파일(terrainAssets)로 폴백한다.
 * 지형지물 id는 원본 이름(`ts_prop_wayfinder_128.png`처럼 `.png` 포함)이라 기존 id와 겹치지 않는다.
 * 이 폴백 덕분에 PixelSprite·getAssetRects(세로 병합 SVG 변환·캐시)를 지형지물에도 그대로 쓴다.
 */
export function getAsset(id: string): RegisteredPixelAsset | undefined {
  return assetMap.get(id) ?? getTerrainAsset(id);
}

export function getAllAssets(): RegisteredPixelAsset[] {
  return Array.from(assetMap.values());
}

