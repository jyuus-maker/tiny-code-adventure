import { EVENTS } from '../data/events';
import { MOBS } from '../data/mobs';
import type { TimeOfDay } from '../data/types';
import type { Rng } from '../logic/rng';

/**
 * 카드 콘텐츠 정의 (판 안에서 추첨되는 "기본 카드").
 * - mob: 일반 몹 8종. 미믹은 독립 추첨 풀에서 제외(수상한 상자 실패 전용, §4-5).
 * - sleeping-mob: 잠든 몹 등장 방식. 정체는 공용 그림자 에셋으로 가리며 깨어날 몹 판정은 작업 03/05.
 * - event: 이벤트 6종.
 * baseId는 "같은 기본 카드 연속 출현 금지" 판정 키다.
 */
export type EncounterStyle = 'normal' | 'ambush' | 'sleeping';

export type MobCardDef = {
  kind: 'mob';
  baseId: string;
  /** 일반 몹 id. 잠든 몹은 깨어나기 전까지 null */
  mobId: string | null;
  encounter: EncounterStyle;
  name: string;
  assetId: string;
};

export type EventCardDef = {
  kind: 'event';
  baseId: string;
  eventId: string;
  name: string;
  assetId: string;
  passable: boolean;
  branch: boolean;
};

export type CardDef = MobCardDef | EventCardDef;

export const SLEEPING_MOB_BASE_ID = 'sleeping-mob';
export const MIMIC_MOB_ID = 'mimic';

/** 잠든 몹 카드 (정체 비공개). 그림은 공용 그림자 에셋 */
export const SLEEPING_MOB_CARD: MobCardDef = {
  kind: 'mob',
  baseId: SLEEPING_MOB_BASE_ID,
  mobId: null,
  encounter: 'sleeping',
  name: '잠든 무언가',
  assetId: 'event-sleeping-mob-128',
};

export const EVENT_CARDS: readonly EventCardDef[] = EVENTS.map((ev) => ({
  kind: 'event',
  baseId: ev.id,
  eventId: ev.id,
  name: ev.name,
  assetId: ev.sceneAssetId,
  passable: ev.passable,
  branch: ev.branch,
}));

/** 활동 시간대가 맞는 일반 몹 카드 (미믹 제외). 기습(ambush) 선정은 작업 03에서 다룬다 */
export function getMobCards(timeOfDay: TimeOfDay): MobCardDef[] {
  return MOBS.filter(
    (mob) => mob.id !== MIMIC_MOB_ID && mob.time === timeOfDay,
  ).map((mob) => ({
    kind: 'mob',
    baseId: mob.id,
    mobId: mob.id,
    encounter: 'normal',
    name: mob.name,
    assetId: mob.assetId,
  }));
}

/** 현재 시간대에 출현 가능한 기본 카드 풀 */
export function buildCardPool(timeOfDay: TimeOfDay): CardDef[] {
  return [...getMobCards(timeOfDay), SLEEPING_MOB_CARD, ...EVENT_CARDS];
}

/** 카드가 해당 시간대 풀에 속하는가 (환경 전환 뒤 예고 카드 적합성 검사) */
export function isCardSuitable(def: CardDef, timeOfDay: TimeOfDay): boolean {
  return buildCardPool(timeOfDay).some((c) => c.baseId === def.baseId);
}

/**
 * 추첨 가중치 입력. 기본은 전부 1(균등) — 개발 테스트 입력이며 운영 분포가 아니다.
 * 출현 비율, 희귀 제단 가중치, 잠든 몹 출현율, 미션 대상 배율(달성 전 1.5 / 후 0.5 초기값)은
 * 호출 측이 이 표를 만들어 넘기는 확장 입력으로 분리한다. 이번 작업에서는 적용하지 않는다.
 */
export type CardWeights = Readonly<Record<string, number>>;

// TEMP: 개발 테스트용 균등 가중치 (운영 출현 비율 아님)
export const DEFAULT_CARD_WEIGHTS: CardWeights = {};

export class CardPoolExhaustedError extends Error {
  constructor(excluded: readonly string[]) {
    super(
      `카드 후보 풀이 비었습니다 (제외: ${excluded.join(', ') || '없음'}). 무한 추첨 대신 오류로 중단합니다.`,
    );
    this.name = 'CardPoolExhaustedError';
  }
}

/**
 * 풀에서 가중치 추첨. excludeBaseIds(직전 카드 등)는 후보에서 뺀다.
 * 후보가 없으면 CardPoolExhaustedError. 렌더링 중 호출 금지(이벤트 핸들러 전용).
 */
export function drawCardDef(
  pool: readonly CardDef[],
  rng: Rng,
  excludeBaseIds: readonly (string | null | undefined)[] = [],
  weights: CardWeights = DEFAULT_CARD_WEIGHTS,
): CardDef {
  const excluded = excludeBaseIds.filter((id): id is string => !!id);
  const candidates = pool.filter((c) => !excluded.includes(c.baseId));
  if (candidates.length === 0) {
    throw new CardPoolExhaustedError(excluded);
  }

  const weighted = candidates.map((c) => ({
    def: c,
    w: Math.max(0, weights[c.baseId] ?? 1),
  }));
  const total = weighted.reduce((sum, x) => sum + x.w, 0);
  if (total <= 0) {
    throw new CardPoolExhaustedError(excluded);
  }

  let r = rng() * total;
  for (const { def, w } of weighted) {
    if (w <= 0) continue;
    if (r < w) return def;
    r -= w;
  }
  return weighted[weighted.length - 1].def;
}

/**
 * 연속 금지를 지키며 n장을 이어서 추첨 (출발 시 초기 대열용).
 * 각 장은 바로 앞 장과 baseId가 다르다.
 */
export function drawCardChain(
  pool: readonly CardDef[],
  rng: Rng,
  count: number,
  previousBaseId: string | null,
  weights: CardWeights = DEFAULT_CARD_WEIGHTS,
): CardDef[] {
  const chain: CardDef[] = [];
  let last = previousBaseId;
  for (let i = 0; i < count; i++) {
    const def = drawCardDef(pool, rng, [last], weights);
    chain.push(def);
    last = def.baseId;
  }
  return chain;
}
