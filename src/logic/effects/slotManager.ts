import {
  DEFAULT_EFFECT_CONFIG,
  type CombatSlotEffect,
  type EffectConfig,
  type HeroEffectState,
  type InstantVitalKind,
  type PermanentEffect,
  type VitalDurationKind,
  type VitalSlotEffect,
} from './types';
import type { HeroStats } from '../statRoll';

/** 초기 영구/임시 상태 생성 */
export function createInitialHeroEffectState(
  heroStats: HeroStats,
): HeroEffectState {
  return {
    baseAttack: heroStats.attack,
    baseDefense: heroStats.defense,
    baseMaxHp: heroStats.maxHp,
    permanentAttackBonus: 0,
    permanentDefenseBonus: 0,
    permanentHpBonus: 0,
    currentHp: heroStats.hp,
    combatSlot: null,
    vitalSlot: null,
    isDead: heroStats.hp <= 0,
  };
}

/** 현재 유효 최대 HP 계산 (스탯 하한 적용) */
export function getEffectiveMaxHp(
  state: HeroEffectState,
  config: EffectConfig = DEFAULT_EFFECT_CONFIG,
): number {
  const permMaxHp = state.baseMaxHp + state.permanentHpBonus;
  let tempDelta = 0;
  if (state.vitalSlot) {
    if (state.vitalSlot.kind === 'temp-max-hp-up') {
      tempDelta = state.vitalSlot.value;
    } else if (state.vitalSlot.kind === 'temp-max-hp-down') {
      tempDelta = -state.vitalSlot.value;
    }
  }
  return Math.max(config.statMin, permMaxHp + tempDelta);
}

/** 현재 유효 공격력 계산 (스탯 하한 적용) */
export function getEffectiveAttack(
  state: HeroEffectState,
  config: EffectConfig = DEFAULT_EFFECT_CONFIG,
): number {
  let val = state.baseAttack + state.permanentAttackBonus;
  if (state.combatSlot) {
    if (state.combatSlot.kind === 'atk-buff') {
      val += state.combatSlot.value;
    } else if (state.combatSlot.kind === 'atk-debuff') {
      val -= state.combatSlot.value;
    }
  }
  return Math.max(config.statMin, val);
}

/** 현재 유효 방어력 계산 (스탯 하한 적용) */
export function getEffectiveDefense(
  state: HeroEffectState,
  config: EffectConfig = DEFAULT_EFFECT_CONFIG,
): number {
  let val = state.baseDefense + state.permanentDefenseBonus;
  if (state.combatSlot) {
    if (state.combatSlot.kind === 'def-buff') {
      val += state.combatSlot.value;
    } else if (state.combatSlot.kind === 'def-debuff') {
      val -= state.combatSlot.value;
    }
  }
  return Math.max(config.statMin, val);
}

/** 영구 효과 적용 (슬롯 미점유, 기본값에 영구 반영) §4-7 */
export function applyPermanentEffect(
  state: HeroEffectState,
  effect: PermanentEffect,
  config: EffectConfig = DEFAULT_EFFECT_CONFIG,
): HeroEffectState {
  const next: HeroEffectState = { ...state };
  if (effect.stat === 'attack') {
    next.permanentAttackBonus += effect.value;
  } else if (effect.stat === 'defense') {
    next.permanentDefenseBonus += effect.value;
  } else if (effect.stat === 'hp') {
    next.permanentHpBonus += effect.value;
    // 영구 HP 증가 시 최대치 상승 및 현재 HP도 증가분 반영
    if (effect.value > 0 && !next.isDead) {
      const maxHp = getEffectiveMaxHp(next, config);
      next.currentHp = Math.min(maxHp, next.currentHp + effect.value);
    }
  }
  return next;
}

/**
 * 공방 슬롯 임시 효과 교체 (§4-7)
 * 교체 우선순위:
 * 1. 종류 다름: 새 효과로 무조건 교체
 * 2. 종류 같음:
 *    - 등급(강 > 약)
 *    - 같은 등급이면 절댓값 큰 효과 우선
 *    - 같은 강도면 남은 턴 갱신
 *    - 낮은 우선순위는 기존 효과 유지
 */
export function applyCombatSlotEffect(
  state: HeroEffectState,
  newEffect: CombatSlotEffect,
): HeroEffectState {
  const current = state.combatSlot;

  if (!current) {
    return { ...state, combatSlot: { ...newEffect } };
  }

  // 1. 종류가 다르면 무조건 교체
  if (current.kind !== newEffect.kind) {
    return { ...state, combatSlot: { ...newEffect } };
  }

  // 2. 같은 종류일 때 등급 비교 (강: normal > 약: broken)
  const gradeRank = (g: 'normal' | 'broken') => (g === 'normal' ? 2 : 1);
  const curGrade = gradeRank(current.grade);
  const newGrade = gradeRank(newEffect.grade);

  if (newGrade > curGrade) {
    return { ...state, combatSlot: { ...newEffect } };
  }
  if (newGrade < curGrade) {
    // 낮은 등급은 기존 유지
    return state;
  }

  // 3. 같은 등급이면 절댓값 비교
  const curAbs = Math.abs(current.value);
  const newAbs = Math.abs(newEffect.value);

  if (newAbs > curAbs) {
    return { ...state, combatSlot: { ...newEffect } };
  }
  if (newAbs < curAbs) {
    return state;
  }

  // 4. 같은 강도면 남은 턴 갱신
  return {
    ...state,
    combatSlot: {
      ...current,
      remainingTurns: newEffect.maxTurns,
      maxTurns: newEffect.maxTurns,
    },
  };
}

/**
 * 피 효과 적용 (즉시 회복/피해 또는 지속 효과) (§4-7)
 * - 즉시 효과: 슬롯 미점유, 즉시 현재 HP에 반영 (기존 지속 효과 유지)
 * - 지속 효과 (도트회복, 도트피해, 임시 최대 HP 증감): 최신 지속 효과로 교체
 * - 임시 최대 HP 증가 시 증가분만큼 현재 HP 증가
 * - 교체/감소 시 변경된 최대 HP를 초과하는 현재 HP 절삭
 * - 사망(HP 0)이면 회복으로 부활 금지
 */
export function applyVitalEffect(
  state: HeroEffectState,
  effect:
    | { kind: InstantVitalKind; name: string; value: number }
    | { kind: VitalDurationKind; name: string; value: number; duration?: number },
  config: EffectConfig = DEFAULT_EFFECT_CONFIG,
): HeroEffectState {
  // 1. 즉시 효과 (슬롯 미점유)
  if (effect.kind === 'instant-heal') {
    if (state.isDead) return state; // 부활 금지
    const maxHp = getEffectiveMaxHp(state, config);
    const nextHp = Math.min(maxHp, state.currentHp + Math.max(0, effect.value));
    return { ...state, currentHp: nextHp };
  }

  if (effect.kind === 'instant-damage') {
    const nextHp = Math.max(0, state.currentHp - Math.max(0, effect.value));
    return {
      ...state,
      currentHp: nextHp,
      isDead: nextHp <= 0,
    };
  }

  // 2. 지속 효과 (피 슬롯 최신 효과 교체)
  const duration =
    'duration' in effect && typeof effect.duration === 'number'
      ? effect.duration
      : config.vitalDuration;

  const newVitalSlot: VitalSlotEffect = {
    id: `vital-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: effect.name,
    kind: effect.kind,
    grade: 'normal',
    value: Math.max(1, effect.value),
    remainingTurns: duration,
    maxTurns: duration,
  };

  const nextState: HeroEffectState = {
    ...state,
    vitalSlot: newVitalSlot,
  };

  if (state.isDead) {
    return nextState;
  }

  const newMaxHp = getEffectiveMaxHp(nextState, config);

  if (effect.kind === 'temp-max-hp-up') {
    // 임시 최대 HP 증가 시 증가분만큼 현재 HP도 증가
    nextState.currentHp = Math.min(newMaxHp, state.currentHp + effect.value);
  } else {
    // 감소 또는 다른 지속 효과 교체로 최대 HP가 낮아진 경우 초과분 절삭
    nextState.currentHp = Math.min(newMaxHp, state.currentHp);
  }

  return nextState;
}

/**
 * 1틱 실행 (유저/몹 행동 1회 종료 시마다 호출) (§4-7)
 * - 피 슬롯의 도트 회복/피해 적용
 * - 지속시간(턴수) 1씩 차감
 * - 만료 시 슬롯 제거 및 필요 시 최대 HP 초과분 절삭
 * - HP 0 도달 시 사망 판정 (부활 불가)
 */
export function tickEffects(
  state: HeroEffectState,
  config: EffectConfig = DEFAULT_EFFECT_CONFIG,
): HeroEffectState {
  let next = { ...state };

  // 1. 도트 효과 적용
  if (next.vitalSlot && !next.isDead) {
    const maxHp = getEffectiveMaxHp(next, config);
    if (next.vitalSlot.kind === 'dot-heal') {
      next.currentHp = Math.min(maxHp, next.currentHp + next.vitalSlot.value);
    } else if (next.vitalSlot.kind === 'dot-damage') {
      next.currentHp = Math.max(0, next.currentHp - next.vitalSlot.value);
      if (next.currentHp <= 0) {
        next.isDead = true;
      }
    }
  }

  // 2. 공방 슬롯 틱 차감
  if (next.combatSlot) {
    const remaining = next.combatSlot.remainingTurns - 1;
    if (remaining <= 0) {
      next.combatSlot = null; // 만료
    } else {
      next.combatSlot = {
        ...next.combatSlot,
        remainingTurns: remaining,
      };
    }
  }

  // 3. 피 슬롯 틱 차감
  if (next.vitalSlot) {
    const remaining = next.vitalSlot.remainingTurns - 1;
    if (remaining <= 0) {
      const expiredKind = next.vitalSlot.kind;
      next.vitalSlot = null; // 만료

      // 임시 최대 HP 증가가 만료된 경우 새 최대 HP로 현재 HP 절삭
      if (expiredKind === 'temp-max-hp-up') {
        const newMaxHp = getEffectiveMaxHp(next, config);
        next.currentHp = Math.min(newMaxHp, next.currentHp);
      }
    } else {
      next.vitalSlot = {
        ...next.vitalSlot,
        remainingTurns: remaining,
      };
    }
  }

  return next;
}

