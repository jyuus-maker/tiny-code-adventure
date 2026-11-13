import assert from 'node:assert/strict';
import { createSeededRng } from '../src/logic/rng';
import {
  DEFAULT_BATTLE_CONFIG,
  computeHitRate,
  calculateDamage,
  calculateCounterReflection,
  createBattleState,
  stepBattle,
  rollAttackOutcome,
  rollFlee,
  DAY_MULTIPLIERS,
  chooseMobAction,
} from '../src/logic/battle';
import { DEFAULT_EFFECT_CONFIG } from '../src/logic/effects/types';
import {
  createInitialHeroEffectState,
  applyVitalEffect,
  applyCombatSlotEffect,
  applyPostBattleNaturalRecovery,
  getEffectiveAttack,
  getEffectiveDefense,
  tickEffects,
} from '../src/logic/effects/slotManager';
import {
  createInitialState,
  applyStartStatRoll,
  drawStatRoll,
  applyConfirmStats,
  applyDepart,
  drawMissionId,
  drawRegionOrder,
  applyBattleVictoryNaturalRecovery,
  applyRewardChoice,
  applyAdventureOutcome,
} from '../src/game/gameState';
import { MOBS } from '../src/data/mobs';
import { EVENTS } from '../src/data/events';
import { REGIONS } from '../src/config';
import { createMobParticipant } from '../src/logic/battle/statCalc';
import { createEventInstance, resolveEventChoice } from '../src/logic/events/engine';
import { rollRewardGrade, generateCombatRewards } from '../src/logic/rewards/roller';

// 1 & 2. 명중률 구조 & 숨은 명중 스탯 10 독립성
assert.equal(DEFAULT_BATTLE_CONFIG.accuracyStatDefault, 10);
assert.equal(computeHitRate('hero', 700, 700), 0.95);
assert.equal(computeHitRate('hero', 1600, 1600), 0.95); // HP 스탯 무관
assert.equal(computeHitRate('mob', 1000, 1000), 0.75);
// 50% 손실 시 -0.10
assert.ok(Math.abs(computeHitRate('hero', 500, 1000) - 0.85) < 1e-9);
assert.ok(Math.abs(computeHitRate('mob', 500, 1000) - 0.65) < 1e-9);
// 하한 0.65 / 0.50
assert.ok(Math.abs(computeHitRate('hero', 1, 1000) - 0.7502) < 1e-9); // 0.95 - 0.1998 = 0.7502 > 0.65
assert.equal(computeHitRate('hero', 1, 1000, { ...DEFAULT_BATTLE_CONFIG, heroHpLossPenalty: 0.5 }), 0.65);
assert.equal(computeHitRate('mob', 1, 1000, { ...DEFAULT_BATTLE_CONFIG, mobHpLossPenalty: 0.5 }), 0.50);

// 3. 타격 등급 & 버서킹 확률 분포 검증
{
  const rng = createSeededRng(100);
  const counts = { miss: 0, graze: 0, normal: 0, crit: 0 };
  for (let i = 0; i < 10000; i++) {
    const g = rollAttackOutcome(0.95, rng, DEFAULT_BATTLE_CONFIG, {
      actorRole: 'attack',
      targetRole: 'balanced',
      actorHpRatio: 0.3, // 버서킹 발동
      targetHpRatio: 1.0,
    });
    counts[g]++;
  }
  // 기대값: miss = 0.05 + 0.075 = 0.125, crit = 0.3167 + 0.175 = 0.4917
  assert.ok(counts.miss / 10000 > 0.11 && counts.miss / 10000 < 0.14);
  assert.ok(counts.crit / 10000 > 0.47 && counts.crit / 10000 < 0.51);
}

// 4 & 5. 비율형 방어 공식, 차지 x2.0, 최소 피해 2, 공격 주체 보정 x1.025 / x0.975 1회 적용
{
  assert.equal(DEFAULT_BATTLE_CONFIG.attackScale, 40);
  assert.equal(DEFAULT_BATTLE_CONFIG.defenseK, 20);
  assert.equal(DEFAULT_BATTLE_CONFIG.minDamage, 2);
  assert.equal(DEFAULT_BATTLE_CONFIG.chargeMultiplier, 2.0);
  assert.deepEqual(DAY_MULTIPLIERS, { 1: 0.58, 2: 0.66, 3: 0.74 });

  const expectedHeroDmg = Math.max(
    2,
    Math.round(((16 * 40 * 20) / (10 + 20)) * 1.0 * 2.0 * 1.025),
  );
  assert.equal(
    calculateDamage(16, 10, 'normal', true, false, DEFAULT_BATTLE_CONFIG, DEFAULT_BATTLE_CONFIG.heroDamageMultiplier),
    expectedHeroDmg,
  );
  const expectedMobDmg = Math.max(
    2,
    Math.round(((10 * 40 * 20) / (15 * 1.5 + 20)) * 0.7 * 1.0 * 0.975),
  );
  assert.equal(
    calculateDamage(10, 15, 'graze', false, true, DEFAULT_BATTLE_CONFIG, DEFAULT_BATTLE_CONFIG.mobDamageMultiplier),
    expectedMobDmg,
  );
  // 수동 카운터 반사
  const expectedReflect = Math.max(
    2,
    Math.round(((10 * 40 * 20) / (8 + 20)) * 1.3 * 2.0 * 1.0 * 0.975),
  );
  assert.equal(
    calculateCounterReflection(10, 8, 'crit', true, DEFAULT_BATTLE_CONFIG, DEFAULT_BATTLE_CONFIG.mobDamageMultiplier),
    expectedReflect,
  );
}

// 디버프 부호 교정 검증
{
  let es = createInitialHeroEffectState({ maxHp: 1000, hp: 1000, attack: 10, defense: 10 });
  es = applyCombatSlotEffect(es, {
    id: 'test-debuff',
    name: '공포',
    kind: 'atk-debuff',
    grade: 'broken',
    value: -1,
    remainingTurns: 8,
    maxTurns: 8,
  });
  assert.equal(getEffectiveAttack(es), 9); // 10 - |-1| = 9 (기존 버그처럼 11이 되면 안 됨)
  es = applyCombatSlotEffect(es, {
    id: 'test-def-debuff',
    name: '부상',
    kind: 'def-debuff',
    grade: 'broken',
    value: -2,
    remainingTurns: 8,
    maxTurns: 8,
  });
  assert.equal(getEffectiveDefense(es), 8);
}

// 6 & 7. 자연회복 HP스탯 x20 & 도트힐 활성 시 x1.5 가속 & 패배 시 미적용
{
  assert.equal(DEFAULT_EFFECT_CONFIG.instantHealValue, 300);
  assert.equal(DEFAULT_EFFECT_CONFIG.dotHealValue, 40);

  let es = createInitialHeroEffectState({ maxHp: 800, hp: 800, attack: 7, defense: 15 });
  es.currentHp = 400;
  // 도트힐 없음 -> 8 * 20 = 160
  const r1 = applyPostBattleNaturalRecovery(es, 8, 20, 1.5);
  assert.equal(r1.healed, 160);
  assert.equal(r1.dotBoosted, false);
  assert.equal(r1.nextState.currentHp, 560);

  // 도트힐 활성 -> 8 * 20 * 1.5 = 240
  es = applyVitalEffect(es, { kind: 'dot-heal', name: '치유', value: 40, duration: 5 });
  const r2 = applyPostBattleNaturalRecovery(es, 8, 20, 1.5);
  assert.equal(r2.healed, 240);
  assert.equal(r2.dotBoosted, true);
  assert.equal(r2.nextState.currentHp, 640);

  // 도트힐 만료 후 -> 다시 160
  for (let i = 0; i < 5; i++) es = tickEffects(es);
  assert.equal(es.vitalSlot, null);
  es.currentHp = 400;
  const r3 = applyPostBattleNaturalRecovery(es, 8, 20, 1.5);
  assert.equal(r3.healed, 160);
  assert.equal(r3.dotBoosted, false);

  // 사망(패배) 상태에서는 자연회복 없음
  const deadEs = { ...es, currentHp: 0, isDead: true };
  const r4 = applyPostBattleNaturalRecovery(deadEs, 8, 20, 1.5);
  assert.equal(r4.healed, 0);
  assert.equal(r4.nextState.currentHp, 0);
}

// 8, 9, 10. 공격형 피흡, 방어형 자동 카운터, 균형/생존형 미적용 검증
{
  const rng = createSeededRng(42);
  let lsCount = 0;
  for (let i = 0; i < 300; i++) {
    const st = createBattleState(
      { kind: 'hero', id: 'h', name: 'H', hp: 500, maxHp: 700, attack: 16, defense: 7, role: 'attack', charged: false, defending: false, countering: false },
      { kind: 'mob', id: 'm', name: 'M', hp: 1000, maxHp: 1000, attack: 10, defense: 8, role: 'balanced', charged: false, defending: false, countering: false },
      'hero',
    );
    const next = stepBattle(st, 'attack', rng);
    const res = next.history[0];
    if (res.lifestealHealed && res.lifestealHealed > 0) {
      assert.ok(res.isHit && res.effectiveDamage > 0);
      assert.equal(res.lifestealHealed, Math.min(700 - 500, Math.round(res.effectiveDamage * 0.3)));
      lsCount++;
    }
    assert.ok(!res.autoCountered);
  }
  assert.ok(lsCount > 30 && lsCount < 90, `Unexpected lifesteal count: ${lsCount}`);

  let acCount = 0;
  for (let i = 0; i < 300; i++) {
    const st = createBattleState(
      { kind: 'hero', id: 'h', name: 'H', hp: 800, maxHp: 800, attack: 7, defense: 15, role: 'defense', charged: false, defending: false, countering: false },
      { kind: 'mob', id: 'm', name: 'M', hp: 1000, maxHp: 1000, attack: 12, defense: 8, role: 'attack', charged: false, defending: false, countering: false },
      'mob',
    );
    const next = stepBattle(st, 'attack', rng);
    const res = next.history[0];
    if (res.autoCountered) {
      assert.ok(res.isHit && !res.isCountered);
      assert.ok((res.autoCounterDamage ?? 0) > 0);
      acCount++;
    }
    assert.equal(res.lifestealHealed ?? 0, 0);
  }
  assert.ok(acCount > 20 && acCount < 80, `Unexpected autoCounter count: ${acCount}`);

  // 균형형/생존형은 특수 효과 0건
  for (const role of ['balanced', 'hp'] as const) {
    for (let i = 0; i < 100; i++) {
      const stHero = createBattleState(
        { kind: 'hero', id: 'h', name: 'H', hp: 900, maxHp: 1000, attack: 10, defense: 10, role, charged: false, defending: false, countering: false },
        { kind: 'mob', id: 'm', name: 'M', hp: 1000, maxHp: 1000, attack: 10, defense: 8, role: 'balanced', charged: false, defending: false, countering: false },
        'hero',
      );
      const rH = stepBattle(stHero, 'attack', rng).history[0];
      assert.equal(rH.lifestealHealed ?? 0, 0);

      const stMob = { ...stHero, activeActor: 'mob' as const };
      const rM = stepBattle(stMob, 'attack', rng).history[0];
      assert.ok(!rM.autoCountered);
    }
  }
}

// 12. 도망 판정 분리 검증 (95% 명중률과 혼동되지 않음)
{
  const rng = createSeededRng(7);
  let fleeWins = 0;
  // heroHp 100 vs mobHp 900 -> 도망 성공률 ~10% (95%가 아님)
  for (let i = 0; i < 500; i++) {
    if (rollFlee(100, 900, rng)) fleeWins++;
  }
  assert.ok(fleeWins < 100, `rollFlee should be ~10%, got ${fleeWins}/500`);
}

// 11. 실제 src 게임 엔진 기반 30장 풀 모험 E2E 검증 (시드 3종 × 50런 = 150런)
{
  let cleared = 0;
  const rng = createSeededRng(20261113);
  const normalMobs = MOBS.filter((m) => !m.isMimic);
  const eventIds = EVENTS.map((e) => e.id);

  for (let run = 0; run < 120; run++) {
    let gs = createInitialState();
    gs = applyStartStatRoll(gs, drawStatRoll(rng));
    gs = applyConfirmStats(gs);
    gs = applyDepart(gs, drawMissionId(rng), drawRegionOrder(rng));
    const role = gs.roll?.dominant ?? 'balanced';

    while (gs.participationCount < 30 && gs.heroEffects && !gs.heroEffects.isDead) {
      const order = (Math.floor(gs.participationCount / 10) + 1) as 1 | 2 | 3;
      const region = gs.regionOrder![order - 1];
      const tod = gs.participationCount % 10 < 5 ? 'day' : 'night';

      if (rng() < 0.45) {
        const pool = normalMobs.filter((m) => m.time === tod);
        const mobDef = pool[Math.floor(rng() * pool.length)];
        const mobP = createMobParticipant(mobDef.id, REGIONS[order - 1] ?? region, { dayIndex: order }, rng);
        const heroP = {
          kind: 'hero' as const,
          id: 'hero',
          name: '용사',
          hp: gs.heroEffects.currentHp,
          maxHp: gs.heroEffects.baseMaxHp + gs.heroEffects.permanentHpBonus,
          attack: getEffectiveAttack(gs.heroEffects),
          defense: getEffectiveDefense(gs.heroEffects),
          accuracy: 10,
          role,
          charged: false,
          defending: false,
          countering: false,
        };
        let bs = createBattleState(heroP, mobP, rng() < 0.3 ? 'mob' : 'hero');
        let mobCharges = 0;
        while (!bs.isFinished && bs.turnCount < 200) {
          if (bs.activeActor === 'hero') {
            const act = bs.hero.charged ? (bs.mob.charged ? 'defend' : 'attack') : bs.mob.charged && rng() < 0.75 ? 'defend' : rng() < 0.35 ? 'charge' : 'attack';
            bs = stepBattle(bs, act, rng);
          } else {
            const act = chooseMobAction(bs.mob, rng, undefined, { dayIndex: order, chargeUsedCount: mobCharges });
            if (act === 'charge') mobCharges++;
            bs = stepBattle(bs, act, rng);
          }
          if (bs.history[bs.history.length - 1]?.tickExecuted && gs.heroEffects) {
            gs = { ...gs, heroEffects: tickEffects({ ...gs.heroEffects, currentHp: bs.hero.hp }) };
            bs = { ...bs, hero: { ...bs.hero, hp: gs.heroEffects!.currentHp } };
          }
        }
        if (bs.winner !== 'hero') {
          gs = { ...gs, heroEffects: { ...gs.heroEffects!, currentHp: 0, isDead: true } };
          break;
        }
        gs = { ...gs, heroEffects: { ...gs.heroEffects!, currentHp: bs.hero.hp } };
        gs = applyBattleVictoryNaturalRecovery(gs);
        const grade = rollRewardGrade(bs.qualityLog.lastHitGrade, bs.qualityLog.lastActionType, bs.qualityLog.lastHitWasCharged, false, rng);
        const pair = generateCombatRewards(mobDef.type, undefined, grade, false, rng);
        const chosen =
          gs.heroEffects!.currentHp < gs.heroEffects!.baseMaxHp * 0.7 && pair.optionB.vitalKind === 'instant-heal'
            ? pair.optionB
            : !gs.heroEffects!.vitalSlot && pair.optionB.vitalKind === 'dot-heal'
              ? pair.optionB
              : pair.optionA;
        gs = applyRewardChoice(gs, chosen);
        gs = { ...gs, participationCount: gs.participationCount + 1 };
      } else {
        const evId = eventIds[Math.floor(rng() * eventIds.length)];
        const inst = createEventInstance(evId, region, tod, gs.heroEffects, rng);
        const choices = inst.choices.filter((c) => !c.isPass && c.id !== 'pass');
        const res = resolveEventChoice(inst, choices[Math.floor(rng() * choices.length)].id, gs.heroEffects, rng);
        gs = { ...gs, heroEffects: res.nextEffects, participationCount: gs.participationCount + 1 };
      }
    }
    if (gs.participationCount >= 30 && gs.heroEffects && !gs.heroEffects.isDead) {
      cleared++;
    }
  }
  console.log(`30-card E2E sanity runs: ${cleared}/120 cleared (${((cleared / 120) * 100).toFixed(1)}%)`);
  assert.ok(cleared >= 60, `Expected >=60/120 E2E clears, got ${cleared}`);
}

console.log('ALL 12 E1 VERIFICATION CHECKS PASSED!');
