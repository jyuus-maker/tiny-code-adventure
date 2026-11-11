import type { Region } from '../../config';
import { MOBS } from '../../data/mobs';
import { chooseMobAction } from '../battle/mobAi';
import { createBattleState, stepBattle } from '../battle/engine';
import { createMobParticipant } from '../battle/statCalc';
import type { BattleConfig, BattleParticipantState } from '../battle/types';
import type { Rng } from '../rng';
import type { BalanceMetricSummary, BattleRecord } from './types';

export type SimulationOptions = {
  battleCount: number;
  config: BattleConfig;
  configVersion?: string;
  heroHp?: number;
  heroAtk?: number;
  heroDef?: number;
  region?: Region;
  dayIndex?: 1 | 2 | 3;
};

/**
 * 단일 모의 전투 1회 실행 (AI vs AI).
 * 플레이어는 최적 행동 휴리스틱(체력 높으면 공격/차지, 체력 낮거나 적 차지 시 방어)으로 행동.
 */
export function simulateSingleBattle(
  heroStats: { hp: number; attack: number; defense: number },
  mobId: string,
  region: Region,
  dayIndex: 1 | 2 | 3,
  config: BattleConfig,
  rng: Rng,
  configVersion = 'v1.0-sim',
): BattleRecord {
  const hero: BattleParticipantState = {
    kind: 'hero',
    id: 'hero',
    name: '용사',
    hp: heroStats.hp,
    maxHp: heroStats.hp,
    attack: heroStats.attack,
    defense: heroStats.defense,
    charged: false,
    defending: false,
    countering: false,
  };

  const mob = createMobParticipant(mobId, region, { dayIndex }, rng);
  const isAmbush = rng() < 0.3; // 70:30
  let state = createBattleState(hero, mob, isAmbush ? 'mob' : 'hero', config);

  const initialHeroHp = hero.hp;
  const initialMobHp = mob.hp;
  let steps = 0;

  while (!state.isFinished && steps < 300) {
    steps++;
    if (state.activeActor === 'hero') {
      // 용사 행동 선택: 상대가 차지 중이면 70% 확률로 방어(또는 카운터), 아니면 차지가 안 켜져있으면 25% 차지, 75% 공격
      let action: 'attack' | 'defend' | 'charge' = 'attack';
      if (state.mob.charged) {
        action = rng() < 0.75 ? 'defend' : 'attack';
      } else if (state.hero.charged) {
        action = 'attack'; // 차지 공격
      } else {
        const r = rng();
        if (r < 0.25) action = 'charge';
        else if (r < 0.35) action = 'defend';
        else action = 'attack';
      }
      state = stepBattle(state, action, rng);
    } else {
      const mobAction = chooseMobAction(state.mob, rng);
      state = stepBattle(state, mobAction, rng);
    }
  }

  const hitCounts = { miss: 0, graze: 0, normal: 0, crit: 0 };
  let counterCount = 0;
  let chargeAttackCount = 0;

  for (const h of state.history) {
    if (h.actor === 'hero') {
      hitCounts[h.hitGrade]++;
      if (h.isCountered) counterCount++;
    }
  }
  if (state.qualityLog.hasChargeCrit || state.qualityLog.hasChargeGraze) {
    chargeAttackCount++;
  }

  return {
    id: `sim-${Math.floor(rng() * 1000000)}`,
    timestamp: Date.now(),
    configVersion,
    config,
    region,
    timeOfDay: 'day',
    mobId: mob.id,
    mobName: mob.name,
    encounterType: isAmbush ? 'ambush' : 'normal',
    fled: false,
    winner: state.winner ?? 'mob',
    turnCount: state.turnCount,
    initialHeroHp,
    finalHeroHp: state.hero.hp,
    initialMobHp,
    finalMobHp: state.mob.hp,
    totalMobDamage: state.totalMobDamageTaken,
    heroRemainingHpRatio: Math.max(0, state.hero.hp) / initialHeroHp,
    hitGradeCounts: hitCounts,
    counterCount,
    chargeAttackCount,
  };
}

/**
 * N회 대량 전투 시뮬레이션 러너.
 */
export function runBattleSimulation(
  options: SimulationOptions,
  rng: Rng,
): { records: BattleRecord[]; summary: BalanceMetricSummary } {
  const records: BattleRecord[] = [];
  const heroHp = options.heroHp ?? 1000;
  const heroAtk = options.heroAtk ?? 10;
  const heroDef = options.heroDef ?? 10;
  const region = options.region ?? 'warm';
  const dayIndex = options.dayIndex ?? 1;

  const normalMobs = MOBS.filter((m) => m.id !== 'mimic');

  for (let i = 0; i < options.battleCount; i++) {
    const mob = normalMobs[i % normalMobs.length];
    const rec = simulateSingleBattle(
      { hp: heroHp, attack: heroAtk, defense: heroDef },
      mob.id,
      region,
      dayIndex,
      options.config,
      rng,
      options.configVersion ?? 'sim',
    );
    records.push(rec);
  }

  // 집계 계산
  const totalBattles = records.length;
  const finished = records.filter((r) => !r.fled);
  const heroWins = finished.filter((r) => r.winner === 'hero').length;
  const totalTurns = finished.reduce((sum, r) => sum + r.turnCount, 0);
  const minTurns = finished.length > 0 ? Math.min(...finished.map((r) => r.turnCount)) : 0;
  const maxTurns = finished.length > 0 ? Math.max(...finished.map((r) => r.turnCount)) : 0;

  const turnDist: Record<string, number> = { '1-5': 0, '6-10': 0, '11-15': 0, '16+': 0 };
  for (const r of finished) {
    if (r.turnCount <= 5) turnDist['1-5']++;
    else if (r.turnCount <= 10) turnDist['6-10']++;
    else if (r.turnCount <= 15) turnDist['11-15']++;
    else turnDist['16+']++;
  }

  const totalRemainingRatio = finished.reduce((sum, r) => sum + r.heroRemainingHpRatio, 0);
  const totalMobDamage = finished.reduce((sum, r) => sum + r.totalMobDamage, 0);

  const hitDist = { miss: 0, graze: 0, normal: 0, crit: 0 };
  for (const r of finished) {
    hitDist.miss += r.hitGradeCounts.miss;
    hitDist.graze += r.hitGradeCounts.graze;
    hitDist.normal += r.hitGradeCounts.normal;
    hitDist.crit += r.hitGradeCounts.crit;
  }

  const summary: BalanceMetricSummary = {
    totalBattles,
    fleeCount: 0,
    fleeSuccessRate: 0,
    finishedBattles: finished.length,
    heroWinRate: finished.length > 0 ? heroWins / finished.length : 0,
    averageTurns: finished.length > 0 ? totalTurns / finished.length : 0,
    minTurns,
    maxTurns,
    turnDistribution: turnDist,
    averageHeroRemainingHpRatio: finished.length > 0 ? totalRemainingRatio / finished.length : 0,
    hitGradeDistribution: hitDist,
    averageMobDamageTaken: finished.length > 0 ? totalMobDamage / finished.length : 0,
  };

  return { records, summary };
}
