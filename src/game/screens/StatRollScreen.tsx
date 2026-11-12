import { HP_PER_POINT } from '../../config';
import type { StatRollResult } from '../gameState';

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
  const { points, heroStats } = roll;
  const total = points.hp + points.attack + points.defense;

  return (
    <section className="screen prep-screen" data-scene="stat">
      <div className="pix-bg" />
      <div className="darkwash" />

      <div className="gold-panel prep-wrap">
        <div className="prep-heading">CREATE YOUR HERO</div>
        <div className="prep-title">용사의 스탯을 정해주세요</div>
        <p className="prep-sub">HP · 공격 · 방어, 합계 30포인트 · 각 항목 최소 5</p>

        <div className="stat-cards">
          {/* 1. HP 카드 */}
          <div className="roll-card">
            <div className="ic">♥</div>
            <div className="statnum">{points.hp}</div>
            <div className="statname">HP 포인트</div>
            <div className="stat-sub">({heroStats.hp} HP · 1pt={HP_PER_POINT})</div>
          </div>

          {/* 2. 공격 카드 */}
          <div className="roll-card">
            <div className="ic">⚔</div>
            <div className="statnum">{points.attack}</div>
            <div className="statname">공격</div>
            <div className="stat-sub">기본 공격력</div>
          </div>

          {/* 3. 방어 카드 */}
          <div className="roll-card">
            <div className="ic">⬡</div>
            <div className="statnum">{points.defense}</div>
            <div className="statname">방어</div>
            <div className="stat-sub">피해 경감율</div>
          </div>
        </div>

        <div className="roll-foot">
          <div className="total">
            총합 <strong>{total}</strong>
          </div>
          <button className="light-btn" type="button" onClick={onReroll}>
            다시 굴리기 ↻
          </button>
          <button className="gold-btn" type="button" onClick={onConfirm}>
            이 스탯으로 결정
          </button>
        </div>
      </div>
    </section>
  );
}
