import { useState } from 'react';
import { createSeededRng } from '../../logic/rng';
import {
  dominantStat,
  rollStatPoints,
  toHeroStats,
  type HeroStats,
  type StatPoints,
} from '../../logic/statRoll';

export function StatRollSection() {
  const [singleRoll, setSingleRoll] = useState<{
    points: StatPoints;
    heroStats: HeroStats;
    dominant: 'hp' | 'attack' | 'defense' | null;
  } | null>(null);

  const [distResult, setDistResult] = useState<{
    totalRolls: number;
    seed: number;
    stats: {
      key: 'hp' | 'attack' | 'defense';
      mean: number;
      mode: number;
      rate5: number;
      rate20: number;
      freq: Record<number, number>;
    }[];
    invariants: {
      name: string;
      pass: boolean;
      detail: string;
    }[];
    specChecks: {
      name: string;
      pass: boolean;
      detail: string;
    }[];
  } | null>(null);

  const handleRollSingle = () => {
    const points = rollStatPoints();
    const heroStats = toHeroStats(points);
    const dominant = dominantStat(points);
    setSingleRoll({ points, heroStats, dominant });
  };

  const handleRunSimulation = () => {
    const seed = 20261110;
    const TOTAL_SIM = 200_000;
    const rng = createSeededRng(seed);

    let allSum30 = true;
    let allBetween5And20 = true;

    const hpFreq: Record<number, number> = {};
    const atkFreq: Record<number, number> = {};
    const defFreq: Record<number, number> = {};

    for (let v = 5; v <= 20; v++) {
      hpFreq[v] = 0;
      atkFreq[v] = 0;
      defFreq[v] = 0;
    }

    let hpSum = 0;
    let atkSum = 0;
    let defSum = 0;

    for (let i = 0; i < TOTAL_SIM; i++) {
      const p = rollStatPoints(rng);
      if (p.hp + p.attack + p.defense !== 30) {
        allSum30 = false;
      }
      if (
        p.hp < 5 ||
        p.hp > 20 ||
        p.attack < 5 ||
        p.attack > 20 ||
        p.defense < 5 ||
        p.defense > 20
      ) {
        allBetween5And20 = false;
      }

      hpFreq[p.hp] = (hpFreq[p.hp] ?? 0) + 1;
      atkFreq[p.attack] = (atkFreq[p.attack] ?? 0) + 1;
      defFreq[p.defense] = (defFreq[p.defense] ?? 0) + 1;

      hpSum += p.hp;
      atkSum += p.attack;
      defSum += p.defense;
    }

    // 결정론적 검사: 같은 시드로 두 번 100회 굴린 결과가 같은지
    const rng1 = createSeededRng(seed);
    const rng2 = createSeededRng(seed);
    let deterministicPass = true;
    for (let i = 0; i < 100; i++) {
      const p1 = rollStatPoints(rng1);
      const p2 = rollStatPoints(rng2);
      if (
        p1.hp !== p2.hp ||
        p1.attack !== p2.attack ||
        p1.defense !== p2.defense
      ) {
        deterministicPass = false;
        break;
      }
    }

    const calcStat = (
      key: 'hp' | 'attack' | 'defense',
      sum: number,
      freq: Record<number, number>,
    ) => {
      const mean = sum / TOTAL_SIM;
      let maxCount = -1;
      let mode = 5;
      for (let v = 5; v <= 20; v++) {
        if (freq[v] > maxCount) {
          maxCount = freq[v];
          mode = v;
        }
      }
      const rate5 = (freq[5] / TOTAL_SIM) * 100;
      const rate20 = (freq[20] / TOTAL_SIM) * 100;
      return { key, mean, mode, rate5, rate20, freq };
    };

    const hpStat = calcStat('hp', hpSum, hpFreq);
    const atkStat = calcStat('attack', atkSum, atkFreq);
    const defStat = calcStat('defense', defSum, defFreq);

    const invariants = [
      {
        name: '모든 굴림의 합이 30',
        pass: allSum30,
        detail: allSum30 ? '200,000회 모두 합계 30' : '합계 30이 아닌 굴림 발생',
      },
      {
        name: '모든 스탯이 5 이상 20 이하',
        pass: allBetween5And20,
        detail: allBetween5And20
          ? '모든 스탯이 [5, 20] 범위 내'
          : '범위 벗어남 발생',
      },
      {
        name: '같은 시드로 두 번 100회 굴린 결과가 같음',
        pass: deterministicPass,
        detail: deterministicPass ? '100회 연속 완전 일치' : '결과 불일치 발생',
      },
    ];

    const meanHpPass = Math.abs(hpStat.mean - 10) <= 0.05;
    const meanAtkPass = Math.abs(atkStat.mean - 10) <= 0.05;
    const meanDefPass = Math.abs(defStat.mean - 10) <= 0.05;
    const meansPass = meanHpPass && meanAtkPass && meanDefPass;

    const modesPass =
      hpStat.mode === 9 && atkStat.mode === 9 && defStat.mode === 9;

    const rate5Pass =
      hpStat.rate5 >= 0.9 &&
      hpStat.rate5 <= 1.3 &&
      atkStat.rate5 >= 0.9 &&
      atkStat.rate5 <= 1.3 &&
      defStat.rate5 >= 0.9 &&
      defStat.rate5 <= 1.3;

    const rate20Pass =
      hpStat.rate20 <= 0.01 && atkStat.rate20 <= 0.01 && defStat.rate20 <= 0.01;

    const maxMeanDiff =
      Math.max(hpStat.mean, atkStat.mean, defStat.mean) -
      Math.min(hpStat.mean, atkStat.mean, defStat.mean);
    const meanDiffPass = maxMeanDiff <= 0.05;

    const specChecks = [
      {
        name: '평균 10 ± 0.05',
        pass: meansPass,
        detail: `HP: ${hpStat.mean.toFixed(4)}, Atk: ${atkStat.mean.toFixed(4)}, Def: ${defStat.mean.toFixed(4)}`,
      },
      {
        name: '최빈값 9',
        pass: modesPass,
        detail: `HP: ${hpStat.mode}, Atk: ${atkStat.mode}, Def: ${defStat.mode}`,
      },
      {
        name: '값 5 비율 0.9 ~ 1.3%',
        pass: rate5Pass,
        detail: `HP: ${hpStat.rate5.toFixed(3)}%, Atk: ${atkStat.rate5.toFixed(3)}%, Def: ${defStat.rate5.toFixed(3)}%`,
      },
      {
        name: '값 20 비율 0.01% 이하',
        pass: rate20Pass,
        detail: `HP: ${hpStat.rate20.toFixed(4)}%, Atk: ${atkStat.rate20.toFixed(4)}%, Def: ${defStat.rate20.toFixed(4)}%`,
      },
      {
        name: '세 스탯 평균의 최대 차이 0.05 이하',
        pass: meanDiffPass,
        detail: `최대 차이: ${maxMeanDiff.toFixed(4)}`,
      },
    ];

    setDistResult({
      totalRolls: TOTAL_SIM,
      seed,
      stats: [hpStat, atkStat, defStat],
      invariants,
      specChecks,
    });
  };

  return (
    <section
      style={{
        padding: '16px',
        border: '2px solid #6366f1',
        borderRadius: '8px',
        backgroundColor: '#fafafa',
        marginBottom: '32px',
      }}
    >
      <h2 style={{ fontSize: '20px', marginBottom: '12px', color: '#4338ca' }}>
        스탯 굴림 (src/logic/statRoll.ts)
      </h2>
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
        <button
          type="button"
          onClick={handleRollSingle}
          style={{
            padding: '8px 16px',
            fontSize: '14px',
            fontWeight: 'bold',
            backgroundColor: '#6366f1',
            color: '#ffffff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          굴리기 (단일 1회)
        </button>
        <button
          type="button"
          onClick={handleRunSimulation}
          style={{
            padding: '8px 16px',
            fontSize: '14px',
            fontWeight: 'bold',
            backgroundColor: '#059669',
            color: '#ffffff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          분포 계산 (시드 20261110, 200,000회)
        </button>
      </div>

      {singleRoll && (
        <div
          style={{
            padding: '12px',
            backgroundColor: '#ffffff',
            border: '1px solid #e0e7ff',
            borderRadius: '6px',
            marginBottom: '16px',
          }}
        >
          <h3 style={{ fontSize: '16px', marginBottom: '8px' }}>
            단일 굴림 결과
          </h3>
          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
            <div>
              <strong>StatPoints:</strong> HP {singleRoll.points.hp} / Atk{' '}
              {singleRoll.points.attack} / Def {singleRoll.points.defense} (합:{' '}
              {singleRoll.points.hp +
                singleRoll.points.attack +
                singleRoll.points.defense}
              )
            </div>
            <div>
              <strong>HeroStats:</strong> MaxHP {singleRoll.heroStats.maxHp} / HP{' '}
              {singleRoll.heroStats.hp} / Atk {singleRoll.heroStats.attack} / Def{' '}
              {singleRoll.heroStats.defense}
            </div>
            <div>
              <strong>dominantStat:</strong>{' '}
              <span
                style={{
                  fontWeight: 'bold',
                  color: singleRoll.dominant ? '#2563eb' : '#64748b',
                }}
              >
                {singleRoll.dominant ?? 'null (동점)'}
              </span>
            </div>
          </div>
        </div>
      )}

      {distResult && (
        <div>
          <h3 style={{ fontSize: '16px', marginBottom: '8px' }}>
            분포 계산 결과 ({distResult.totalRolls.toLocaleString()}회, 시드:{' '}
            {distResult.seed})
          </h3>

          {/* 불변 검사 표 */}
          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ fontSize: '14px', marginBottom: '6px' }}>
              1) 불변 검사 (Invariants)
            </h4>
            <table
              style={{
                borderCollapse: 'collapse',
                width: '100%',
                fontSize: '13px',
                backgroundColor: '#ffffff',
              }}
            >
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9' }}>
                  <th style={{ border: '1px solid #cbd5e1', padding: '6px' }}>
                    검사 항목
                  </th>
                  <th style={{ border: '1px solid #cbd5e1', padding: '6px' }}>
                    결과
                  </th>
                  <th style={{ border: '1px solid #cbd5e1', padding: '6px' }}>
                    상세
                  </th>
                </tr>
              </thead>
              <tbody>
                {distResult.invariants.map((inv) => (
                  <tr key={inv.name}>
                    <td style={{ border: '1px solid #cbd5e1', padding: '6px' }}>
                      {inv.name}
                    </td>
                    <td
                      style={{
                        border: '1px solid #cbd5e1',
                        padding: '6px',
                        fontWeight: 'bold',
                        color: inv.pass ? '#16a34a' : '#dc2626',
                        textAlign: 'center',
                        width: '90px',
                      }}
                    >
                      {inv.pass ? 'PASS' : 'FAIL'}
                    </td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '6px' }}>
                      {inv.detail}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 명세 대조 표 */}
          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ fontSize: '14px', marginBottom: '6px' }}>
              2) 명세 대조 (Spec Checks)
            </h4>
            <table
              style={{
                borderCollapse: 'collapse',
                width: '100%',
                fontSize: '13px',
                backgroundColor: '#ffffff',
              }}
            >
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9' }}>
                  <th style={{ border: '1px solid #cbd5e1', padding: '6px' }}>
                    검사 항목
                  </th>
                  <th style={{ border: '1px solid #cbd5e1', padding: '6px' }}>
                    결과
                  </th>
                  <th style={{ border: '1px solid #cbd5e1', padding: '6px' }}>
                    상세
                  </th>
                </tr>
              </thead>
              <tbody>
                {distResult.specChecks.map((sc) => (
                  <tr key={sc.name}>
                    <td style={{ border: '1px solid #cbd5e1', padding: '6px' }}>
                      {sc.name}
                    </td>
                    <td
                      style={{
                        border: '1px solid #cbd5e1',
                        padding: '6px',
                        fontWeight: 'bold',
                        color: sc.pass ? '#16a34a' : '#dc2626',
                        textAlign: 'center',
                        width: '90px',
                      }}
                    >
                      {sc.pass ? 'PASS' : 'FAIL'}
                    </td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '6px' }}>
                      {sc.detail}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 스탯별 요약 표 */}
          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ fontSize: '14px', marginBottom: '6px' }}>
              3) 스탯별 통계 요약
            </h4>
            <table
              style={{
                borderCollapse: 'collapse',
                width: '100%',
                fontSize: '13px',
                backgroundColor: '#ffffff',
                textAlign: 'center',
              }}
            >
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9' }}>
                  <th style={{ border: '1px solid #cbd5e1', padding: '6px' }}>
                    스탯
                  </th>
                  <th style={{ border: '1px solid #cbd5e1', padding: '6px' }}>
                    평균 (목표: 10)
                  </th>
                  <th style={{ border: '1px solid #cbd5e1', padding: '6px' }}>
                    최빈값 (목표: 9)
                  </th>
                  <th style={{ border: '1px solid #cbd5e1', padding: '6px' }}>
                    값 5 비율 (목표: 0.9~1.3%)
                  </th>
                  <th style={{ border: '1px solid #cbd5e1', padding: '6px' }}>
                    값 20 비율 (목표: ≤0.01%)
                  </th>
                </tr>
              </thead>
              <tbody>
                {distResult.stats.map((s) => (
                  <tr key={s.key}>
                    <td
                      style={{
                        border: '1px solid #cbd5e1',
                        padding: '6px',
                        fontWeight: 'bold',
                      }}
                    >
                      {s.key}
                    </td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '6px' }}>
                      {s.mean.toFixed(4)}
                    </td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '6px' }}>
                      {s.mode}
                    </td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '6px' }}>
                      {s.rate5.toFixed(3)}%
                    </td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '6px' }}>
                      {s.rate20.toFixed(4)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 값별(5~20) 분포 표 */}
          <div>
            <h4 style={{ fontSize: '14px', marginBottom: '6px' }}>
              4) 값별(5~20) 빈도 및 비율 표
            </h4>
            <div style={{ overflowX: 'auto' }}>
              <table
                style={{
                  borderCollapse: 'collapse',
                  width: '100%',
                  fontSize: '12px',
                  backgroundColor: '#ffffff',
                  textAlign: 'center',
                }}
              >
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9' }}>
                    <th
                      style={{
                        border: '1px solid #cbd5e1',
                        padding: '4px',
                        width: '60px',
                      }}
                    >
                      값
                    </th>
                    <th style={{ border: '1px solid #cbd5e1', padding: '4px' }}>
                      HP 빈도 (비율)
                    </th>
                    <th style={{ border: '1px solid #cbd5e1', padding: '4px' }}>
                      Attack 빈도 (비율)
                    </th>
                    <th style={{ border: '1px solid #cbd5e1', padding: '4px' }}>
                      Defense 빈도 (비율)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 16 }, (_, i) => i + 5).map((v) => {
                    const hpCnt = distResult.stats[0].freq[v] ?? 0;
                    const atkCnt = distResult.stats[1].freq[v] ?? 0;
                    const defCnt = distResult.stats[2].freq[v] ?? 0;
                    return (
                      <tr key={v}>
                        <td
                          style={{
                            border: '1px solid #cbd5e1',
                            padding: '4px',
                            fontWeight: 'bold',
                            backgroundColor: v === 9 ? '#eff6ff' : undefined,
                          }}
                        >
                          {v} {v === 9 ? '(최빈값)' : ''}
                        </td>
                        <td
                          style={{
                            border: '1px solid #cbd5e1',
                            padding: '4px',
                            backgroundColor: v === 9 ? '#eff6ff' : undefined,
                          }}
                        >
                          {hpCnt.toLocaleString()} (
                          {((hpCnt / distResult.totalRolls) * 100).toFixed(3)}
                          %)
                        </td>
                        <td
                          style={{
                            border: '1px solid #cbd5e1',
                            padding: '4px',
                            backgroundColor: v === 9 ? '#eff6ff' : undefined,
                          }}
                        >
                          {atkCnt.toLocaleString()} (
                          {((atkCnt / distResult.totalRolls) * 100).toFixed(3)}
                          %)
                        </td>
                        <td
                          style={{
                            border: '1px solid #cbd5e1',
                            padding: '4px',
                            backgroundColor: v === 9 ? '#eff6ff' : undefined,
                          }}
                        >
                          {defCnt.toLocaleString()} (
                          {((defCnt / distResult.totalRolls) * 100).toFixed(3)}
                          %)
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
