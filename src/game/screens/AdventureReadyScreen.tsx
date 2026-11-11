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
  /** 카드 길(모험 진행 구조)로 진입. 작업 02에서 연결 */
  onEnterAdventure: () => void;
};

/**
 * 개발 확인용 준비 화면. 출발 시점이 향후 SDK 세션 시작 경계이며,
 * 아래 버튼으로 카드 길 구조(작업 02)에 들어간다.
 * 지역 순서 표시는 개발 확인용이며 실제 플레이에 공개하는 기획이 아니다.
 */
export function AdventureReadyScreen({
  roll,
  context,
  regionOrder,
  participationCount,
  timeOfDay,
  onEnterAdventure,
}: AdventureReadyScreenProps) {
  const { heroStats } = roll;
  const { mission, client, item } = context;
  const currentRegion = regionOrder[0];

  return (
    <div className="game-screen">
      <div className="game-ready-banner">
        [개발 확인용] 출발 시점이 향후 SDK 세션 시작 경계다. 아래는 현재 판의 시작
        상태다. 카드 길로 진입하면 모험 진행 구조(작업 02)를 확인할 수 있다.
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

      <div className="game-screen-footer">
        <button
          type="button"
          className="game-button-primary"
          onClick={onEnterAdventure}
        >
          카드 길로 진입
        </button>
      </div>
    </div>
  );
}
