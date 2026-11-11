import type { BuffStat, Item } from '../../data/types';
import type { ItemGrade } from '../../render/types';
import type {
  CombatEffectKind,
  InstantVitalKind,
  VitalDurationKind,
} from '../effects/types';

/** 전투 승리 보상 선택지 1개 */
export type RewardOption = {
  id: string;
  name: string;
  description: string;
  assetId: string;
  grade?: ItemGrade;
  type: 'combat' | 'vital' | 'score' | 'permanent';
  category: 'attack' | 'defense' | 'hp' | 'score';
  // 실제 적용 시 사용할 상세 효과 데이터
  combatKind?: CombatEffectKind;
  vitalKind?: InstantVitalKind | VitalDurationKind;
  stat?: BuffStat;
  value: number;
  duration?: number;
};

/** 2택 1 보상 쌍 */
export type RewardChoicePair = {
  optionA: RewardOption;
  optionB: RewardOption;
};

/** 미션템 수집 결과 */
export type MissionCollectResult = {
  collected: boolean;
  item: Item | null;
  quality: ItemGrade | null;
  shiningCount: number;
  normalCount: number;
  brokenCount: number;
  totalCollected: number;
  requiredCount: number;
  isComplete: boolean;
};

/** 점수 계산 설정 // TEMP (기획 미확정 조율 대상) */
export type ScoreConfig = {
  /** 빛나는 미션템 계수 x (기본: 3) // TEMP */
  shiningMultiplier: number;
  /** 일반 미션템 계수 y (기본: 2) // TEMP */
  normalMultiplier: number;
  /** 부서진 미션템 계수 z (기본: 1) // TEMP */
  brokenMultiplier: number;
  /** 미션 완료 환산계수 k (기본: 10) // TEMP */
  conversionFactor: number;
  /** 미믹 금빛 자물쇠 기준 점수 (기본: 100) // TEMP */
  mimicBaseScore: number;
  /** 미믹 금빛 자물쇠 등급 계수 // TEMP */
  mimicGradeMultiplier: {
    normal: number; // 1.0 // TEMP
    broken: number; // 0.5 // TEMP
  };
};

export const DEFAULT_SCORE_CONFIG: ScoreConfig = {
  shiningMultiplier: 3, // x // TEMP
  normalMultiplier: 2, // y // TEMP
  brokenMultiplier: 1, // z // TEMP
  conversionFactor: 10, // k // TEMP
  mimicBaseScore: 100, // // TEMP
  mimicGradeMultiplier: {
    normal: 1.0,
    broken: 0.5,
  },
};

/** 점수 세부 내역 (§4-10) */
export type ScoreBreakdown = {
  totalMobDamage: number;
  scoreItemPoints: number;
  missionBonus: number;
  finalScore: number;
  isMissionCompleted: number;
};

