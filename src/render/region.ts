import type { Region } from '../config';

// TEMP: 디자인 확정 전 초안 (지역별 색 매핑 표: 원본 #RRGGBB -> 지역 #RRGGBB)
export const REGION_COLOR_MAP: Record<Region, Record<string, string>> = {
  warm: {},
  // TEMP: 디자인 확정 전 초안
  desert: {
    '#B5D096': '#E6CF9E',
    '#A9C58A': '#D9BE8A',
    '#D5BF96': '#CF9F72',
    '#C3AA7E': '#B8875E',
    '#CCB58B': '#C4946A',
  },
  // TEMP: 디자인 확정 전 초안
  cold: {
    '#B5D096': '#DCE6E2',
    '#A9C58A': '#C7D6D3',
    '#D5BF96': '#B7AFA2',
    '#C3AA7E': '#9E978C',
    '#CCB58B': '#ABA396',
  },
};

function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b]
      .map((v) => v.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()
  );
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return [r, g, b];
}

export function buildRegionPalette(
  basePalette: number[][],
  region: Region,
): number[][] {
  const map = REGION_COLOR_MAP[region];
  if (!map || Object.keys(map).length === 0) {
    return basePalette;
  }

  return basePalette.map((rgba) => {
    const [r, g, b, a = 255] = rgba;
    if (a === 0) {
      return rgba;
    }
    const hex = rgbToHex(r, g, b);
    const mappedHex = map[hex];
    if (!mappedHex) {
      return rgba;
    }
    const [nr, ng, nb] = hexToRgb(mappedHex);
    return [nr, ng, nb, a];
  });
}

const DISTANT_BG_BY_REGION: Record<Region, string> = {
  warm: 'bg-distant-hills-128',
  desert: 'bg-distant-canyon-128',
  cold: 'bg-distant-mountains-128',
};

export function getDistantBgId(region: Region): string {
  return DISTANT_BG_BY_REGION[region];
}

