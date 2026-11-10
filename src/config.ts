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

// TEMP: 디자인 확정 전 초안 (빛나는 등급 반짝임 크기 - 아이템 폭 대비 비율 3개)
export const SHINING_SPARKLE_SIZE_RATIOS: readonly [number, number, number] = [
  0.35,
  0.25,
  0.18,
] as const;

// TEMP: 디자인 확정 전 초안 (빛나는 등급 반짝임 주기 ms)
export const SHINING_SPARKLE_PERIOD_MS = 1600;

// TEMP: 조율 전 초안 (일반·부서진 등급 아이템 임시 버프 유지 전투 수)
export const NORMAL_ITEM_BUFF_BATTLES = 2;
export const BROKEN_ITEM_BUFF_BATTLES = 1;

// TEMP: 조율 전 초안 (코드 QA 검수 기준값: 최대 줄 수, 최대 논리 연산자 수)
export const CODE_QA_MAX_LINES = 6;
export const CODE_QA_MAX_LOGICAL_OPS = 3;

// TEMP: 조율 전 초안 (고대 제단 축복 보상량 및 저주 비율)
export const ALTAR_BLESSING_AMOUNT = 2;
export const ALTAR_CURSE_RATIO = 0.5;

// 스탯 굴림 규칙
export const STAT_TOTAL_POINTS = 30;
export const STAT_MIN_POINTS = 5;

// TEMP: 스탯 배분 감마 분포 alpha 값
export const STAT_ROLL_ALPHA = 2;

// TEMP: 배틀 시뮬레이션에서 확정 (스탯 1포인트당 HP 환산 비율)
export const HP_PER_POINT = 10;





