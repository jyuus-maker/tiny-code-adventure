export type Region = 'warm' | 'desert' | 'cold';

export type CodeLanguage = 'TS' | 'Java' | 'JS';

export const REGIONS: readonly Region[] = ['warm', 'desert', 'cold'] as const;

export const LANGUAGE_TO_REGION: Record<CodeLanguage, Region> = {
  TS: 'warm',
  Java: 'desert',
  JS: 'cold',
};

export const REGION_TO_LANGUAGE: Record<Region, CodeLanguage> = {
  warm: 'TS',
  desert: 'Java',
  cold: 'JS',
};

// TEMP: 디자인 확정 전 초안 (밤 필터 CSS filter 값)
export const NIGHT_CSS_FILTER = 'brightness(0.65) saturate(0.8) hue-rotate(-15deg)';

// TEMP: 디자인 확정 전 초안 (기본 표시 배율 scale 값)
export const DEFAULT_SCALE = 2;

// TEMP: 디자인 확정 전 초안 (부서진 등급 아이템 팔레트 채도·밝기 배율)
export const BROKEN_ITEM_SATURATION_SCALE = 0.6;

// TEMP: 디자인 확정 전 초안 (부서진 등급 아이템 팔레트 밝기 배율)
export const BROKEN_ITEM_LIGHTNESS_SCALE = 0.85;


