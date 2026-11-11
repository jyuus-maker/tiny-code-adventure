import { useState } from 'react';
import type { Rng } from '../logic/rng';
import { useFrameScale } from './frame';
import {
  applyConfirmStats,
  applyDepart,
  applyReroll,
  applyStartStatRoll,
  createInitialState,
  drawMissionId,
  drawRegionOrder,
  drawStatRoll,
  getMissionContext,
  type GameState,
} from './gameState';
import { AdventureReadyScreen } from './screens/AdventureReadyScreen';
import { MissionScreen } from './screens/MissionScreen';
import { StatRollScreen } from './screens/StatRollScreen';
import { TitleScreen } from './screens/TitleScreen';
import './game.css';

export type GameAppProps = {
  /** 난수 공급원. 기본 Math.random. 검증 시 시드 난수를 주입할 수 있다 */
  rng?: Rng;
};

/**
 * 판 상태의 단일 소유자. 랜덤 추첨은 이벤트 핸들러에서 한 번만 수행하고,
 * 상태 갱신 함수(apply*)는 순수 함수라 StrictMode의 중복 호출에도 결과가 같다.
 */
export function GameApp({ rng = Math.random }: GameAppProps) {
  const [state, setState] = useState<GameState>(createInitialState);
  const scale = useFrameScale();

  const handleStart = () => {
    const roll = drawStatRoll(rng);
    setState((prev) => applyStartStatRoll(prev, roll));
  };

  const handleReroll = () => {
    const roll = drawStatRoll(rng);
    setState((prev) => applyReroll(prev, roll));
  };

  const handleConfirmStats = () => {
    const missionId = drawMissionId(rng);
    setState((prev) => applyConfirmStats(prev, missionId));
  };

  const handleDepart = () => {
    const regionOrder = drawRegionOrder(rng);
    setState((prev) => applyDepart(prev, regionOrder));
  };

  return (
    <div className="game-viewport">
      <div className="game-frame" style={{ transform: `scale(${scale})` }}>
        {renderScreen(state, {
          onStart: handleStart,
          onReroll: handleReroll,
          onConfirmStats: handleConfirmStats,
          onDepart: handleDepart,
        })}
      </div>
    </div>
  );
}

type ScreenHandlers = {
  onStart: () => void;
  onReroll: () => void;
  onConfirmStats: () => void;
  onDepart: () => void;
};

function renderScreen(state: GameState, handlers: ScreenHandlers) {
  switch (state.phase) {
    case 'title':
      return <TitleScreen onStart={handlers.onStart} />;

    case 'statRoll':
      if (!state.roll) return <StateError phase={state.phase} />;
      return (
        <StatRollScreen
          roll={state.roll}
          onReroll={handlers.onReroll}
          onConfirm={handlers.onConfirmStats}
        />
      );

    case 'mission': {
      const context = state.missionId
        ? getMissionContext(state.missionId)
        : null;
      if (!context) return <StateError phase={state.phase} />;
      return <MissionScreen context={context} onDepart={handlers.onDepart} />;
    }

    case 'adventureReady': {
      const context = state.missionId
        ? getMissionContext(state.missionId)
        : null;
      if (!state.roll || !context || !state.regionOrder) {
        return <StateError phase={state.phase} />;
      }
      return (
        <AdventureReadyScreen
          roll={state.roll}
          context={context}
          regionOrder={state.regionOrder}
          participationCount={state.participationCount}
          timeOfDay={state.timeOfDay}
        />
      );
    }
  }
}

function StateError({ phase }: { phase: string }) {
  return (
    <div className="game-screen">
      <p>판 상태가 올바르지 않습니다 (phase: {phase}).</p>
    </div>
  );
}
