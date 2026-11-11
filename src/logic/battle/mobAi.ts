import type { Rng } from '../rng';
import type { ActionKind, BattleParticipantState } from './types';

export type MobAiWeights = {
  normal: { attack: number; defend: number; charge: number };
  charged: { attack: number; defend: number };
};

// TEMP: CHK 08 몹 행동 기본 가중치
export const DEFAULT_MOB_AI_WEIGHTS: MobAiWeights = {
  normal: { attack: 60, defend: 25, charge: 15 },
  charged: { attack: 80, defend: 20 },
};

/**
 * 몹의 다음 행동 추첨 (순수 함수, Rng 주입).
 * 차지 중에는 연속 차지가 금지되므로 attack(차지공격) 또는 defend(카운터)만 선택.
 */
export function chooseMobAction(
  mob: BattleParticipantState,
  rng: Rng = Math.random,
  weights: MobAiWeights = DEFAULT_MOB_AI_WEIGHTS,
): ActionKind {
  if (mob.charged) {
    const total = weights.charged.attack + weights.charged.defend;
    const r = rng() * total;
    return r < weights.charged.attack ? 'attack' : 'defend';
  }

  const w = weights.normal;
  const total = w.attack + w.defend + w.charge;
  const r = rng() * total;
  if (r < w.attack) return 'attack';
  if (r < w.attack + w.defend) return 'defend';
  return 'charge';
}

