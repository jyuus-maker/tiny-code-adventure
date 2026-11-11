import type { Item, MobType } from '../../data/types';
import type { ItemGrade } from '../../render/types';
import type { HitGrade, QualityLog } from '../battle/types';
import {
  DEFAULT_EFFECT_CONFIG,
  type EffectConfig,
} from '../effects/types';
import type { Rng } from '../rng';
import {
  DEFAULT_SCORE_CONFIG,
  type RewardChoicePair,
  type RewardOption,
  type ScoreConfig,
} from './types';

/**
 * 배틀 미션 미션템 품질 판정 (§4-6)
 * - 전투 중 유저 차지공격 기록:
 *   - 크리티컬만 -> 빛나는(shining)
 *   - 빗맞힘만 -> 부서진(broken)
 *   - 둘 다 있거나 둘 다 없음 -> 일반(normal) (상쇄)
 *   - 헛스윙과 카운터는 품질 기록에서 제외
 */
export function determineMissionItemQuality(log: QualityLog): ItemGrade {
  if (log.hasChargeCrit && !log.hasChargeGraze) {
    return 'shining';
  }
  if (!log.hasChargeCrit && log.hasChargeGraze) {
    return 'broken';
  }
  return 'normal';
}

/** 막타 타격 가중치 그룹 분류 (§4-6) */
export type LastHitGroup = 'group1' | 'group2' | 'group3';

export function classifyLastHit(
  lastHitGrade: HitGrade | null,
  lastActionType: 'attack' | 'counter' | 'other' | null,
  wasCharged: boolean = false,
): LastHitGroup {
  // 빗맞힘(graze)은 충전 여부 무관하게 그룹 3
  if (lastHitGrade === 'graze') {
    return 'group3';
  }

  // 크리티컬인 경우: 충전 크리티컬 또는 반격 크리티컬이면 그룹 2, 미충전 일반 공격 크리티컬이면 그룹 1
  if (lastHitGrade === 'crit') {
    if (wasCharged || lastActionType === 'counter') {
      return 'group2';
    }
    return 'group1';
  }

  // 일반 평타, 충전 평타, 일반 반격 -> 그룹 1
  return 'group1';
}

/**
 * 막타 타격 분류에 따른 보상 등급 추첨 (§4-6)
 * - 그룹 1: 빛나는 2 : 일반 5 : 부서진 3
 * - 그룹 2: 빛나는 3 : 일반 4 : 부서진 3
 * - 그룹 3: 빛나는 2 : 일반 4 : 부서진 4
 * - 미믹: 빛나는 제외 후 일반:부서진 재정규화 (5:3, 4:3, 4:4)
 */
export function rollRewardGrade(
  lastHitGrade: HitGrade | null,
  lastActionType: 'attack' | 'counter' | 'other' | null,
  wasCharged: boolean = false,
  isMimic: boolean = false,
  rng: Rng = Math.random,
): ItemGrade {
  const group = classifyLastHit(lastHitGrade, lastActionType, wasCharged);

  if (isMimic) {
    // 미믹은 빛나는 제외 (§4-6)
    let normalWeight = 5;
    let brokenWeight = 3;
    if (group === 'group2') {
      normalWeight = 4;
      brokenWeight = 3;
    } else if (group === 'group3') {
      normalWeight = 4;
      brokenWeight = 4;
    }

    const total = normalWeight + brokenWeight;
    const r = rng() * total;
    return r < normalWeight ? 'normal' : 'broken';
  }

  // 일반 몹
  let wShining = 2;
  let wNormal = 5;
  let wBroken = 3;

  if (group === 'group2') {
    wShining = 3;
    wNormal = 4;
    wBroken = 3;
  } else if (group === 'group3') {
    wShining = 2;
    wNormal = 4;
    wBroken = 4;
  }

  const total = wShining + wNormal + wBroken;
  const r = rng() * total;
  if (r < wShining) return 'shining';
  if (r < wShining + wNormal) return 'normal';
  return 'broken';
}

/** 피템 3종 옵션 정의 (§4-7) */
export function createVitalOptions(
  effectConfig: EffectConfig = DEFAULT_EFFECT_CONFIG,
): readonly RewardOption[] {
  return [
    {
      id: 'vital-instant-heal',
      name: '체력 물약',
      description: `즉시 HP ${effectConfig.instantHealValue} 회복`,
      assetId: 'item-jelly-64',
      grade: 'normal',
      type: 'vital',
      category: 'hp',
      vitalKind: 'instant-heal',
      value: effectConfig.instantHealValue,
    },
    {
      id: 'vital-dot-heal',
      name: '재생의 붕대',
      description: `행동마다 HP ${effectConfig.dotHealValue} 지속 회복 (${effectConfig.vitalDuration}턴)`,
      assetId: 'item-fox-tail-fur-64',
      grade: 'normal',
      type: 'vital',
      category: 'hp',
      vitalKind: 'dot-heal',
      value: effectConfig.dotHealValue,
      duration: effectConfig.vitalDuration,
    },
    {
      id: 'vital-temp-max-hp',
      name: '활력의 영약',
      description: `최대 HP +${effectConfig.tempMaxHpValue} 증가 (${effectConfig.vitalDuration}턴)`,
      assetId: 'item-boar-tusk-64',
      grade: 'normal',
      type: 'vital',
      category: 'hp',
      vitalKind: 'temp-max-hp-up',
      value: effectConfig.tempMaxHpValue,
      duration: effectConfig.vitalDuration,
    },
  ];
}

/**
 * 전투 승리 보상 2택 1 생성기 (§4-6)
 * - 항상 2개 중 택 1
 * - 피템은 항상 포함 (균형형은 서로 다른 피템 2종)
 * - 미믹은 스코어템 vs 피템 (상자 탐색 미션 중에는 공방 버프 vs 피템)
 */
export function generateCombatRewards(
  mobType: MobType | 'special',
  mobItem: Item | undefined,
  grade: ItemGrade,
  isBoxExploreMission: boolean = false,
  rng: Rng = Math.random,
  effectConfig: EffectConfig = DEFAULT_EFFECT_CONFIG,
  scoreConfig: ScoreConfig = DEFAULT_SCORE_CONFIG,
): RewardChoicePair {
  const vitalPool = createVitalOptions(effectConfig);

  // 1. 공격형 몹
  if (mobType === 'attack') {
    const isShining = grade === 'shining';
    const combatValue =
      grade === 'normal'
        ? effectConfig.normalCombatValue
        : effectConfig.brokenCombatValue;
    const duration =
      grade === 'normal'
        ? effectConfig.normalCombatDuration
        : effectConfig.brokenCombatDuration;

    const optionA: RewardOption = isShining
      ? {
          id: `combat-atk-shining-${Date.now()}`,
          name: `${mobItem?.name ?? '송곳니'} (빛나는)`,
          description: '공격력 영구 +1 상승 (슬롯 미점유)',
          assetId: mobItem?.assetId ?? 'item-wolf-fang-64',
          grade: 'shining',
          type: 'permanent',
          category: 'attack',
          stat: 'attack',
          value: 1,
        }
      : {
          id: `combat-atk-${grade}-${Date.now()}`,
          name: `${mobItem?.name ?? '송곳니'} (${grade === 'normal' ? '일반' : '부서진'})`,
          description: `공격력 +${combatValue} 임시 버프 (${duration}턴)`,
          assetId: mobItem?.assetId ?? 'item-wolf-fang-64',
          grade,
          type: 'combat',
          category: 'attack',
          combatKind: 'atk-buff',
          value: combatValue,
          duration,
        };

    const vitalIndex = Math.floor(rng() * vitalPool.length);
    const optionB = vitalPool[vitalIndex];

    return { optionA, optionB };
  }

  // 2. 방어형 몹
  if (mobType === 'defense') {
    const isShining = grade === 'shining';
    const combatValue =
      grade === 'normal'
        ? effectConfig.normalCombatValue
        : effectConfig.brokenCombatValue;
    const duration =
      grade === 'normal'
        ? effectConfig.normalCombatDuration
        : effectConfig.brokenCombatDuration;

    const optionA: RewardOption = isShining
      ? {
          id: `combat-def-shining-${Date.now()}`,
          name: `${mobItem?.name ?? '등껍질'} (빛나는)`,
          description: '방어력 영구 +1 상승 (슬롯 미점유)',
          assetId: mobItem?.assetId ?? 'item-shell-shard-64',
          grade: 'shining',
          type: 'permanent',
          category: 'defense',
          stat: 'defense',
          value: 1,
        }
      : {
          id: `combat-def-${grade}-${Date.now()}`,
          name: `${mobItem?.name ?? '등껍질'} (${grade === 'normal' ? '일반' : '부서진'})`,
          description: `방어력 +${combatValue} 임시 버프 (${duration}턴)`,
          assetId: mobItem?.assetId ?? 'item-shell-shard-64',
          grade,
          type: 'combat',
          category: 'defense',
          combatKind: 'def-buff',
          value: combatValue,
          duration,
        };

    const vitalIndex = Math.floor(rng() * vitalPool.length);
    const optionB = vitalPool[vitalIndex];

    return { optionA, optionB };
  }

  // 3. 균형형 몹 (서로 다른 피템 2종, 공방 버프 없음)
  if (mobType === 'hp') {
    const idxA = Math.floor(rng() * vitalPool.length);
    let idxB = (idxA + 1 + Math.floor(rng() * (vitalPool.length - 1))) % vitalPool.length;
    return {
      optionA: vitalPool[idxA],
      optionB: vitalPool[idxB],
    };
  }

  // 4. 미믹 (special)
  // 상자 탐색 미션 진행 중이면 공방 버프템 vs 피템
  if (isBoxExploreMission) {
    const isAtk = rng() < 0.5;
    const combatValue =
      grade === 'normal'
        ? effectConfig.normalCombatValue
        : effectConfig.brokenCombatValue;
    const duration =
      grade === 'normal'
        ? effectConfig.normalCombatDuration
        : effectConfig.brokenCombatDuration;

    const optionA: RewardOption = {
      id: `mimic-buff-${Date.now()}`,
      name: `${isAtk ? '공격' : '방어'}의 비약 (${grade === 'normal' ? '일반' : '부서진'})`,
      description: `${isAtk ? '공격력' : '방어력'} +${combatValue} 임시 버프 (${duration}턴)`,
      assetId: isAtk ? 'item-wolf-fang-64' : 'item-shell-shard-64',
      grade: grade === 'broken' ? 'broken' : 'normal',
      type: 'combat',
      category: isAtk ? 'attack' : 'defense',
      combatKind: isAtk ? 'atk-buff' : 'def-buff',
      value: combatValue,
      duration,
    };
    const vitalIndex = Math.floor(rng() * vitalPool.length);
    return { optionA, optionB: vitalPool[vitalIndex] };
  }

  // 미믹 일반 경로: 금빛 자물쇠(스코어템) vs 피템
  const scoreMult =
    grade === 'broken'
      ? scoreConfig.mimicGradeMultiplier.broken
      : scoreConfig.mimicGradeMultiplier.normal;
  const scoreValue = Math.round(scoreConfig.mimicBaseScore * scoreMult);

  const optionA: RewardOption = {
    id: `mimic-lock-${grade}-${Date.now()}`,
    name: `미믹의 금빛 자물쇠 (${grade === 'broken' ? '부서진' : '일반'})`,
    description: `보너스 점수 +${scoreValue}점 즉시 획득 후 소멸`,
    assetId: 'item-mimic-lock-64',
    grade: grade === 'broken' ? 'broken' : 'normal',
    type: 'score',
    category: 'score',
    value: scoreValue,
  };

  const vitalIndex = Math.floor(rng() * vitalPool.length);
  return { optionA, optionB: vitalPool[vitalIndex] };
}

