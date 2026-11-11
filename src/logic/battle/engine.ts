import type { Rng } from '../rng';
import {
  DEFAULT_BATTLE_CONFIG,
  type ActionKind,
  type ActionResolution,
  type BattleConfig,
  type BattleParticipantState,
  type BattleState,
  type HitGrade,
  type ParticipantKind,
  type QualityLog,
} from './types';

/**
 * 명중률 계산 (§4-3, §4-4).
 * 원식: 자기 현재 HP / (유저 현재 HP + 몹 현재 HP).
 * 상하한 clamp 적용 시 유저 명중률과 몹 명중률의 합이 1인 보완 관계를 유지한다.
 */
export function computeHitRate(
  actorHp: number,
  targetHp: number,
  config: BattleConfig = DEFAULT_BATTLE_CONFIG,
): number {
  if (actorHp <= 0) return 0;
  if (targetHp <= 0) return 1;
  const raw = actorHp / (actorHp + targetHp);
  return Math.min(config.hitRateMax, Math.max(config.hitRateMin, raw));
}

/**
 * 타격 등급 추첨 (§4-4).
 * 명중 시 빗맞힘(0.5배) / 평타(1.0배) / 크리티컬(1.x배).
 */
export function resolveHitGrade(
  isHit: boolean,
  rng: Rng,
  config: BattleConfig = DEFAULT_BATTLE_CONFIG,
): HitGrade {
  if (!isHit) return 'miss';

  const w = config.hitWeights;
  const total = w.graze + w.normal + w.crit;
  const r = rng() * total;
  if (r < w.graze) return 'graze';
  if (r < w.graze + w.normal) return 'normal';
  return 'crit';
}

/**
 * 기본 피해량 계산식 (§4-4).
 * (공격력 - 방어력 * 방어감소율) × 등급 배율 × 차지 배율. 명중 시 최소 피해 1.
 */
export function calculateDamage(
  attackerAtk: number,
  defenderDef: number,
  hitGrade: HitGrade,
  isCharged: boolean,
  isDefending: boolean,
  config: BattleConfig = DEFAULT_BATTLE_CONFIG,
): number {
  if (hitGrade === 'miss') return 0;

  const gradeMult = config.hitMultipliers[hitGrade];
  const chargeMult = isCharged ? config.chargeMultiplier : 1.0;
  // 방어 태세 시 방어력 1.5배 적용 (TEMP)
  const effectiveDef = defenderDef * config.defenseRate * (isDefending ? 1.5 : 1.0);
  const baseDiff = Math.max(0.1, attackerAtk - effectiveDef);

  if (config.damageMode === 'scaled') {
    return Math.max(
      config.minDamage,
      Math.round(baseDiff * config.damageScale * gradeMult * chargeMult),
    );
  }

  // points 기본 모드 (메인스펙 순수 기본식)
  return Math.max(
    config.minDamage,
    Math.round(baseDiff * gradeMult * chargeMult),
  );
}

/**
 * 카운터 반사 피해 계산 (§4-4).
 * 공격한 쪽이 자기 공격을 자기 방어력으로 받음.
 * 반사량 = (공격자의 공격력 - 공격자 자신의 방어력) × 등급 배율 × (차지 배율).
 */
export function calculateCounterReflection(
  attackerAtk: number,
  attackerDef: number,
  hitGrade: HitGrade,
  isCharged: boolean,
  config: BattleConfig = DEFAULT_BATTLE_CONFIG,
): number {
  if (hitGrade === 'miss') return 0;
  const gradeMult = config.hitMultipliers[hitGrade];
  const chargeMult = isCharged ? config.chargeMultiplier : 1.0;
  const baseDiff = Math.max(0.1, attackerAtk - attackerDef * config.defenseRate);

  if (config.damageMode === 'scaled') {
    return Math.max(
      config.minDamage,
      Math.round(baseDiff * config.damageScale * gradeMult * chargeMult * config.counterMultiplier),
    );
  }

  return Math.max(
    config.minDamage,
    Math.round(baseDiff * gradeMult * chargeMult * config.counterMultiplier),
  );
}

export function createInitialQualityLog(): QualityLog {
  return {
    hasChargeCrit: false,
    hasChargeGraze: false,
    lastHitGrade: null,
    lastHitByHero: false,
    lastActionType: null,
  };
}

export function createBattleState(
  hero: BattleParticipantState,
  mob: BattleParticipantState,
  firstActor: ParticipantKind,
  config: BattleConfig = DEFAULT_BATTLE_CONFIG,
): BattleState {
  return {
    config,
    hero: { ...hero, kind: 'hero' },
    mob: { ...mob, kind: 'mob' },
    turnCount: 0,
    activeActor: firstActor,
    winner: null,
    isFinished: false,
    qualityLog: createInitialQualityLog(),
    totalMobDamageTaken: 0,
    history: [],
  };
}

/** 행동 주체가 선택 가능한 행동 목록 */
export function getAvailableActions(participant: BattleParticipantState): ActionKind[] {
  if (participant.charged) {
    // 차지 중에는 차지공격(attack) 또는 카운터(defend)만 선택 가능 (연속 차지 금지, §4-4)
    return ['attack', 'defend'];
  }
  return ['attack', 'defend', 'charge'];
}

/**
 * 1턴(1행동 = 1턴 = 1틱) 실행 순수 함수.
 * 매 행동 종료 시 틱 처리 및 HP 갱신, 다음 턴 상태를 반환한다.
 */
export function stepBattle(
  state: BattleState,
  action: ActionKind,
  rng: Rng = Math.random,
): BattleState {
  if (state.isFinished) return state;

  const isHeroTurn = state.activeActor === 'hero';
  let actor = isHeroTurn ? { ...state.hero } : { ...state.mob };
  let defender = isHeroTurn ? { ...state.mob } : { ...state.hero };
  const config = state.config;
  const turnNumber = state.turnCount + 1;

  // 1. 자기 차례 시작 시 이전 차례의 방어/카운터 태세 만료 처리
  if (config.defenseExpiryPolicy === 'onNextSelfAction') {
    actor.defending = false;
    actor.countering = false;
  }

  let isHit = false;
  let hitGrade: HitGrade = 'miss';
  let rawDamage = 0;
  let effectiveDamage = 0;
  let reflectedDamage = 0;
  let isCountered = false;

  const targetHpBefore = defender.hp;
  const actorHpBefore = actor.hp;
  const wasCharged = actor.charged;

  // 2. 행동 실행
  if (action === 'charge') {
    actor.charged = true;
    actor.defending = false;
    actor.countering = false;
  } else if (action === 'defend') {
    if (wasCharged) {
      // 차지 상태에서 방어 = 카운터 패링 태세 (§4-4)
      actor.countering = true;
      actor.defending = false;
      actor.charged = false; // 차지는 소비됨
    } else {
      // 일반 방어 태세
      actor.defending = true;
      actor.countering = false;
    }
  } else if (action === 'attack') {
    // 공격 실행 시 차지는 소비됨
    if (wasCharged) {
      actor.charged = false;
    }

    const hitRate = computeHitRate(actor.hp, defender.hp, config);
    isHit = rng() < hitRate;
    hitGrade = resolveHitGrade(isHit, rng, config);

    if (defender.countering) {
      // 상대가 카운터 태세인 경우: 패링 100%, 공격자가 반사 피해를 받음 (§4-4)
      isCountered = true;
      defender.countering = false; // 카운터 소비
      rawDamage = 0;
      effectiveDamage = 0;

      if (isHit) {
        const rawReflected = calculateCounterReflection(
          actor.attack,
          actor.defense,
          hitGrade,
          wasCharged,
          config,
        );
        reflectedDamage = Math.min(actor.hp, rawReflected);
        actor.hp = Math.max(0, actor.hp - reflectedDamage);
      }
    } else {
      // 일반 피격
      if (isHit) {
        rawDamage = calculateDamage(
          actor.attack,
          defender.defense,
          hitGrade,
          wasCharged,
          defender.defending,
          config,
        );
        effectiveDamage = Math.min(defender.hp, rawDamage);
        defender.hp = Math.max(0, defender.hp - effectiveDamage);

        // 방어 적용 후 방어 태세 소비
        if (defender.defending) {
          defender.defending = false;
        }
      }
    }
  }

  // 3. 상대 턴 종료 시 방어 만료 정책 처리
  if (config.defenseExpiryPolicy === 'endOfOpponentTurn') {
    defender.defending = false;
    defender.countering = false;
  }

  // 4. 피해 및 점수 누적 (오버킬 제외)
  let totalMobDamageTaken = state.totalMobDamageTaken;
  if (defender.kind === 'mob') {
    totalMobDamageTaken += effectiveDamage;
  }
  if (actor.kind === 'mob') {
    totalMobDamageTaken += reflectedDamage;
  }

  // 5. 미션 품질 및 막타 기록 갱신 (§4-6)
  const qualityLog: QualityLog = { ...state.qualityLog };
  if (isHeroTurn && action === 'attack' && wasCharged && isHit && !isCountered) {
    if (hitGrade === 'crit') qualityLog.hasChargeCrit = true;
    if (hitGrade === 'graze') qualityLog.hasChargeGraze = true;
  }
  if (isHit && effectiveDamage > 0) {
    qualityLog.lastHitGrade = hitGrade;
    qualityLog.lastHitByHero = isHeroTurn;
    qualityLog.lastActionType = 'attack';
  } else if (isCountered && reflectedDamage > 0) {
    qualityLog.lastHitGrade = hitGrade;
    qualityLog.lastHitByHero = !isHeroTurn; // 반사는 카운터를 친 쪽의 유효타
    qualityLog.lastActionType = 'counter';
  }

  // 6. 사망 및 틱 처리
  const targetDied = defender.hp <= 0;
  const actorDied = actor.hp <= 0;
  let tickExecuted = false;

  if (!targetDied && !actorDied) {
    // 직접 사망이 아닌 경우 행동 종료 틱 1회 실행
    tickExecuted = true;
    // (향후 작업 04 도트 효과 연결 지점)
  } else if (config.tickOnDirectDeath) {
    tickExecuted = true;
  }

  // 승패 결정
  let winner: ParticipantKind | null = null;
  let isFinished = false;

  const finalHeroHp = isHeroTurn ? actor.hp : defender.hp;
  const finalMobHp = isHeroTurn ? defender.hp : actor.hp;

  if (finalHeroHp <= 0) {
    // 용사 사망 시 몹 승리 (동시 사망 시에도 용사 사망 판정 우선)
    winner = 'mob';
    isFinished = true;
  } else if (finalMobHp <= 0) {
    winner = 'hero';
    isFinished = true;
  }

  const resolution: ActionResolution = {
    turnNumber,
    actor: state.activeActor,
    action,
    hitRate: computeHitRate(actorHpBefore, targetHpBefore, config),
    isHit,
    hitGrade,
    rawDamage,
    effectiveDamage,
    reflectedDamage,
    targetHpBefore,
    targetHpAfter: defender.hp,
    actorHpBefore,
    actorHpAfter: actor.hp,
    isCountered,
    targetDied,
    actorDied,
    tickExecuted,
  };

  const nextHero = isHeroTurn ? actor : defender;
  const nextMob = isHeroTurn ? defender : actor;
  const nextActor: ParticipantKind = isHeroTurn ? 'mob' : 'hero';

  return {
    config,
    hero: nextHero,
    mob: nextMob,
    turnCount: turnNumber,
    activeActor: isFinished ? state.activeActor : nextActor,
    winner,
    isFinished,
    qualityLog,
    totalMobDamageTaken,
    history: [...state.history, resolution],
  };
}
