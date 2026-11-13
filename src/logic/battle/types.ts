export type HitGrade = 'miss' | 'graze' | 'normal' | 'crit';

export type ActionKind = 'attack' | 'defend' | 'charge';

export type ParticipantKind = 'hero' | 'mob';

export type HeroRole = 'attack' | 'balanced' | 'defense' | 'hp';

export type BattleConfig = {
  /** 레거시 호환용 필드 (선택적) */
  damageMode?: 'points' | 'scaled';
  damageScale?: number;
  /** 비율형 방어 공식 공격 배율 (E1: 40) */
  attackScale: number;
  /** 비율형 방어 공식 방어 계수 K (E1: 20) */
  defenseK: number;
  /** 명중 시 최소 보장 피해량 (E1: 2) */
  minDamage: number;
  /** 방어력 감소율 계수 (기본 1.0) */
  defenseRate: number;
  /** 방어 태세 시 방어력 배율 (기본 1.5) */
  defendDefMult: number;
  /** 차지 공격 배율 (E1: 2.0) */
  chargeMultiplier: number;
  /** 수동 카운터 반사 배율 (기본 1.0: 100% 반사) */
  counterMultiplier: number;
  /** 숨은 명중 스탯 기본값 (양측 동일 10, 30pt와 독립, UI 미표시) */
  accuracyStatDefault: number;
  /** 유저 기본 명중 확률 (E1: 0.95) */
  heroBaseHitRate: number;
  /** 유저 HP 손실률 명중 보정 계수 (E1: 0.20) */
  heroHpLossPenalty: number;
  /** 유저 명중률 하한 (E1: 0.65) */
  heroHitRateMin: number;
  /** 몬스터 기본 명중 확률 (E1: 0.75) */
  mobBaseHitRate: number;
  /** 몬스터 HP 손실률 명중 보정 계수 (E1: 0.20) */
  mobHpLossPenalty: number;
  /** 몬스터 명중률 하한 (E1: 0.50) */
  mobHitRateMin: number;
  /** 명중률 상한 (E1: 1.0) */
  hitRateMax: number;
  /** 타격 등급 폭 STEP (E1: 0.30 -> 0.7 / 1.0 / 1.3) */
  hitGradeStep: number;
  /** 타격 등급별 피해 배율 */
  hitMultipliers: Record<'graze' | 'normal' | 'crit', number>;
  /** 버서킹 발동 HP 비율 기준 (E1: 0.45) */
  berserkHpThreshold: number;
  /** 버서킹 확률 이동량 (E1: 0.25) */
  berserkProbShift: number;
  /** 유저 버서킹 강도 (E1: 1.0) */
  heroBerserkIntensity: number;
  /** 몬스터 버서킹 강도 (E1: 0.8) */
  monsterBerserkIntensity: number;
  /** 유저 최종 가하는 피해 보정 (E1: 1.025) */
  heroDamageMultiplier: number;
  /** 몬스터 최종 가하는 피해 보정 (E1: 0.975) */
  mobDamageMultiplier: number;
  /** 공격형 간헐적 피흡 발동 확률 (E1: 0.20) */
  lifestealProb: number;
  /** 공격형 간헐적 피흡 실제 피해 흡수율 (E1: 0.30) */
  lifestealRate: number;
  /** 방어형 간헐적 자동 카운터 발동 확률 (E1: 0.20) */
  autoCounterProb: number;
  /** 방어형 간헐적 자동 카운터 피해 배율 (E1: 1.5) */
  autoCounterMultiplier: number;
  /** 전투 승리 시 자연회복 배율 (HP 스탯 × N, E1: 20) */
  naturalRecoveryMult: number;
  /** 전투 종료 시 도트힐 활성 상태일 때 자연회복 가속 배율 (E1: 1.5) */
  dotBoostMult: number;
  /** 방어/카운터 태세 만료 정책: 자기 다음 행동 시작 시 만료 vs 상대 턴 종료 시 만료 */
  defenseExpiryPolicy: 'onNextSelfAction' | 'endOfOpponentTurn';
  /** 직접 공격으로 HP 0 도달 시 틱 실행 여부 (기본 false: 직접 사망 시 틱 스킵) */
  tickOnDirectDeath: boolean;
};

// 레거시 호환 상수 (기존 참조 보존)
export const BATTLE_DAMAGE_MULTIPLIER = 40;

// CHK08 v1.1 — 5차 E1 확정 전투 설정값
export const DEFAULT_BATTLE_CONFIG: BattleConfig = {
  damageMode: 'scaled',
  damageScale: BATTLE_DAMAGE_MULTIPLIER,
  attackScale: 40,
  defenseK: 20,
  minDamage: 2,
  defenseRate: 1.0,
  defendDefMult: 1.5,
  chargeMultiplier: 2.0,
  counterMultiplier: 1.0,
  accuracyStatDefault: 10,
  heroBaseHitRate: 0.95,
  heroHpLossPenalty: 0.2,
  heroHitRateMin: 0.65,
  mobBaseHitRate: 0.75,
  mobHpLossPenalty: 0.2,
  mobHitRateMin: 0.5,
  hitRateMax: 1.0,
  hitGradeStep: 0.3,
  hitMultipliers: { graze: 0.7, normal: 1.0, crit: 1.3 },
  berserkHpThreshold: 0.45,
  berserkProbShift: 0.25,
  heroBerserkIntensity: 1.0,
  monsterBerserkIntensity: 0.8,
  heroDamageMultiplier: 1.025,
  mobDamageMultiplier: 0.975,
  lifestealProb: 0.2,
  lifestealRate: 0.3,
  autoCounterProb: 0.2,
  autoCounterMultiplier: 1.5,
  naturalRecoveryMult: 20,
  dotBoostMult: 1.5,
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
  /** 숨은 명중 스탯 (기본 10, UI 미표시) */
  accuracy?: number;
  /** 유형 특화 및 고유 효과 판별용 역할 */
  role?: HeroRole | null;
  charged: boolean;
  defending: boolean;
  countering: boolean;
};

export type ActionResolution = {
  turnNumber: number;
  actor: ParticipantKind;
  action: ActionKind;
  wasCharged: boolean;
  hitRate: number;
  isHit: boolean;
  hitGrade: HitGrade;
  rawDamage: number;
  effectiveDamage: number;
  reflectedDamage: number;
  lifestealHealed?: number;
  autoCountered?: boolean;
  autoCounterDamage?: number;
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
  lastHitWasCharged: boolean;
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
