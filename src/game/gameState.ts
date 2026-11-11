import { REGIONS, type Region } from '../config';
import { CLIENTS } from '../data/clients';
import { ITEMS } from '../data/items';
import { MISSIONS } from '../data/missions';
import type { Item, Mission, MissionClient, TimeOfDay } from '../data/types';
import type { Rng } from '../logic/rng';
import {
  dominantStat,
  rollStatPoints,
  toHeroStats,
  type HeroStats,
  type StatPoints,
} from '../logic/statRoll';
import {
  applyCardArrived,
  applyCardExited,
  applyCardOutcome,
  createAdventureState,
  getEnvForParticipation,
  TOTAL_PARTICIPATION_CARDS,
  type AdvancePlan,
  type AdventureStart,
  type AdventureState,
  type CardOutcome,
} from './adventure';

export { TOTAL_PARTICIPATION_CARDS };

/**
 * 판 단계.
 * 시작 흐름: title → statRoll → mission → adventureReady (작업 01)
 * 모험: adventureReady → adventure → runEnd (작업 02. runEnd는 30장 완료 개발 확인용 경계이며 엔딩이 아니다)
 */
export type GamePhase =
  | 'title'
  | 'statRoll'
  | 'mission'
  | 'adventureReady'
  | 'adventure'
  | 'runEnd';

export type StatRollResult = {
  points: StatPoints;
  heroStats: HeroStats;
  dominant: 'hp' | 'attack' | 'defense' | null;
};

export type GameState = {
  phase: GamePhase;
  /** 스탯 굴림 결과. statRoll 단계부터 존재 */
  roll: StatRollResult | null;
  /** 배정된 미션 id. mission 단계부터 존재. 한 판에 한 번만 배정 */
  missionId: string | null;
  /** 출발 시 셔플한 지역 순서(Java·JS·TS 각 1회). adventureReady 단계부터 존재 */
  regionOrder: readonly Region[] | null;
  /** 완료된 참여 카드 수. 시작 시 0 */
  participationCount: number;
  /** 현재 시간대. 시작 시 낮. 활성 카드 환경과 동기화 */
  timeOfDay: TimeOfDay;
  /** 카드 길 진행 상태. adventure 단계부터 존재 */
  adventure: AdventureState | null;
};

export function createInitialState(): GameState {
  return {
    phase: 'title',
    roll: null,
    missionId: null,
    regionOrder: null,
    participationCount: 0,
    timeOfDay: 'day',
    adventure: null,
  };
}

// ---------------------------------------------------------------------------
// 랜덤 추첨 (이벤트 핸들러에서만 호출. 렌더링·상태 갱신 함수 안에서 호출하지 않는다)
// ---------------------------------------------------------------------------

export function drawStatRoll(rng: Rng = Math.random): StatRollResult {
  const points = rollStatPoints(rng);
  return {
    points,
    heroStats: toHeroStats(points),
    dominant: dominantStat(points),
  };
}

/** MISSIONS 17개 풀에서 균등 추첨 (검증용 연결 기준. 난이도 가중치 없음) */
export function drawMissionId(rng: Rng = Math.random): string {
  const index = Math.min(
    MISSIONS.length - 1,
    Math.floor(rng() * MISSIONS.length),
  );
  return MISSIONS[index].id;
}

/** 세 지역을 중복 없이 한 번씩 셔플 (Fisher–Yates) */
export function drawRegionOrder(rng: Rng = Math.random): Region[] {
  const order = [...REGIONS];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.floor(rng() * (i + 1)));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

// ---------------------------------------------------------------------------
// 상태 전이 (순수 함수. 단계가 맞지 않으면 상태를 그대로 돌려준다 = 잘못된 전이·연타 방지)
// ---------------------------------------------------------------------------

/** title → statRoll. 첫 굴림 결과를 함께 적용 */
export function applyStartStatRoll(
  state: GameState,
  roll: StatRollResult,
): GameState {
  if (state.phase !== 'title') return state;
  return { ...state, phase: 'statRoll', roll };
}

/** statRoll 단계에서 다시 굴림 (무제한) */
export function applyReroll(state: GameState, roll: StatRollResult): GameState {
  if (state.phase !== 'statRoll') return state;
  return { ...state, roll };
}

/** statRoll → mission. 스탯 확정과 동시에 미션 1개 배정 (이후 변경 불가) */
export function applyConfirmStats(
  state: GameState,
  missionId: string,
): GameState {
  if (state.phase !== 'statRoll' || state.roll === null) return state;
  if (state.missionId !== null) return state;
  return { ...state, phase: 'mission', missionId };
}

/** mission → adventureReady. 지역 순서 확정, 참여 0, 첫 지역 낮. (향후 SDK 세션 시작 경계) */
export function applyDepart(
  state: GameState,
  regionOrder: readonly Region[],
): GameState {
  if (state.phase !== 'mission' || state.missionId === null) return state;
  if (state.regionOrder !== null) return state;
  return {
    ...state,
    phase: 'adventureReady',
    regionOrder: [...regionOrder],
    participationCount: 0,
    timeOfDay: 'day',
  };
}

// ---------------------------------------------------------------------------
// 모험(카드 길) 전이 — 작업 02
// ---------------------------------------------------------------------------

/** adventureReady → adventure. 초기 대열(활성 1 + 예고) 구성. 참여 0, 첫 지역 낮 환경 */
export function applyEnterAdventure(
  state: GameState,
  start: AdventureStart,
): GameState {
  if (state.phase !== 'adventureReady' || !state.regionOrder) return state;
  if (state.adventure !== null) return state;
  const env = getEnvForParticipation(state.participationCount, state.regionOrder);
  if (!env) return state;
  return {
    ...state,
    phase: 'adventure',
    timeOfDay: env.timeOfDay,
    adventure: createAdventureState(env, start),
  };
}

/** 전진 연출 종료 → 카드 열림 */
export function applyAdventureArrived(state: GameState): GameState {
  if (state.phase !== 'adventure' || !state.adventure) return state;
  const adventure = applyCardArrived(state.adventure);
  return adventure === state.adventure ? state : { ...state, adventure };
}

/** 결과 입력 적용. 참여 +1은 여기서 한 번만 (패스 +0). 같은 카드 재적용 불가 */
export function applyAdventureOutcome(
  state: GameState,
  outcome: CardOutcome,
): GameState {
  if (state.phase !== 'adventure' || !state.adventure) return state;
  const result = applyCardOutcome(
    state.adventure,
    outcome,
    state.participationCount,
  );
  if (result.adventure === state.adventure) return state;
  return {
    ...state,
    adventure: result.adventure,
    participationCount: state.participationCount + result.delta,
  };
}

/**
 * 후속 연결 지점(mission-return-check): 카드 결과·보상 처리 뒤, 카드가 버려지기 직전에
 * 미션 달성 여부에 따라 귀가를 묻는 자리(§4-9). 이번 작업은 항상 'continue'.
 */
export function missionReturnCheck(_state: GameState): 'continue' {
  return 'continue';
}

/**
 * 퇴장 연출 종료 → 다음 카드 활성화 또는 30장 종료(runEnd).
 * 지역/낮밤 전환은 plan.env(완료 참여 수 기준)로 이 시점에 적용된다.
 */
export function applyAdventureExited(
  state: GameState,
  plan: AdvancePlan,
): GameState {
  if (state.phase !== 'adventure' || !state.adventure) return state;
  const result = applyCardExited(state.adventure, plan);
  if (result.kind === 'ignored') return state;
  if (plan.kind === 'run-end') {
    return { ...state, phase: 'runEnd', adventure: result.adventure };
  }
  return {
    ...state,
    adventure: result.adventure,
    timeOfDay: plan.env.timeOfDay,
  };
}

// ---------------------------------------------------------------------------
// 원본 데이터 참조 (ID → 미션·의뢰자·의뢰품)
// ---------------------------------------------------------------------------

export type MissionContext = {
  mission: Mission;
  client: MissionClient;
  item: Item;
};

export function getMissionContext(missionId: string): MissionContext | null {
  const mission = MISSIONS.find((m) => m.id === missionId);
  if (!mission) return null;
  const client = CLIENTS.find((c) => c.id === mission.clientId);
  if (!client) return null;
  const item = ITEMS.find((i) => i.id === client.itemId);
  if (!item) return null;
  return { mission, client, item };
}
