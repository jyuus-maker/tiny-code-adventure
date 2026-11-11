import { HP_PER_POINT } from '../../config';
import type { StatRollResult } from '../gameState';

/** 배분 경향 표시 (메인스펙 §4-2 유형 표) */
const DOMINANT_LABEL: Record<'hp' | 'attack' | 'defense', string> = {
  attack: '버서커형 (공격 높음)',
  defense: '탱커형 (방어 높음)',
  hp: '생존형 (HP 높음)',
};

export type StatRollScreenProps = {
  roll: StatRollResult;
  onReroll: () => void;
  onConfirm: () => void;
};

export function StatRollScreen({
  roll,
  onReroll,
  onConfirm,
}: StatRollScreenProps) {
  const { points, heroStats, dominant } = roll;
  const total = points.hp + points.attack + points.defense;

  return (
    <div className="game-screen">
      <div className="game-screen-header">
        <h2>용사의 스탯</h2>
        <span className="game-screen-note">
          총 {total}포인트 랜덤 배분 · 마음에 들 때까지 다시 굴릴 수 있다
        </span>
      </div>

      <div className="game-panel">
        <table className="game-stat-table">
          <thead>
            <tr>
              <th>스탯</th>
              <th style={{ textAlign: 'right' }}>포인트</th>
              <th style={{ textAlign: 'right' }}>실제 값</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>HP</td>
              <td className="game-num">{points.hp}</td>
              <td className="game-num">
                {heroStats.hp} / {heroStats.maxHp}
                <span className="game-screen-note">
                  {' '}
                  (1포인트 = {HP_PER_POINT} HP)
                </span>
              </td>
            </tr>
            <tr>
              <td>공격</td>
              <td className="game-num">{points.attack}</td>
              <td className="game-num">{heroStats.attack}</td>
            </tr>
            <tr>
              <td>방어</td>
              <td className="game-num">{points.defense}</td>
              <td className="game-num">{heroStats.defense}</td>
            </tr>
          </tbody>
        </table>
        <p className="game-screen-note" style={{ marginTop: 8 }}>
          배분 경향: {dominant ? DOMINANT_LABEL[dominant] : '균형 (최고 스탯 동률)'}
        </p>
      </div>

      <div className="game-screen-footer">
        <button type="button" onClick={onReroll}>
          다시 굴리기
        </button>
        <button type="button" className="game-button-primary" onClick={onConfirm}>
          이 스탯으로 확정
        </button>
      </div>
    </div>
  );
}
