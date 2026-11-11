import { runBattleSimulation } from 'd:/260630ai/preliminary-project/tiny-code-adventure/src/logic/balance/simulator';
import { DEFAULT_BATTLE_CONFIG, type BattleConfig } from 'd:/260630ai/preliminary-project/tiny-code-adventure/src/logic/battle';
import { createSeededRng } from 'd:/260630ai/preliminary-project/tiny-code-adventure/src/logic/rng';

const scales = [10, 25, 40, 60];
const defRates = [1.0, 0.7, 0.5];

console.log('=== CHK 08 피해 스케일 및 방어 계수 매트릭스 탐색 ===');
for (const rate of defRates) {
  for (const s of scales) {
    const cfg: BattleConfig = {
      ...DEFAULT_BATTLE_CONFIG,
      damageMode: 'scaled',
      damageScale: s,
      defenseRate: rate,
    };
    const res = runBattleSimulation({ battleCount: 200, config: cfg }, createSeededRng(42));
    console.log(
      `Scale=${s.toString().padStart(2)}, DefRate=${rate.toFixed(1)} -> ` +
      `평균 ${res.summary.averageTurns.toFixed(1).padStart(4)}턴 ` +
      `(최소 ${res.summary.minTurns.toString().padStart(2)}, 최대 ${res.summary.maxTurns.toString().padStart(3)}) | ` +
      `승률 ${(res.summary.heroWinRate * 100).toFixed(1).padStart(5)}% | ` +
      `1-15턴 비율: ${(((res.summary.turnDistribution['1-5'] + res.summary.turnDistribution['6-10'] + res.summary.turnDistribution['11-15']) / 200) * 100).toFixed(1)}%`
    );
  }
}

