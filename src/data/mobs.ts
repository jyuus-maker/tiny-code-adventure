import type { Mob } from './types';

export const MOBS: readonly Mob[] = [
  {
    id: 'stone-shell-turtle',
    name: '돌껍질 거북',
    time: 'day',
    type: 'defense',
    assetId: 'mob-stone-shell-turtle-64',
    exclusiveItemId: 'shell-shard',
    // TEMP: CHK 08 몹 스탯 가안 (승인된 초기값, 실측 후 확정)
    baseStats: {
      hp: { min: 900, max: 1200 },
      attack: { min: 7, max: 9 },
      defense: { min: 12, max: 15 },
    },
    regionVariants: {
      warm: { name: '돌껍질 거북', statBonus: { defense: 2 } },
      desert: { name: '모래등 거북', statBonus: { hp: 100 } },
      cold: { name: '얼음등 거북', statBonus: { defense: 1 } },
    },
  },
  {
    id: 'golem',
    name: '골렘',
    time: 'day',
    type: 'defense',
    // 골렘 에셋 ID와 몹 ID 차이는 warm 지역 원본 그림명으로 의도된 연결 (§5-1)
    assetId: 'mob-moss-golem-64',
    exclusiveItemId: 'stone-griddle',
    // TEMP: CHK 08 몹 스탯 가안
    baseStats: {
      hp: { min: 1000, max: 1300 },
      attack: { min: 8, max: 10 },
      defense: { min: 13, max: 16 },
    },
    regionVariants: {
      warm: { name: '이끼 골렘', statBonus: { hp: 100 } },
      desert: { name: '사막 골렘', statBonus: { defense: 2 } },
      cold: { name: '서리 골렘', statBonus: { hp: 50 } },
    },
  },
  {
    id: 'grass-slime',
    name: '풀숲 슬라임',
    time: 'day',
    type: 'hp',
    assetId: 'mob-grass-slime-64',
    exclusiveItemId: 'jelly',
    // TEMP: CHK 08 몹 스탯 가안
    baseStats: {
      hp: { min: 800, max: 1100 },
      attack: { min: 9, max: 11 },
      defense: { min: 9, max: 11 },
    },
    regionVariants: {
      warm: { name: '풀숲 슬라임', statBonus: { hp: 150 } },
      desert: { name: '황토 슬라임', statBonus: { attack: 1 } },
      cold: { name: '눈송이 슬라임', statBonus: { defense: 1 } },
    },
  },
  {
    id: 'field-boar',
    name: '들판 멧돼지',
    time: 'day',
    type: 'hp',
    assetId: 'mob-field-boar-64',
    exclusiveItemId: 'boar-tusk',
    // TEMP: CHK 08 몹 스탯 가안
    baseStats: {
      hp: { min: 850, max: 1150 },
      attack: { min: 10, max: 12 },
      defense: { min: 8, max: 10 },
    },
    regionVariants: {
      warm: { name: '들판 멧돼지', statBonus: { attack: 1 } },
      desert: { name: '황야 멧돼지', statBonus: { hp: 100 } },
      cold: { name: '설원 멧돼지', statBonus: { attack: 1 } },
    },
  },
  {
    id: 'nightshade-wolf',
    name: '밤그늘 늑대',
    time: 'night',
    type: 'attack',
    assetId: 'mob-nightshade-wolf-64',
    exclusiveItemId: 'wolf-fang',
    // TEMP: CHK 08 몹 스탯 가안
    baseStats: {
      hp: { min: 750, max: 1000 },
      attack: { min: 13, max: 16 },
      defense: { min: 7, max: 9 },
    },
    regionVariants: {
      warm: { name: '밤그늘 늑대', statBonus: { hp: 80 } },
      desert: { name: '사구 늑대', statBonus: { defense: 1 } },
      cold: { name: '혹한 늑대', statBonus: { attack: 2 } },
    },
  },
  {
    id: 'blood-bat-swarm',
    name: '핏빛 박쥐',
    time: 'night',
    type: 'attack',
    assetId: 'mob-blood-bat-swarm-64',
    exclusiveItemId: 'bat-wing',
    // TEMP: CHK 08 몹 스탯 가안
    baseStats: {
      hp: { min: 700, max: 950 },
      attack: { min: 14, max: 17 },
      defense: { min: 6, max: 8 },
    },
    regionVariants: {
      warm: { name: '핏빛 박쥐', statBonus: { attack: 2 } },
      desert: { name: '노을 박쥐', statBonus: { attack: 1 } },
      cold: { name: '눈꽃 박쥐', statBonus: { hp: 100 } },
    },
  },
  {
    id: 'wandering-skeleton',
    name: '떠도는 해골병사',
    time: 'night',
    type: 'hp',
    assetId: 'mob-wandering-skeleton-64',
    exclusiveItemId: 'bone-fragment',
    // TEMP: CHK 08 몹 스탯 가안
    baseStats: {
      hp: { min: 800, max: 1100 },
      attack: { min: 10, max: 12 },
      defense: { min: 9, max: 11 },
    },
    regionVariants: {
      warm: { name: '떠도는 해골병사', statBonus: { defense: 1 } },
      desert: { name: '메마른 해골병사', statBonus: { attack: 1 } },
      cold: { name: '얼어붙은 해골병사', statBonus: { hp: 100 } },
    },
  },
  {
    id: 'mist-fox',
    name: '안개 여우',
    time: 'night',
    type: 'hp',
    assetId: 'mob-mist-fox-64',
    exclusiveItemId: 'fox-tail-fur',
    // TEMP: CHK 08 몹 스탯 가안
    baseStats: {
      hp: { min: 800, max: 1050 },
      attack: { min: 11, max: 13 },
      defense: { min: 8, max: 10 },
    },
    regionVariants: {
      warm: { name: '안개 여우', statBonus: { hp: 100 } },
      desert: { name: '신기루 여우', statBonus: { defense: 1 } },
      cold: { name: '은빛 여우', statBonus: { attack: 1 } },
    },
  },
  {
    id: 'mimic',
    name: '미믹',
    time: 'both',
    type: 'special',
    assetId: 'mob-mimic-64',
    exclusiveItemId: 'mimic-lock',
    // TEMP: CHK 08 몹 스탯 가안
    baseStats: {
      hp: { min: 900, max: 1200 },
      attack: { min: 12, max: 15 },
      defense: { min: 10, max: 12 },
    },
    regionVariants: {
      warm: { name: '미믹' },
      desert: { name: '미믹' },
      cold: { name: '미믹' },
    },
  },
];
