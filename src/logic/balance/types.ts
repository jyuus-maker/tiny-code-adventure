import type { Region } from '../../config';
import type { TimeOfDay } from '../../data/types';
import type { BattleConfig, HitGrade, ParticipantKind } from '../battle/types';

export type BattleRecord = {
  id: string;
  timestamp: number;
  configVersion: string;
  config: BattleConfig;
  region: Region;
  timeOfDay: TimeOfDay;
  mobId: string;
  mobName: string;
  encounterType: 'normal' | 'ambush' | 'sleeping';
  fled: boolean;
  winner: ParticipantKind | 'fled';
  turnCount: number;
  initialHeroHp: number;
  finalHeroHp: number;
  initialMobHp: number;
  finalMobHp: number;
  totalMobDamage: number;
  heroRemainingHpRatio: number;
  hitGradeCounts: Record<HitGrade, number>;
  counterCount: number;
  chargeAttackCount: number;
};

export type BalanceMetricSummary = {
  totalBattles: number;
  fleeCount: number;
  fleeSuccessRate: number;
  finishedBattles: number;
  heroWinRate: number;
  averageTurns: number;
  minTurns: number;
  maxTurns: number;
  turnDistribution: Record<string, number>; // "1-5", "6-10", "11-15", "16+"
  averageHeroRemainingHpRatio: number;
  hitGradeDistribution: Record<HitGrade, number>;
  averageMobDamageTaken: number;
};
