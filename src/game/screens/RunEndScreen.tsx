import type { AdventureState } from '../adventure';
import { TOTAL_PARTICIPATION_CARDS } from '../adventure';
import type { HeroMissionInventory, MissionContext } from '../gameState';
import type { HeroStats } from '../../logic/statRoll';
import type { HeroEffectState } from '../../logic/effects/types';

export type RunEndScreenProps = {
  participationCount: number;
  adventure: AdventureState;
  heroDead?: boolean;
  totalMobDamage?: number;
  scoreItemPoints?: number;
  missionContext?: MissionContext | null;
  missionInventory?: HeroMissionInventory;
  heroStats?: HeroStats | null;
  heroEffects?: HeroEffectState | null;
  onRestart?: () => void;
};

export function RunEndScreen({
  participationCount,
  heroDead = false,
  totalMobDamage = 0,
  scoreItemPoints = 0,
  missionContext = null,
  missionInventory = { shining: 0, normal: 0, broken: 0, totalCollected: 0 },
  heroStats = null,
  heroEffects = null,
  onRestart,
}: RunEndScreenProps) {
  const currentHp = heroEffects ? Math.max(0, heroEffects.currentHp) : heroStats ? heroStats.hp : 0;
  const isMissionCompleted = missionContext
    ? missionInventory.totalCollected >= missionContext.mission.count
    : false;

  // 점수 계산: 피해량 점수 + 스코어템 점수 + 미션 완료 보너스
  const missionBonus = isMissionCompleted
    ? (missionInventory.shining * 300 + missionInventory.normal * 150 + missionInventory.broken * 50)
    : 0;
  const totalScore = totalMobDamage + scoreItemPoints + missionBonus;

  const title = heroDead
    ? '용사 쓰러짐'
    : isMissionCompleted
      ? '모험 완료'
      : '모험 종료';

  const subText = heroDead
    ? '전투에서 힘이 다해 쓰러졌습니다.'
    : isMissionCompleted
      ? '의뢰를 무사히 완수하고 마을로 귀가했습니다.'
      : '의뢰를 완수하지 못한 채 모험을 마쳤습니다.';

  return (
    <section className="screen end-screen" data-scene="end">
      <div className="pix-bg" />
      <div className="end-wash" />

      <div className="gold-panel end-sheet">
        <div className="end-mini">ADVENTURE RESULT</div>
        <h2>{title}</h2>
        <p className="status-line">{subText}</p>

        <div className="end-score-label">TOTAL SCORE</div>
        <div className="end-score">{totalScore.toLocaleString()}</div>

        <div className="end-stats">
          <div>
            <small>몬스터에게 준 피해</small>
            <b>{totalMobDamage.toLocaleString()}</b>
          </div>
          <div>
            <small>보너스 점수</small>
            <b>{scoreItemPoints.toLocaleString()}</b>
          </div>
          <div>
            <small>참여 카드</small>
            <b>{participationCount} / {TOTAL_PARTICIPATION_CARDS}</b>
          </div>
          <div>
            <small>빛나는 / 일반 / 부서진</small>
            <b>
              {missionInventory.shining} / {missionInventory.normal} / {missionInventory.broken}
            </b>
          </div>
          <div>
            <small>최종 HP</small>
            <b>{currentHp}</b>
          </div>
          <div>
            <small>미션 달성</small>
            <b style={{ color: isMissionCompleted ? '#86efac' : '#f87171' }}>
              {isMissionCompleted ? '완료' : '미달성'}
            </b>
          </div>
        </div>

        <div className="end-action">
          <button
            className="gold-btn"
            type="button"
            onClick={onRestart ?? (() => window.location.reload())}
          >
            타이틀로 돌아가기　◆
          </button>
        </div>
      </div>
    </section>
  );
}
