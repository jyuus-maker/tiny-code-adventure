import type { Region } from '../config';
import { getAsset } from './assets';

export const REGION_COLOR_MAP: Record<Region, Record<string, string>> = {
  warm: {},
  desert: {
    // bg-field-path-128
    '#B5D096': '#E6CF9E',
    '#A9C58A': '#D9BE8A',
    '#D5BF96': '#CF9F72',
    '#C3AA7E': '#B8875E',
    '#CCB58B': '#C4946A',

    // mob-grass-slime-64
    '#346044': '#7A5530',
    '#80AF57': '#D9B46A',
    '#C4D984': '#F0DCA0',

    // item-jelly-64
    '#354E39': '#75512F',
    '#79AA59': '#D4AE64',
    '#C3D887': '#EED99C',

    // mob-moss-golem-64
    '#383C42': '#5A3E2E',
    '#B9B7A9': '#E0C49A',
    '#70984B': '#C9A25E',
    '#74787A': '#B98A5E',

    // item-stone-griddle-64
    '#444B48': '#5C4030',
    '#A4A89A': '#D2B48A',
    '#C0C1A9': '#E3CBA0',
    '#737B73': '#B08258',

    // mob-stone-shell-turtle-64
    '#414F42': '#5B4632',
    '#889080': '#B08A5C',
    '#BBC1A6': '#DCC08E',

    // item-shell-shard-64
    '#454B3B': '#584430',
    '#838A62': '#A8835A',
    '#B1B486': '#D6B987',
    '#525C46': '#6A5238',

    // mob-field-boar-64
    '#805342': '#B07A4E',
    '#BA8261': '#D9A86E',

    // mob-mist-fox-64
    '#495363': '#6A4E3A',
    '#A6B5C4': '#D8B888',
    '#DDE7EB': '#F2E2C2',

    // item-fox-tail-fur-64
    '#51586A': '#6E523E',

    // mob-nightshade-wolf-64
    '#303446': '#3E3029',
    '#555D76': '#7A6450',
    '#AEB1AD': '#D2BFA0',

    // mob-blood-bat-swarm-64
    '#382335': '#3E2A22',
    '#9A4056': '#A8603E',

    // item-bat-wing-64
    '#42283B': '#452E24',
    '#9C465B': '#AA643F',
    '#C16871': '#C98656',

    // mob-wandering-skeleton-64
    '#827D84': '#9A8068',
  },
  cold: {
    // bg-field-path-128
    '#B5D096': '#DCE6E2',
    '#A9C58A': '#C7D6D3',
    '#D5BF96': '#B7AFA2',
    '#C3AA7E': '#9E978C',
    '#CCB58B': '#ABA396',

    // mob-grass-slime-64
    '#346044': '#2F5468',
    '#80AF57': '#8FC3D6',
    '#C4D984': '#D8F0F4',

    // item-jelly-64
    '#354E39': '#2E5065',
    '#79AA59': '#89BDD1',
    '#C3D887': '#D5EEF3',

    // mob-moss-golem-64
    '#383C42': '#2E3A48',
    '#B9B7A9': '#D6E2EA',
    '#70984B': '#E8F2F5',
    '#74787A': '#7F95A6',

    // item-stone-griddle-64
    '#444B48': '#2F3B49',
    '#A4A89A': '#C4D3DD',
    '#C0C1A9': '#DCE6EC',
    '#737B73': '#7A90A2',

    // mob-stone-shell-turtle-64
    '#414F42': '#34465A',
    '#889080': '#7E98AE',
    '#BBC1A6': '#C9DCE6',

    // item-shell-shard-64
    '#454B3B': '#33445A',
    '#838A62': '#7891A8',
    '#B1B486': '#C3D7E2',
    '#525C46': '#3F5269',

    // mob-field-boar-64
    '#3E302D': '#2F2B30',
    '#805342': '#6E5A52',
    '#BA8261': '#A8968A',
    '#F0DBAC': '#EDE6DA',

    // item-boar-tusk-64
    '#D9BB87': '#D8CFC2',
    '#F4DAA3': '#EFE9DE',

    // mob-nightshade-wolf-64
    '#555D76': '#6E7F96',
    '#AEB1AD': '#DDE6EC',

    // mob-blood-bat-swarm-64
    '#382335': '#2A2840',
    '#9A4056': '#5E5C8C',

    // item-bat-wing-64
    '#42283B': '#2C2A44',
    '#9C465B': '#615F91',
    '#C16871': '#8583B4',

    // mob-wandering-skeleton-64
    '#827D84': '#7C8AA0',
  },
};

const REGION_PALETTE_PREFIXES = ['bg-field-path-', 'mob-', 'item-'] as const;

export function isRegionPaletteTarget(assetId: string): boolean {
  return REGION_PALETTE_PREFIXES.some((prefix) => assetId.startsWith(prefix));
}

export function rgbToHex(r: number, g: number, b: number): string {
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

export function getAssetRegionPalette(
  assetId: string,
  region: Region,
): number[][] | undefined {
  const asset = getAsset(assetId);
  if (!asset) {
    return undefined;
  }
  if (!isRegionPaletteTarget(assetId)) {
    return asset.palette;
  }
  return buildRegionPalette(asset.palette, region);
}

const DISTANT_BG_BY_REGION: Record<Region, string> = {
  warm: 'bg-distant-hills-128',
  desert: 'bg-distant-canyon-128',
  cold: 'bg-distant-mountains-128',
};

export function getDistantBgId(region: Region): string {
  return DISTANT_BG_BY_REGION[region];
}
