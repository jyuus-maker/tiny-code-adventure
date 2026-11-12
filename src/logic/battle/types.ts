export type HitGrade = 'miss' | 'graze' | 'normal' | 'crit';

export type ActionKind = 'attack' | 'defend' | 'charge';

export type ParticipantKind = 'hero' | 'mob';

export type BattleConfig = {
  /** 피해 계산 모드: 'points' (메인스펙 순수 기본식) vs 'scaled' (스케일 배율 적용식) */
  damageMode: 'points' | 'scaled';
  /** scaled 모드 시 피해 스케일 배율 (TEMP: 10) */
  damageScale: number;
  /** 명중 시 최소 보장 피해량 (기본 1) */
  minDamage: number;
  /** 방어력 감소율 계수 (기본 1.0: 공격력 - 방어력) */
  defenseRate: number;
  /** 차지 공격 배율 (메인스펙: 2배 초과 가안, 기본 2.2) */
  chargeMultiplier: number;
  /** 카운터 반사 배율 (기본 1.0: 100% 반사) */
  counterMultiplier: number;
  /** 명중률 하한 (기본 0.10) */
  hitRateMin: number;
  /** 명중률 상한 (기본 0.90) */
  hitRateMax: number;
  /** 타격 등급 추첨 가중치 (기본: 균등 1:1:1, 비교 후보: 1:2:1) */
  hitWeights: Record<'graze' | 'normal' | 'crit', number>;
  /** 타격 등급별 피해 배율 */
  hitMultipliers: Record<'graze' | 'normal' | 'crit', number>;
  /** 방어/카운터 태세 만료 정책: 자기 다음 행동 시작 시 만료 vs 상대 턴 종료 시 만료 */
  defenseExpiryPolicy: 'onNextSelfAction' | 'endOfOpponentTurn';
  /** 직접 공격으로 HP 0 도달 시 틱 실행 여부 (기본 false: 직접 사망 시 틱 스킵) */
  tickOnDirectDeath: boolean;
};

// TEMP: CHK 08 기본 테스트 설정값 (승인된 초기 가안)
export const DEFAULT_BATTLE_CONFIG: BattleConfig = {
  damageMode: 'scaled',
  damageScale: 10,
  minDamage: 1,
  defenseRate: 1.0,
  chargeMultiplier: 2.2,
  counterMultiplier: 1.0,
  hitRateMin: 0.10,
  hitRateMax: 0.90,
  hitWeights: { graze: 1, normal: 1, crit: 1 },
  hitMultipliers: { graze: 0.5, normal: 1.0, crit: 1.5 },
  defenseExpiryPolicy: 'onNextSelfAction',
  tickOnDirectDeath: false,
};

export type BattleParticipantState = {
  kind: ParticipantKind;
  id: string;
  assetId?: string;
  name: string;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  charged: boolean;
  defending: boolean;
  countering: boolean;
};

export type ActionResolution = {
  turnNumber: number;
  actor: ParticipantKind;
  action: ActionKind;
  hitRate: number;
  isHit: boolean;
  hitGrade: HitGrade;
  rawDamage: number;
  effectiveDamage: number;
  reflectedDamage: number;
  targetHpBefore: number;
  targetHpAfter: number;
  actorHpBefore: number;
  actorHpAfter: number;
  isCountered: boolean;
  targetDied: boolean;
  actorDied: boolean;
  tickExecuted: boolean;
};

/** 미션 품질 판정용 차지 명중 기록 (§4-6) */
export type QualityLog = {
  hasChargeCrit: boolean;
  hasChargeGraze: boolean;
  lastHitGrade: HitGrade | null;
  lastHitByHero: boolean;
  lastActionType: 'attack' | 'counter' | 'other' | null;
};

export type BattleState = {
  config: BattleConfig;
  hero: BattleParticipantState;
  mob: BattleParticipantState;
  turnCount: number; // 1행동 = 1턴
  activeActor: ParticipantKind;
  winner: ParticipantKind | null;
  isFinished: boolean;
  qualityLog: QualityLog;
  totalMobDamageTaken: number; // 오버킬 제외
  history: ActionResolution[];
};
