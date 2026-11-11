import { REGION_TO_LANGUAGE, type Region } from '../../config';
import type { TimeOfDay } from '../../data/types';
import {
  TOTAL_PARTICIPATION_CARDS,
  type MissionContext,
  type StatRollResult,
} from '../gameState';

const TIME_LABEL: Record<TimeOfDay, string> = { day: '낮', night: '밤' };

export type AdventureReadyScreenProps = {
  roll: StatRollResult;
  context: MissionContext;
  regionOrder: readonly Region[];
  participationCount: number;
  timeOfDay: TimeOfDay;
};

/**
 * 개발 확인용 준비 화면. 실제 게임 진행 화면(카드 길·전투·HUD·SDK)은 후속 작업에서 이 자리에 연결한다.
 * 지역 순서 표시는 개발 확인용이며 실제 플레이에 공개하는 기획이 아니다.
 */
export function AdventureReadyScreen({
  roll,
  context,
  regionOrder,
  participationCount,
  timeOfDay,
}: AdventureReadyScreenProps) {
  const { heroStats } = roll;
  const { mission, client, item } = context;
  const currentRegion = regionOrder[0];

  return (
    <div className="game-screen">
      <div className="game-ready-banner">
        [개발 확인용] 게임 진행 화면 연결 예정 — 출발 시점이 향후 SDK 세션 시작
        경계다. 아래는 현재 판의 시작 상태다.
      </div>

      <div className="game-row">
        <div className="game-panel" style={{ flex: 1 }}>
          <h3>용사</h3>
          <table className="game-stat-table">
            <tbody>
              <tr>
                <td>HP</td>
                <td className="game-num">
                  {heroStats.hp} / {heroStats.maxHp}
                </td>
              </tr>
              <tr>
                <td>공격</td>
                <td className="game-num">{heroStats.attack}</td>
              </tr>
              <tr>
                <td>방어</td>
                <td className="game-num">{heroStats.defense}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="game-panel" style={{ flex: 1 }}>
          <h3>의뢰</h3>
          <p style={{ marginTop: 8 }}>
            {client.name}: {item.name} × {mission.count}
          </p>
          <p className="game-screen-note" style={{ marginTop: 8 }}>
            미션 id: {mission.id}
          </p>
        </div>
      </div>

      <div className="game-panel">
        <h3>진행</h3>
        <p style={{ marginTop: 8 }}>
          참여 {participationCount} / {TOTAL_PARTICIPATION_CARDS} · 1일차{' '}
          {TIME_LABEL[timeOfDay]} · 현재 지역 {currentRegion} (
          {REGION_TO_LANGUAGE[currentRegion]})
        </p>
        <ul className="game-region-list" style={{ marginTop: 8 }}>
          {regionOrder.map((region, index) => (
            <li
              key={region}
              className={index === 0 ? 'game-region-current' : undefined}
            >
              {index + 1}일차 · {region} ({REGION_TO_LANGUAGE[region]})
            </li>
          ))}
        </ul>
        <p className="game-screen-note" style={{ marginTop: 8 }}>
          지역 순서는 개발 확인용 표시다.
        </p>
      </div>
    </div>
  );
}
