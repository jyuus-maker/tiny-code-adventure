import { MOBS } from '../../data/mobs';
import type { TimeOfDay } from '../../data/types';
import type { Rng } from '../rng';
import type { SleepDepth } from './statCalc';

export type EncounterRoll = 'normal' | 'ambush';

export const AMBUSH_RATIO = 0.3; // 일반:기습 = 70:30 (§4-3)

/** 일반 조우 시 기습 여부 추첨 */
export function rollEncounterStyle(
  rng: Rng = Math.random,
  ambushRatio = AMBUSH_RATIO,
): EncounterRoll {
  return rng() < ambushRatio ? 'ambush' : 'normal';
}

/**
 * 도망 성공 여부 판정 (§4-3: 유저 도망 성공률 = 유저 명중률).
 * 유저 명중률 원식: heroHp / (heroHp + mobHp)
 */
export function rollFlee(
  heroHp: number,
  mobHp: number,
  rng: Rng = Math.random,
): boolean {
  if (heroHp <= 0) return false;
  if (mobHp <= 0) return true;
  const hitRate = heroHp / (heroHp + mobHp);
  return rng() < hitRate;
}

export type SleepingMobResolution = {
  actualMobId: string;
  depth: SleepDepth;
  sneakSuccessRate: number;
};

/**
 * 잠든 몹 등장 시 깨어날 실제 몹과 잠 깊이 결정 (§4-5).
 * 8종 일반 몹 중 하나를 추첨하고 활동 시간대를 대조한다.
 */
export function resolveSleepingMob(
  currentTimeOfDay: TimeOfDay,
  rng: Rng = Math.random,
): SleepingMobResolution {
  const normalMobs = MOBS.filter((m) => m.id !== 'mimic');
  const index = Math.min(
    normalMobs.length - 1,
    Math.floor(rng() * normalMobs.length),
  );
  const actualMob = normalMobs[index];

  // 자신의 활동 시간에 잠 = 선잠 (성공률 40%, 덜 강함)
  // 자신의 휴식 시간에 잠 = 깊은 잠 (성공률 70%, 더 강함)
  const isLight = actualMob.time === currentTimeOfDay;
  const depth: SleepDepth = isLight ? 'light' : 'deep';
  const sneakSuccessRate = isLight ? 0.4 : 0.7;

  return {
    actualMobId: actualMob.id,
    depth,
    sneakSuccessRate,
  };
}

/** 잠든 몹 몰래 지나가기 판정 */
export function rollSneakPast(
  sneakSuccessRate: number,
  rng: Rng = Math.random,
): boolean {
  return rng() < sneakSuccessRate;
}

