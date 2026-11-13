/** 공방 임시 슬롯 종류 (4가지) §4-7 */
export type CombatEffectKind = 'atk-buff' | 'def-buff' | 'atk-debuff' | 'def-debuff';

/** 피 슬롯 지속 효과 종류 (4가지) §4-7 */
export type VitalDurationKind =
  | 'dot-heal'
  | 'dot-damage'
  | 'temp-max-hp-up'
  | 'temp-max-hp-down';

/** 즉시 적용 피 효과 (슬롯 미점유) */
export type InstantVitalKind = 'instant-heal' | 'instant-damage';

/** 공방 임시 슬롯에 들어가는 효과 */
export type CombatSlotEffect = {
  id: string;
  name: string;
  kind: CombatEffectKind;
  grade: 'normal' | 'broken'; // shining은 영구 스탯으로 즉시 소비되어 슬롯 미점유
  value: number; // 증가/감소 수치 (예: +2, -2)
  remainingTurns: number;
  maxTurns: number;
};

/** 피 슬롯에 들어가는 지속 효과 */
export type VitalSlotEffect = {
  id: string;
  name: string;
  kind: VitalDurationKind;
  grade: 'normal'; // 피템은 일반 등급만 존재 (§4-6, §4-7)
  value: number; // 틱당 회복/피해량 또는 최대 HP 증감량
  remainingTurns: number;
  maxTurns: number;
};

/** 영구 효과 (슬롯 미점유, 기본 스탯에 즉시 누적) */
export type PermanentEffect = {
  stat: 'attack' | 'defense' | 'hp';
  value: number;
};

/** 용사의 실시간 효과 & 스탯 상태 */
export type HeroEffectState = {
  // 기본(영구) 스탯 포인트
  baseAttack: number;
  baseDefense: number;
  baseMaxHp: number;
  // 영구 누적분
  permanentAttackBonus: number;
  permanentDefenseBonus: number;
  permanentHpBonus: number;
  // 현재 HP
  currentHp: number;
  // 임시 공방 슬롯 (1칸)
  combatSlot: CombatSlotEffect | null;
  // 임시 피 슬롯 (1칸)
  vitalSlot: VitalSlotEffect | null;
  // 사망 여부 (HP 0 도달 시 true, 부활 금지)
  isDead: boolean;
};

/** 기본 지속시간 및 효과 수치 설정 (TEMP: 기획 미확정, 조율 가능) */
export type EffectConfig = {
  /** 강 임시 효과 지속 턴 (기본: 20턴) // TEMP */
  normalCombatDuration: number;
  /** 약 임시 효과 지속 턴 (기본: 10턴) // TEMP */
  brokenCombatDuration: number;
  /** 강 임시 공격/방어 버프 수치 (기본: +2, 최소 2) // TEMP */
  normalCombatValue: number;
  /** 약 임시 공격/방어 버프 수치 (기본: +1, 일반-1, 최소 1) // TEMP */
  brokenCombatValue: number;
  /** 피 슬롯 지속 효과 턴수 (기본: 20턴) // TEMP */
  vitalDuration: number;
  /** 즉시 회복량 (기본: 30) // TEMP */
  instantHealValue: number;
  /** 도트 회복량 (틱당 기본: 5) // TEMP */
  dotHealValue: number;
  /** 도트 피해량 (틱당 기본: 5) // TEMP */
  dotDamageValue: number;
  /** 임시 최대 HP 증가량 (기본: 50) // TEMP */
  tempMaxHpValue: number;
  /** 스탯 최소 하한선 (기본: 1) */
  statMin: number;
  /** 공격형 공격 버프 특화 보너스율 (E1: 0.25) */
  atkBuffBonusRate: number;
  /** 방어형 방어 버프 특화 보너스율 (E1: 0.60) */
  defBuffBonusRate: number;
  /** 방어형 방어 디버프 저항율 (E1: 0.65) */
  defDebuffResistRate: number;
  /** 생존형 즉시 회복 특화 보너스율 (E1: 0.35) */
  instantHealBonusRate: number;
  /** 생존형 도트힐 특화 보너스율 (E1: 0.35) */
  dotHealBonusRate: number;
};

export const DEFAULT_EFFECT_CONFIG: EffectConfig = {
  normalCombatDuration: 20, // // TEMP: 승인된 초기 가안
  brokenCombatDuration: 10, // // TEMP: 승인된 초기 가안
  normalCombatValue: 2, // // TEMP: 최소 2
  brokenCombatValue: 1, // // TEMP: 일반 - 1, 최소 1
  vitalDuration: 20, // // TEMP
  instantHealValue: 300, // E1 확정 회복량
  dotHealValue: 40, // E1 확정 도트힐 틱당 회복량
  dotDamageValue: 5, // // TEMP
  tempMaxHpValue: 50, // // TEMP
  statMin: 1,
  atkBuffBonusRate: 0.25,
  defBuffBonusRate: 0.6,
  defDebuffResistRate: 0.65,
  instantHealBonusRate: 0.35,
  dotHealBonusRate: 0.35,
};
