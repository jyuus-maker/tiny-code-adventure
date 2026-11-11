import type { Region } from '../config';
import type { TimeOfDay } from '../data/types';
import type { Rng } from '../logic/rng';
import {
  buildCardPool,
  drawCardChain,
  drawCardDef,
  isCardSuitable,
  type CardDef,
  type CardWeights,
  DEFAULT_CARD_WEIGHTS,
} from './cards';

/** 한 판의 참여 카드 수 (§4-1 확정) */
export const TOTAL_PARTICIPATION_CARDS = 30;
/** 낮·밤 한 구간의 참여 카드 수 (§4-1 확정: 낮 5 + 밤 5 = 하루) */
export const CARDS_PER_SEGMENT = 5;
/** 뒤쪽 예고 카드 수 (§6-1: 뒤쪽 카드 2~3장). TEMP: 3 */
export const PREVIEW_CARD_COUNT = 3;

export type DayIndex = 1 | 2 | 3;

/** 활성 카드 시점의 환경 스냅샷 */
export type CardEnv = {
  region: Region;
  timeOfDay: TimeOfDay;
  day: DayIndex;
  /** 이 구간이 시작되는 완료 참여 수 (0,5,10,…,25) */
  segmentStart: number;
};

/**
 * 완료된 참여 수 → 다음 카드의 환경.
 * 0~4 1일차 낮, 5~9 1일차 밤, 10~14 2일차 낮, 15~19 2일차 밤, 20~24 3일차 낮, 25~29 3일차 밤.
 * 30 이상이면 신규 카드 없음(null).
 */
export function getEnvForParticipation(
  completed: number,
  regionOrder: readonly Region[],
): CardEnv | null {
  if (completed < 0 || completed >= TOTAL_PARTICIPATION_CARDS) return null;
  const segment = Math.floor(completed / CARDS_PER_SEGMENT); // 0..5
  const day = (Math.floor(segment / 2) + 1) as DayIndex;
  const region = regionOrder[day - 1];
  if (!region) return null;
  return {
    region,
    timeOfDay: segment % 2 === 0 ? 'day' : 'night',
    day,
    segmentStart: segment * CARDS_PER_SEGMENT,
  };
}

/**
 * 개발 확인용 결과 입력 (실제 판정 엔진 대신 전이 검증에 쓰는 테스트 입력).
 * - pass: 패스. 참여 +0
 * - participate: 전투 진입 또는 이벤트 참여 확정. 참여 +1
 * - pass-forced-battle: 지나가기(+0) 뒤 강제 전투(+1). 출렁다리형. 같은 카드 합계 +1
 * - participate-linked-battle: 참여 실패 → 같은 카드에서 연결 전투. 수상한 상자→미믹형. 합계 +1
 */
export type CardOutcomeKind =
  | 'pass'
  | 'participate'
  | 'pass-forced-battle'
  | 'participate-linked-battle';

export type CardOutcome = {
  kind: CardOutcomeKind;
};

export function participationDelta(kind: CardOutcomeKind): 0 | 1 {
  return kind === 'pass' ? 0 : 1;
}

export function hasLinkedBattle(kind: CardOutcomeKind): boolean {
  return kind === 'pass-forced-battle' || kind === 'participate-linked-battle';
}

export type CardInstance = {
  /** 판 안에서 고유한 인스턴스 번호 */
  instanceId: number;
  def: CardDef;
  /** 활성화 시점에 고정. 예고 카드는 null */
  env: CardEnv | null;
  /** 결과 입력이 적용되었는가 (재실행 방지) */
  resolved: boolean;
  /** 참여 확정 여부 (+1 적용됨) */
  participationConfirmed: boolean;
  outcome: CardOutcome | null;
};

/** 활성 카드의 처리 단계. UI 연출은 이 단계를 보고 표현하며, 단계 전이는 규칙 상태가 소유한다 */
export type CardStage =
  | 'approach' // 대열 전진 연출 중 (입력 잠금)
  | 'open' // 카드 떠오름 + 모달 (결과 입력 가능)
  | 'closing'; // 참여 종료/패스 퇴장 연출 중 (입력 잠금)

export type CardLogEntry = {
  instanceId: number;
  baseId: string;
  env: CardEnv;
  outcome: CardOutcomeKind;
  delta: 0 | 1;
  participationAfter: number;
};

export type AdventureState = {
  nextInstanceId: number;
  active: CardInstance | null;
  preview: CardInstance[];
  stage: CardStage;
  /** 직전 활성 카드의 baseId (연속 출현 금지 기준) */
  lastBaseId: string | null;
  /** 대열 전진 횟수 (UI 소품 스크롤 동기화용) */
  advanceCount: number;
  log: CardLogEntry[];
};

// ---------------------------------------------------------------------------
// 추첨 (이벤트 핸들러 전용)
// ---------------------------------------------------------------------------

export type AdventureStart = {
  active: CardDef;
  preview: CardDef[];
};

/** 출발 시 초기 대열: 활성 1장 + 예고 PREVIEW_CARD_COUNT장. 연속 금지 적용 */
export function drawAdventureStart(
  env: CardEnv,
  rng: Rng,
  weights: CardWeights = DEFAULT_CARD_WEIGHTS,
): AdventureStart {
  const pool = buildCardPool(env.timeOfDay);
  const chain = drawCardChain(pool, rng, PREVIEW_CARD_COUNT + 1, null, weights);
  return { active: chain[0], preview: chain.slice(1) };
}

export type AdvancePlan =
  | { kind: 'run-end' }
  | {
      kind: 'next-card';
      env: CardEnv;
      /** 예고 1번 카드가 새 환경에 부적합하거나 연속 금지에 걸리면 교체 */
      replacement: CardDef | null;
      /** 대열 끝에 채울 새 예고 카드 */
      refill: CardDef;
    };

/**
 * 활성 카드 종료 후 다음 카드 계획. 추첨이 필요하므로 핸들러에서 호출하고
 * 결과를 applyCardExited에 넘긴다(상태 갱신 함수 안에서 난수 금지).
 */
export function planAdvance(
  completedParticipation: number,
  regionOrder: readonly Region[],
  adventure: AdventureState,
  rng: Rng,
  weights: CardWeights = DEFAULT_CARD_WEIGHTS,
): AdvancePlan {
  const env = getEnvForParticipation(completedParticipation, regionOrder);
  if (!env) return { kind: 'run-end' };

  const pool = buildCardPool(env.timeOfDay);
  const lastBaseId = adventure.active?.def.baseId ?? adventure.lastBaseId;
  const next = adventure.preview[0];
  const after = adventure.preview[1];

  let replacement: CardDef | null = null;
  if (
    !next ||
    !isCardSuitable(next.def, env.timeOfDay) ||
    next.def.baseId === lastBaseId
  ) {
    replacement = drawCardDef(
      pool,
      rng,
      [lastBaseId, after?.def.baseId],
      weights,
    );
  }

  const tailBaseId =
    adventure.preview[adventure.preview.length - 1]?.def.baseId ??
    replacement?.baseId ??
    lastBaseId;
  const refill = drawCardDef(pool, rng, [tailBaseId], weights);

  return { kind: 'next-card', env, replacement, refill };
}

// ---------------------------------------------------------------------------
// 순수 전이 (단계가 맞지 않으면 상태 그대로 반환)
// ---------------------------------------------------------------------------

function makeInstance(
  id: number,
  def: CardDef,
  env: CardEnv | null,
): CardInstance {
  return {
    instanceId: id,
    def,
    env,
    resolved: false,
    participationConfirmed: false,
    outcome: null,
  };
}

/** 출발 직후 초기 대열 구성. 활성 카드는 approach 단계로 시작 */
export function createAdventureState(
  env: CardEnv,
  start: AdventureStart,
): AdventureState {
  let id = 1;
  const active = makeInstance(id++, start.active, env);
  const preview = start.preview.map((def) => makeInstance(id++, def, null));
  return {
    nextInstanceId: id,
    active,
    preview,
    stage: 'approach',
    lastBaseId: null,
    advanceCount: 0,
    log: [],
  };
}

/** 전진 연출 종료 → open */
export function applyCardArrived(adv: AdventureState): AdventureState {
  if (adv.stage !== 'approach' || !adv.active) return adv;
  return { ...adv, stage: 'open' };
}

export type OutcomeResult = {
  adventure: AdventureState;
  /** 참여 수 증가분 */
  delta: 0 | 1;
};

/**
 * 결과 입력 적용 → closing. 같은 카드에 두 번 적용되지 않는다.
 * 참여 +1은 여기서 한 번만 확정한다. 환경 전환·30장 종료는 applyCardExited에서 처리한다.
 */
export function applyCardOutcome(
  adv: AdventureState,
  outcome: CardOutcome,
  participationBefore: number,
): OutcomeResult {
  const card = adv.active;
  if (adv.stage !== 'open' || !card || card.resolved || !card.env) {
    return { adventure: adv, delta: 0 };
  }
  const delta = participationDelta(outcome.kind);
  const resolved: CardInstance = {
    ...card,
    resolved: true,
    participationConfirmed: delta === 1,
    outcome,
  };
  const entry: CardLogEntry = {
    instanceId: card.instanceId,
    baseId: card.def.baseId,
    env: card.env,
    outcome: outcome.kind,
    delta,
    participationAfter: participationBefore + delta,
  };
  return {
    adventure: {
      ...adv,
      active: resolved,
      stage: 'closing',
      log: [...adv.log, entry],
    },
    delta,
  };
}

export type ExitResult =
  | { kind: 'next-card'; adventure: AdventureState }
  | { kind: 'run-end'; adventure: AdventureState }
  | { kind: 'ignored'; adventure: AdventureState };

/**
 * 퇴장 연출 종료 → 다음 카드 활성화(approach) 또는 30장 종료.
 * 후속 연결 지점: mission-return-check(귀가 질문)는 이 함수 호출 전에, run-end는 'run-end' 분기에 연결한다.
 */
export function applyCardExited(
  adv: AdventureState,
  plan: AdvancePlan,
): ExitResult {
  if (adv.stage !== 'closing' || !adv.active || !adv.active.resolved) {
    return { kind: 'ignored', adventure: adv };
  }
  const lastBaseId = adv.active.def.baseId;

  if (plan.kind === 'run-end') {
    return {
      kind: 'run-end',
      adventure: {
        ...adv,
        active: null,
        stage: 'closing',
        lastBaseId,
      },
    };
  }

  let id = adv.nextInstanceId;
  const [nextRaw, ...rest] = adv.preview;
  const nextDef = plan.replacement ?? nextRaw?.def;
  if (!nextDef) {
    return { kind: 'ignored', adventure: adv };
  }
  const nextActive = plan.replacement
    ? makeInstance(id++, plan.replacement, plan.env)
    : { ...nextRaw, env: plan.env };
  const refill = makeInstance(id++, plan.refill, null);

  return {
    kind: 'next-card',
    adventure: {
      ...adv,
      nextInstanceId: id,
      active: nextActive,
      preview: [...rest, refill],
      stage: 'approach',
      lastBaseId,
      advanceCount: adv.advanceCount + 1,
    },
  };
}
