import {
  HP_PER_POINT,
  STAT_MIN_POINTS,
  STAT_ROLL_ALPHA,
  STAT_TOTAL_POINTS,
} from '../config';
import { sampleGamma } from './gamma';
import type { Rng } from './rng';

export type StatPoints = {
  hp: number;
  attack: number;
  defense: number;
};

export type HeroStats = {
  maxHp: number;
  hp: number;
  attack: number;
  defense: number;
};

type StatKey = 'hp' | 'attack' | 'defense';

/**
 * 총 30포인트를 최소 5포인트 보장 후 감마 분포 가중치(alpha=2)로 3개 스탯에 랜덤 배분
 */
export function rollStatPoints(rng: Rng = Math.random): StatPoints {
  const remainingTotal = STAT_TOTAL_POINTS - STAT_MIN_POINTS * 3;
  if (remainingTotal < 0) {
    throw new Error(
      `STAT_TOTAL_POINTS (${STAT_TOTAL_POINTS}) must be >= STAT_MIN_POINTS * 3 (${STAT_MIN_POINTS * 3})`,
    );
  }

  const wHp = sampleGamma(STAT_ROLL_ALPHA, rng);
  const wAtk = sampleGamma(STAT_ROLL_ALPHA, rng);
  const wDef = sampleGamma(STAT_ROLL_ALPHA, rng);
  const sumW = wHp + wAtk + wDef;

  const rawHp = (wHp / sumW) * remainingTotal;
  const rawAtk = (wAtk / sumW) * remainingTotal;
  const rawDef = (wDef / sumW) * remainingTotal;

  const floorHp = Math.floor(rawHp);
  const floorAtk = Math.floor(rawAtk);
  const floorDef = Math.floor(rawDef);

  let remainder = remainingTotal - (floorHp + floorAtk + floorDef);

  const entries: { key: StatKey; frac: number; order: number }[] = [
    { key: 'hp', frac: rawHp - floorHp, order: 0 },
    { key: 'attack', frac: rawAtk - floorAtk, order: 1 },
    { key: 'defense', frac: rawDef - floorDef, order: 2 },
  ];

  // 소수부가 큰 순서대로, 같으면 hp -> attack -> defense 순
  entries.sort((a, b) => {
    if (b.frac !== a.frac) {
      return b.frac - a.frac;
    }
    return a.order - b.order;
  });

  const bonus: Record<StatKey, number> = {
    hp: 0,
    attack: 0,
    defense: 0,
  };

  for (let i = 0; i < entries.length && remainder > 0; i++) {
    bonus[entries[i].key] += 1;
    remainder -= 1;
  }

  return {
    hp: STAT_MIN_POINTS + floorHp + bonus.hp,
    attack: STAT_MIN_POINTS + floorAtk + bonus.attack,
    defense: STAT_MIN_POINTS + floorDef + bonus.defense,
  };
}

/**
 * StatPoints를 HeroStats로 변환 (maxHp = hp * HP_PER_POINT, hp = maxHp)
 */
export function toHeroStats(points: StatPoints): HeroStats {
  const maxHp = points.hp * HP_PER_POINT;
  return {
    maxHp,
    hp: maxHp,
    attack: points.attack,
    defense: points.defense,
  };
}

/**
 * 가장 높은 스탯의 코드 키를 반환. 1위가 동점이면 null.
 */
export function dominantStat(
  points: StatPoints,
): 'hp' | 'attack' | 'defense' | null {
  const { hp, attack, defense } = points;
  const max = Math.max(hp, attack, defense);

  let count = 0;
  let topKey: 'hp' | 'attack' | 'defense' | null = null;

  if (hp === max) {
    count++;
    topKey = 'hp';
  }
  if (attack === max) {
    count++;
    topKey = 'attack';
  }
  if (defense === max) {
    count++;
    topKey = 'defense';
  }

  return count === 1 ? topKey : null;
}
