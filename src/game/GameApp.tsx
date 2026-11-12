import { useState } from 'react';
import type { Rng } from '../logic/rng';
import {
  drawAdventureStart,
  getEnvForParticipation,
  planAdvance,
  type CardOutcomeKind,
} from './adventure';
import { useFrameScale } from './frame';
import {
  applyAdventureArrived,
  applyAdventureExited,
  applyAdventureOutcome,
  applyConfirmStats,
  applyDepart,
  applyEnterAdventure,
  applyMissionItemCollected,
  applyMobDamageRecorded,
  applyReroll,
  applyReturnDecision,
  applyRewardChoice,
  applyStartStatRoll,
  createInitialState,
  drawMissionId,
  drawRegionOrder,
  drawStatRoll,
  getMissionContext,
  missionReturnCheck,
  setReturnPromptPending,
  type GameState,
} from './gameState';
import type { RewardOption } from '../logic/rewards/types';
import type { HeroEffectState } from '../logic/effects/types';
import type { ItemGrade } from '../render/types';
import { AdventureReadyScreen } from './screens/AdventureReadyScreen';
import { AdventureScreen } from './screens/AdventureScreen';
import { MissionScreen } from './screens/MissionScreen';
import { RunEndScreen } from './screens/RunEndScreen';
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

  const handleRestart = () => {
    setState(createInitialState());
  };

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

  // ---- 작업 02: 카드 길 ----

  const handleEnterAdventure = () => {
    const cur = state;
    if (cur.phase !== 'adventureReady' || !cur.regionOrder || cur.adventure) return;
    const env = getEnvForParticipation(cur.participationCount, cur.regionOrder);
    if (!env) return;
    const start = drawAdventureStart(env, rng);
    setState((prev) => applyEnterAdventure(prev, start));
  };

  const handleCardArrived = () => {
    setState((prev) => applyAdventureArrived(prev));
  };

  const handleCardOutcome = (kind: CardOutcomeKind) => {
    setState((prev) => applyAdventureOutcome(prev, { kind }));
  };

  const handleVictoryReward = (
    reward?: RewardOption,
    quality?: ItemGrade | null,
    damage?: number,
    finalHp?: number,
    finalEffects?: HeroEffectState | null,
  ) => {
    setState((prev) => {
      let next = prev;
      if (typeof damage === 'number' && damage > 0) {
        next = applyMobDamageRecorded(next, damage);
      }
      // 1. 전투 종료 시점의 최종 효과/HP 반영 (§4-7, I-01)
      if (finalEffects) {
        next = {
          ...next,
          heroEffects: {
            ...finalEffects,
            currentHp: finalHp !== undefined ? finalHp : finalEffects.currentHp,
          },
        };
      }
      // 2. 미션템 수집 반영 (§4-6)
      if (quality) {
        next = applyMissionItemCollected(next, quality);
      }
      // 3. 선택한 보상 적용 (최종 상태 위에 즉시 얹음) (§4-6, §4-7)
      if (reward) {
        next = applyRewardChoice(next, reward);
      }
      return next;
    });
  };

  const handleDefeat = (
    finalHp?: number,
    finalEffects?: HeroEffectState | null,
  ) => {
    setState((prev) => {
      let next = prev;
      const deadEffects: HeroEffectState = finalEffects
        ? {
            ...finalEffects,
            currentHp: finalHp !== undefined ? Math.max(0, finalHp) : 0,
            isDead: true,
          }
        : prev.heroEffects
          ? {
              ...prev.heroEffects,
              currentHp: 0,
              isDead: true,
            }
          : {
              baseAttack: prev.roll?.heroStats.attack ?? 10,
              baseDefense: prev.roll?.heroStats.defense ?? 10,
              baseMaxHp: prev.roll?.heroStats.maxHp ?? 1000,
              permanentAttackBonus: 0,
              permanentDefenseBonus: 0,
              permanentHpBonus: 0,
              currentHp: 0,
              combatSlot: null,
              vitalSlot: null,
              isDead: true,
            };

      next = {
        ...next,
        heroEffects: deadEffects,
      };

      // 참여 카운트 +1 및 카드 로그 반영 (§4-4)
      if (next.adventure) {
        next = applyAdventureOutcome(next, { kind: 'participate' });
      }

      // 전투 패배(사망) 시 정상적인 게임오버 처리 (§4-4, I-01)
      return {
        ...next,
        phase: 'runEnd',
      };
    });
  };

  const handleEffectsTick = (effects: HeroEffectState) => {
    setState((prev) => ({
      ...prev,
      heroEffects: effects,
    }));
  };

  const handleReturnDecision = (decision: 'return' | 'continue') => {
    if (decision === 'return') {
      setState((prev) => applyReturnDecision(prev, 'return'));
      return;
    }

    // decision === 'continue': 귀가 질문 닫고 다음 카드로 전진 (§4-9, I-02)
    setState((prev) => {
      const dismissed = applyReturnDecision(prev, 'continue');
      if (
        dismissed.phase !== 'adventure' ||
        !dismissed.adventure ||
        !dismissed.regionOrder
      ) {
        return dismissed;
      }
      if (dismissed.adventure.stage === 'closing') {
        const plan = planAdvance(
          dismissed.participationCount,
          dismissed.regionOrder,
          dismissed.adventure,
          rng,
        );
        return applyAdventureExited(dismissed, plan);
      }
      return dismissed;
    });
  };

  // 퇴장 연출 타이머는 closing 단계 렌더에서 걸리므로, 이 핸들러의 state는 결과 입력이 반영된 상태다.
  // 추첨(planAdvance)은 여기서 한 번 하고, 상태 갱신 함수에는 계획만 넘긴다.
  const handleCardExited = () => {
    const cur = state;
    if (cur.phase !== 'adventure' || !cur.adventure || !cur.regionOrder) return;
    if (cur.adventure.stage !== 'closing') return;

    // 후속 연결 지점: 귀가 질문(mission-return-check) (§4-9)
    // 달성 상태이고 30번째 카드가 아니면 귀가 질문 모달 대기
    if (missionReturnCheck(cur) === 'prompt-return' && !cur.returnPromptPending) {
      setState((prev) => setReturnPromptPending(prev, true));
      return;
    }

    const plan = planAdvance(
      cur.participationCount,
      cur.regionOrder,
      cur.adventure,
      rng,
    );
    setState((prev) => applyAdventureExited(prev, plan));
  };

  return (
    <div className="game-viewport">
      <div className="game-frame" style={{ transform: `scale(${scale})` }}>
        {renderScreen(state, {
          onStart: handleStart,
          onReroll: handleReroll,
          onConfirmStats: handleConfirmStats,
          onDepart: handleDepart,
          onEnterAdventure: handleEnterAdventure,
          onCardArrived: handleCardArrived,
          onCardOutcome: handleCardOutcome,
          onCardExited: handleCardExited,
          onVictoryReward: handleVictoryReward,
          onDefeat: handleDefeat,
          onEffectsTick: handleEffectsTick,
          onReturnDecision: handleReturnDecision,
          onRestart: handleRestart,
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
  onEnterAdventure: () => void;
  onCardArrived: () => void;
  onCardOutcome: (kind: CardOutcomeKind) => void;
  onCardExited: () => void;
  onVictoryReward: (
    reward?: RewardOption,
    quality?: ItemGrade | null,
    damage?: number,
    finalHp?: number,
    finalEffects?: HeroEffectState | null,
  ) => void;
  onDefeat: (
    finalHp?: number,
    finalEffects?: HeroEffectState | null,
  ) => void;
  onEffectsTick: (effects: HeroEffectState) => void;
  onReturnDecision: (decision: 'return' | 'continue') => void;
  onRestart: () => void;
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
          onEnterAdventure={handlers.onEnterAdventure}
        />
      );
    }

    case 'adventure': {
      if (!state.adventure || !state.regionOrder || !state.roll) {
        return <StateError phase={state.phase} />;
      }
      const context = state.missionId
        ? getMissionContext(state.missionId)
        : null;
      const fallbackEnv =
        getEnvForParticipation(
          Math.min(state.participationCount, 29),
          state.regionOrder,
        ) ?? null;
      if (!fallbackEnv) return <StateError phase={state.phase} />;
      return (
        <AdventureScreen
          adventure={state.adventure}
          participationCount={state.participationCount}
          heroStats={state.roll.heroStats}
          heroEffects={state.heroEffects}
          missionContext={context}
          missionInventory={state.missionInventory}
          returnPromptPending={state.returnPromptPending}
          fallbackEnv={fallbackEnv}
          onArrived={handlers.onCardArrived}
          onOutcome={handlers.onCardOutcome}
          onExited={handlers.onCardExited}
          onVictoryReward={handlers.onVictoryReward}
          onDefeat={handlers.onDefeat}
          onEffectsTick={handlers.onEffectsTick}
          onReturnDecision={handlers.onReturnDecision}
        />
      );
    }

    case 'runEnd': {
      if (!state.adventure) return <StateError phase={state.phase} />;
      const context = state.missionId
        ? getMissionContext(state.missionId)
        : null;
      return (
        <RunEndScreen
          participationCount={state.participationCount}
          adventure={state.adventure}
          heroDead={state.heroEffects?.isDead ?? false}
          totalMobDamage={state.totalMobDamage}
          scoreItemPoints={state.scoreItemPoints}
          missionContext={context}
          missionInventory={state.missionInventory}
          heroStats={state.roll?.heroStats ?? null}
          heroEffects={state.heroEffects}
          onRestart={handlers.onRestart}
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
