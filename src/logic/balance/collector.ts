import type { BalanceMetricSummary, BattleRecord } from './types';

class BalanceAnalyticsCollector {
  private enabled = true;
  private records: BattleRecord[] = [];

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setEnabled(val: boolean): void {
    this.enabled = val;
  }

  public record(battle: BattleRecord): void {
    if (!this.enabled) return;
    this.records.push(battle);
  }

  public getRecords(): readonly BattleRecord[] {
    return this.records;
  }

  public clear(): void {
    this.records = [];
  }

  public getSummary(filterConfigVersion?: string): BalanceMetricSummary {
    const target = filterConfigVersion
      ? this.records.filter((r) => r.configVersion === filterConfigVersion)
      : this.records;

    if (target.length === 0) {
      return {
        totalBattles: 0,
        fleeCount: 0,
        fleeSuccessRate: 0,
        finishedBattles: 0,
        heroWinRate: 0,
        averageTurns: 0,
        minTurns: 0,
        maxTurns: 0,
        turnDistribution: { '1-5': 0, '6-10': 0, '11-15': 0, '16+': 0 },
        averageHeroRemainingHpRatio: 0,
        hitGradeDistribution: { miss: 0, graze: 0, normal: 0, crit: 0 },
        averageMobDamageTaken: 0,
      };
    }

    const totalBattles = target.length;
    const fleeCount = target.filter((r) => r.fled).length;
    const finished = target.filter((r) => !r.fled);
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

    return {
      totalBattles,
      fleeCount,
      fleeSuccessRate: totalBattles > 0 ? fleeCount / totalBattles : 0,
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
  }
}

// 개발 런타임 메모리 단일 수집기 (브라우저 저장소 미사용)
export const analyticsCollector = new BalanceAnalyticsCollector();

