import type { Rng } from '../rng';
import type { ActionKind, BattleParticipantState } from './types';

export type MobAiWeights = {
  normal: { attack: number; defend: number; charge: number };
  charged: { attack: number; defend: number };
};

// CHK08 v1.1 기본 몹 행동 가중치
export const DEFAULT_MOB_AI_WEIGHTS: MobAiWeights = {
  normal: { attack: 50, defend: 50, charge: 16 },
  charged: { attack: 80, defend: 20 },
};

export const REGION_CHARGE_RATE: Record<1 | 2 | 3, number> = {
  1: 0.06,
  2: 0.16,
  3: 0.35,
};

export const REGION_CHARGE_CAP: Record<1 | 2 | 3, number> = {
  1: 1,
  2: 3,
  3: Number.POSITIVE_INFINITY,
};

export type MobAiOptions = {
  dayIndex?: 1 | 2 | 3;
  chargeUsedCount?: number;
};

/**
 * 몹의 다음 행동 추첨 (순수 함수, Rng 주입).
 * - 차지 중에는 연속 차지가 금지되므로 attack(차지공격) 또는 defend(카운터)만 선택 (80:20).
 * - 유형별 기본 공격:방어 비율: 공격형 60:40, 균형형 50:50, 방어형 40:60.
 * - 지역(일차)별 차지 빈도: 1지역 6%(상한1), 2지역 16%(상한3), 3지역 35%(무제한).
 */
export function chooseMobAction(
  mob: BattleParticipantState,
  rng: Rng = Math.random,
  weights: MobAiWeights = DEFAULT_MOB_AI_WEIGHTS,
  options: MobAiOptions = {},
): ActionKind {
  if (mob.charged) {
    const total = weights.charged.attack + weights.charged.defend;
    const r = rng() * total;
    return r < weights.charged.attack ? 'attack' : 'defend';
  }

  const dayIndex = options.dayIndex ?? 2;
  const chargeUsed = options.chargeUsedCount ?? 0;
  const canCharge = chargeUsed < REGION_CHARGE_CAP[dayIndex];
  const chargeProb = canCharge ? REGION_CHARGE_RATE[dayIndex] : 0;

  const r = rng();
  if (r < chargeProb) return 'charge';

  const atkRatio =
    mob.role === 'attack' ? 0.6 : mob.role === 'defense' ? 0.4 : 0.5;
  const rem = (r - chargeProb) / Math.max(1e-6, 1 - chargeProb);
  return rem < atkRatio ? 'attack' : 'defend';
}
