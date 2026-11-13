import type { Region } from '../../config';
import { MOBS } from '../../data/mobs';
import type { Rng } from '../rng';
import type { BattleParticipantState } from './types';

// 방문 순번 배율 (언어와 무관한 일차별 배율, E1 확정값)
export const DAY_MULTIPLIERS: Record<1 | 2 | 3, number> = {
  1: 0.58,
  2: 0.66,
  3: 0.74,
};

export type SleepDepth = 'light' | 'deep';

export type MobInitOptions = {
  sleepDepth?: SleepDepth | null;
  dayIndex?: 1 | 2 | 3;
};

/**
 * 몹 9종의 인게임 인스턴스 생성.
 * 식: (기본 스탯 범위 내 랜덤 + 지역별 보정) × 방문 순번 배율.
 */
export function createMobParticipant(
  mobId: string,
  region: Region,
  options: MobInitOptions = {},
  rng: Rng = Math.random,
): BattleParticipantState {
  const mob = MOBS.find((m) => m.id === mobId);
  if (!mob) {
    throw new Error(`Mob not found: ${mobId}`);
  }

  const dayIndex = options.dayIndex ?? 1;
  const dayMult = DAY_MULTIPLIERS[dayIndex];

  // 1. 기본 스탯 범위 내 균등 랜덤 추첨
  const baseHpRange = mob.baseStats?.hp ?? { min: 800, max: 1000 };
  const baseAtkRange = mob.baseStats?.attack ?? { min: 10, max: 12 };
  const baseDefRange = mob.baseStats?.defense ?? { min: 8, max: 10 };

  const rawHp =
    baseHpRange.min + Math.floor(rng() * (baseHpRange.max - baseHpRange.min + 1));
  const rawAtk =
    baseAtkRange.min +
    Math.floor(rng() * (baseAtkRange.max - baseAtkRange.min + 1));
  const rawDef =
    baseDefRange.min +
    Math.floor(rng() * (baseDefRange.max - baseDefRange.min + 1));

  // 2. 지역별 보정치 적용
  const variant = mob.regionVariants?.[region];
  const bonusHp = variant?.statBonus?.hp ?? 0;
  const bonusAtk = variant?.statBonus?.attack ?? 0;
  const bonusDef = variant?.statBonus?.defense ?? 0;

  let hp = (rawHp + bonusHp) * dayMult;
  let attack = (rawAtk + bonusAtk) * dayMult;
  let defense = (rawDef + bonusDef) * dayMult;

  // 3. 잠 깊이 보정 (§4-5: 선잠 -10%, 깊은 잠 +15%)
  if (options.sleepDepth === 'light') {
    hp *= 0.9;
    attack *= 0.9;
  } else if (options.sleepDepth === 'deep') {
    hp *= 1.15;
    attack *= 1.15;
  }

  const finalHp = Math.max(100, Math.round(hp));
  const finalAtk = Math.max(1, Math.round(attack));
  const finalDef = Math.max(1, Math.round(defense));
  const displayName = variant?.name ?? mob.name;

  const mobRole =
    mob.type === 'attack'
      ? 'attack'
      : mob.type === 'defense'
        ? 'defense'
        : 'balanced';

  return {
    kind: 'mob',
    id: mob.id,
    assetId: mob.assetId,
    name: displayName,
    hp: finalHp,
    maxHp: finalHp,
    attack: finalAtk,
    defense: finalDef,
    accuracy: 10,
    role: mobRole,
    charged: false,
    defending: false,
    countering: false,
  };
}
