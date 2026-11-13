import type { Rng } from '../rng';
import {
  BATTLE_DAMAGE_MULTIPLIER,
  DEFAULT_BATTLE_CONFIG,
  type ActionKind,
  type ActionResolution,
  type BattleConfig,
  type BattleParticipantState,
  type BattleState,
  type HeroRole,
  type HitGrade,
  type ParticipantKind,
  type QualityLog,
} from './types';

export { BATTLE_DAMAGE_MULTIPLIER };

/**
 * E1 숨은 명중 스탯 기반 명중률 계산.
 * hitRate = clamp(baseHitRate * (accStat / 10) - hpLossRate * hpLossPenalty, hitRateMin, hitRateMax)
 * hpLossRate = (maxHp - currentHp) / maxHp
 */
export function computeHitRate(
  actorKind: ParticipantKind,
  currentHp: number,
  maxHp: number,
  config: BattleConfig = DEFAULT_BATTLE_CONFIG,
  accuracyStat: number = config.accuracyStatDefault,
): number {
  if (currentHp <= 0) return 0;
  if (maxHp <= 0) return 1;

  const baseHit =
    actorKind === 'hero' ? config.heroBaseHitRate : config.mobBaseHitRate;
  const penalty =
    actorKind === 'hero' ? config.heroHpLossPenalty : config.mobHpLossPenalty;
  const minHit =
    actorKind === 'hero' ? config.heroHitRateMin : config.mobHitRateMin;

  const accMult =
    config.accuracyStatDefault > 0
      ? accuracyStat / config.accuracyStatDefault
      : 1.0;
  const hpLossRate = Math.max(0, (maxHp - currentHp) / maxHp);
  const raw = baseHit * accMult - hpLossRate * penalty;

  return Math.min(config.hitRateMax, Math.max(minHit, raw));
}

export type BerserkRollOptions = {
  actorRole?: HeroRole | null;
  targetRole?: HeroRole | null;
  actorHpRatio?: number;
  targetHpRatio?: number;
  actorIntensity?: number;
  targetIntensity?: number;
};

/**
 * 명중 판정 + 타격 등급 추첨 (버서킹 4분할 재분배 포함).
 * 기본 분포: miss = 1 - hitRate, graze = hitRate/3, normal = hitRate/3, crit = hitRate/3.
 * 버서킹(HP <= 45%): 비방어형 3:7 (자기 헛스윙 3, 자기 크리 7), 방어형 3:3:4 (자기 헛스윙 3, 상대 헛스윙 3, 자기 크리 4).
 */
export function rollAttackOutcome(
  hitRate: number,
  rng: Rng = Math.random,
  config: BattleConfig = DEFAULT_BATTLE_CONFIG,
  berserk: BerserkRollOptions = {},
): HitGrade {
  let pMiss = 1 - hitRate;
  let pGraze = hitRate / 3;
  let pNormal = hitRate / 3;
  let pCrit = hitRate / 3;

  const actorBerserk =
    berserk.actorHpRatio !== undefined &&
    berserk.actorHpRatio <= config.berserkHpThreshold;
  const targetBerserk =
    berserk.targetHpRatio !== undefined &&
    berserk.targetHpRatio <= config.berserkHpThreshold;
  const actorIntensity = berserk.actorIntensity ?? 1.0;
  const targetIntensity = berserk.targetIntensity ?? 1.0;

  let addSelfMiss = 0;
  let addSelfCrit = 0;
  let addOppMiss = 0;

  if (actorBerserk && actorIntensity > 0) {
    const s = config.berserkProbShift * actorIntensity;
    addSelfMiss = 0.3 * s;
    addSelfCrit = (berserk.actorRole === 'defense' ? 0.4 : 0.7) * s;
  }
  if (targetBerserk && berserk.targetRole === 'defense' && targetIntensity > 0) {
    const sOpp = config.berserkProbShift * targetIntensity;
    addOppMiss = 0.3 * sOpp;
  }

  const totalMissAdd = addSelfMiss + addOppMiss;
  const need = totalMissAdd + addSelfCrit;
  const pool = pGraze + pNormal;
  const scale = need > pool && need > 0 ? pool / need : 1.0;

  const aMiss = totalMissAdd * scale;
  const aCrit = addSelfCrit * scale;
  const taken = aMiss + aCrit;

  if (pool > 0 && taken > 0) {
    const gRatio = pGraze / pool;
    const nRatio = pNormal / pool;
    pGraze = Math.max(0, pGraze - taken * gRatio);
    pNormal = Math.max(0, pNormal - taken * nRatio);
  }
  pMiss += aMiss;
  pCrit += aCrit;

  const sum = pMiss + pGraze + pNormal + pCrit;
  const r = rng() * sum;
  if (r < pMiss) return 'miss';
  if (r < pMiss + pGraze) return 'graze';
  if (r < pMiss + pGraze + pNormal) return 'normal';
  return 'crit';
}

/**
 * 하위 호환용 타격 등급 추첨 (명중 시 균등 1:1:1).
 */
export function resolveHitGrade(
  isHit: boolean,
  rng: Rng,
  _config: BattleConfig = DEFAULT_BATTLE_CONFIG,
): HitGrade {
  if (!isHit) return 'miss';
  const r = rng() * 3;
  if (r < 1) return 'graze';
  if (r < 2) return 'normal';
  return 'crit';
}

/**
 * E1 비율형 방어 피해 계산식.
 * base = (attackerAtk * attackScale * defenseK) / (effectiveDef + defenseK)
 * final = max(minDamage, round(base * gradeMult * chargeMult * damageMultiplier))
 */
export function calculateDamage(
  attackerAtk: number,
  defenderDef: number,
  hitGrade: HitGrade,
  isCharged: boolean,
  isDefending: boolean,
  config: BattleConfig = DEFAULT_BATTLE_CONFIG,
  damageMultiplier: number = 1.0,
): number {
  if (hitGrade === 'miss') return 0;

  const gradeMult = config.hitMultipliers[hitGrade];
  const chargeMult = isCharged ? config.chargeMultiplier : 1.0;
  const effectiveDef =
    defenderDef * config.defenseRate * (isDefending ? config.defendDefMult : 1.0);
  const base =
    (attackerAtk * config.attackScale * config.defenseK) /
    (effectiveDef + config.defenseK);

  return Math.max(
    config.minDamage,
    Math.round(base * gradeMult * chargeMult * damageMultiplier),
  );
}

/**
 * 수동 차지 패링 카운터 반사 피해 계산 (E1 비율형 방어 공식 적용).
 */
export function calculateCounterReflection(
  attackerAtk: number,
  attackerDef: number,
  hitGrade: HitGrade,
  isCharged: boolean,
  config: BattleConfig = DEFAULT_BATTLE_CONFIG,
  damageMultiplier: number = 1.0,
): number {
  if (hitGrade === 'miss') return 0;
  const gradeMult = config.hitMultipliers[hitGrade];
  const chargeMult = isCharged ? config.chargeMultiplier : 1.0;
  const effectiveDef = attackerDef * config.defenseRate;
  const base =
    (attackerAtk * config.attackScale * config.defenseK) /
    (effectiveDef + config.defenseK);

  return Math.max(
    config.minDamage,
    Math.round(
      base * gradeMult * chargeMult * config.counterMultiplier * damageMultiplier,
    ),
  );
}

export function createInitialQualityLog(): QualityLog {
  return {
    hasChargeCrit: false,
    hasChargeGraze: false,
    lastHitGrade: null,
    lastHitByHero: false,
    lastActionType: null,
    lastHitWasCharged: false,
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
    hero: {
      ...hero,
      kind: 'hero',
      accuracy: hero.accuracy ?? config.accuracyStatDefault,
    },
    mob: {
      ...mob,
      kind: 'mob',
      accuracy: mob.accuracy ?? config.accuracyStatDefault,
    },
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
  let lifestealHealed = 0;
  let autoCountered = false;
  let autoCounterDamage = 0;

  const targetHpBefore = defender.hp;
  const actorHpBefore = actor.hp;
  const wasCharged = actor.charged;

  const actorHitRate = computeHitRate(
    actor.kind,
    actor.hp,
    actor.maxHp,
    config,
    actor.accuracy,
  );

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

    hitGrade = rollAttackOutcome(actorHitRate, rng, config, {
      actorRole: actor.role,
      targetRole: defender.role,
      actorHpRatio: actor.maxHp > 0 ? actor.hp / actor.maxHp : 1,
      targetHpRatio: defender.maxHp > 0 ? defender.hp / defender.maxHp : 1,
      actorIntensity: isHeroTurn
        ? config.heroBerserkIntensity
        : config.monsterBerserkIntensity,
      targetIntensity: isHeroTurn
        ? config.monsterBerserkIntensity
        : config.heroBerserkIntensity,
    });
    isHit = hitGrade !== 'miss';

    const attackerDmgMult = isHeroTurn
      ? config.heroDamageMultiplier
      : config.mobDamageMultiplier;

    if (defender.countering) {
      // 상대가 수동 카운터 태세인 경우: 패링 100%, 공격자가 반사 피해를 받음 (§4-4)
      isCountered = true;
      defender.countering = false;
      rawDamage = 0;
      effectiveDamage = 0;

      if (isHit) {
        const rawReflected = calculateCounterReflection(
          actor.attack,
          actor.defense,
          hitGrade,
          wasCharged,
          config,
          attackerDmgMult,
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
          attackerDmgMult,
        );
        // 용사 차지 중 피격 시 피해 80% 경감 (기존 규칙 유지)
        if (!isHeroTurn && defender.charged) {
          rawDamage = Math.max(config.minDamage, Math.round(rawDamage * 0.8));
        }

        effectiveDamage = Math.min(defender.hp, rawDamage);
        defender.hp = Math.max(0, defender.hp - effectiveDamage);

        // 방어 적용 후 방어 태세 소비
        if (defender.defending) {
          defender.defending = false;
        }

        // E1 공격형 간헐적 피흡: 공격 성공 + 실제 피해 > 0 + 패링 아님
        if (
          isHeroTurn &&
          actor.role === 'attack' &&
          effectiveDamage > 0 &&
          config.lifestealProb > 0 &&
          rng() < config.lifestealProb
        ) {
          const rawHeal = Math.round(effectiveDamage * config.lifestealRate);
          lifestealHealed = Math.min(actor.maxHp - actor.hp, Math.max(0, rawHeal));
          actor.hp += lifestealHealed;
        }

        // E1 방어형 간헐적 자동 카운터: 몬스터 공격 명중 + 수동 패링 아님 + 양측 생존
        if (
          !isHeroTurn &&
          defender.role === 'defense' &&
          defender.hp > 0 &&
          actor.hp > 0 &&
          config.autoCounterProb > 0 &&
          rng() < config.autoCounterProb
        ) {
          const baseCounter = calculateDamage(
            defender.attack,
            actor.defense,
            'normal',
            false,
            false,
            config,
            config.heroDamageMultiplier,
          );
          const rawAutoCounter = Math.max(
            config.minDamage,
            Math.round(baseCounter * config.autoCounterMultiplier),
          );
          autoCounterDamage = Math.min(actor.hp, rawAutoCounter);
          actor.hp = Math.max(0, actor.hp - autoCounterDamage);
          autoCountered = true;
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
    totalMobDamageTaken += reflectedDamage + autoCounterDamage;
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
    qualityLog.lastHitWasCharged = isHeroTurn && wasCharged;
  }
  if (isCountered && reflectedDamage > 0) {
    qualityLog.lastHitGrade = hitGrade;
    qualityLog.lastHitByHero = !isHeroTurn;
    qualityLog.lastActionType = 'counter';
    qualityLog.lastHitWasCharged = false;
  }
  if (autoCountered && autoCounterDamage > 0 && actor.hp <= 0) {
    qualityLog.lastHitGrade = 'normal';
    qualityLog.lastHitByHero = true;
    qualityLog.lastActionType = 'counter';
    qualityLog.lastHitWasCharged = false;
  }

  // 6. 사망 및 틱 처리
  const targetDied = defender.hp <= 0;
  const actorDied = actor.hp <= 0;
  let tickExecuted = false;

  if (!targetDied && !actorDied) {
    tickExecuted = true;
  } else if (config.tickOnDirectDeath) {
    tickExecuted = true;
  }

  // 승패 결정 (용사 사망 우선)
  let winner: ParticipantKind | null = null;
  let isFinished = false;

  const finalHeroHp = isHeroTurn ? actor.hp : defender.hp;
  const finalMobHp = isHeroTurn ? defender.hp : actor.hp;

  if (finalHeroHp <= 0) {
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
    wasCharged,
    hitRate: actorHitRate,
    isHit,
    hitGrade,
    rawDamage,
    effectiveDamage,
    reflectedDamage,
    lifestealHealed,
    autoCountered,
    autoCounterDamage,
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
