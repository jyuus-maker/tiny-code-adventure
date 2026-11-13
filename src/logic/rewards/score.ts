import {
  DEFAULT_SCORE_CONFIG,
  type ScoreBreakdown,
  type ScoreConfig,
} from './types';

export type ScoreInput = {
  /** 몹에게 준 실제 피해 총량 (오버킬 제외, 반사 피해 포함, 미믹 포함) */
  totalMobDamage: number;
  /** 선택한 스코어템 점수 (선택 시 1회 누적, 미선택 시 0) */
  scoreItemPoints: number;
  /** 미션 완료 여부 (달성 후 귀가 or 30장 완주+달성) */
  isCompleted: boolean;
  /** 의뢰 요청 개수 */
  requiredCount: number;
  /** 수집한 빛나는 미션템 수량 (초과분 포함) */
  shiningCount: number;
  /** 수집한 일반 미션템 수량 (초과분 포함) */
  normalCount: number;
  /** 수집한 부서진 미션템 수량 (초과분 포함) */
  brokenCount: number;
};

/**
 * 최종 점수 산출 순수 함수 (§4-10)
 * finalScore = totalMobDamage + scoreItemPoints + missionBonus
 * missionBonus = requiredCount * (shiningCount * x + normalCount * y + brokenCount * z) * k
 * (미완료, 사망 시 missionBonus = 0)
 */
export function calculateScore(
  input: ScoreInput,
  config: ScoreConfig = DEFAULT_SCORE_CONFIG,
): ScoreBreakdown {
  const {
    totalMobDamage,
    scoreItemPoints,
    isCompleted,
    requiredCount,
    shiningCount,
    normalCount,
    brokenCount,
  } = input;

  let missionBonus = 0;
  if (isCompleted && requiredCount > 0) {
    const qualitySum =
      shiningCount * config.shiningMultiplier +
      normalCount * config.normalMultiplier +
      brokenCount * config.brokenMultiplier;

    missionBonus = Math.round(requiredCount * qualitySum * config.conversionFactor);
  }

  const finalScore = Math.max(0, totalMobDamage + scoreItemPoints + missionBonus);

  return {
    totalMobDamage,
    scoreItemPoints,
    missionBonus,
    finalScore,
    isMissionCompleted: isCompleted ? 1 : 0,
  };
}

