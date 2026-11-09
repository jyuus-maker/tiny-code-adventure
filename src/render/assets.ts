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

export function getAsset(id: string): RegisteredPixelAsset | undefined {
  return assetMap.get(id);
}

export function getAllAssets(): RegisteredPixelAsset[] {
  return Array.from(assetMap.values());
}

