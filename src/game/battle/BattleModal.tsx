import { useEffect, useRef, useState } from 'react';
import type { Region } from '../../config';
import type { TimeOfDay } from '../../data/types';
import { ITEMS } from '../../data/items';
import { MOBS } from '../../data/mobs';
import { analyticsCollector } from '../../logic/balance/collector';
import type { BattleRecord } from '../../logic/balance/types';
import {
  chooseMobAction,
  computeHitRate,
  createBattleState,
  createMobParticipant,
  DEFAULT_BATTLE_CONFIG,
  resolveSleepingMob,
  rollEncounterStyle,
  rollFlee,
  rollSneakPast,
  stepBattle,
  type ActionKind,
  type BattleConfig,
  type BattleParticipantState,
  type BattleState,
  type SleepDepth,
} from '../../logic/battle';
import type { MobCardDef } from '../cards';
import type { HeroStats } from '../../logic/statRoll';
import type { HeroEffectState } from '../../logic/effects/types';
import {
  getEffectiveAttack,
  getEffectiveDefense,
  getEffectiveMaxHp,
  tickEffects,
} from '../../logic/effects/slotManager';
import type { MissionContext } from '../gameState';
import type { RewardChoicePair, RewardOption } from '../../logic/rewards/types';
import {
  determineMissionItemQuality,
  generateCombatRewards,
  rollRewardGrade,
} from '../../logic/rewards/roller';
import type { ItemGrade } from '../../render/types';
import { PixelSprite } from '../../render/PixelSprite';
import { getAssetRegionPalette } from '../../render/region';

export type BattleModalProps = {
  card: MobCardDef;
  region: Region;
  timeOfDay: TimeOfDay;
  dayIndex: 1 | 2 | 3;
  heroStats: HeroStats;
  heroEffects?: HeroEffectState | null;
  missionContext?: MissionContext | null;
  config?: BattleConfig;
  onVictory: (
    totalDamage: number,
    reward?: RewardOption,
    missionQuality?: ItemGrade | null,
  ) => void;
  onFleeSuccess: () => void;
  onDefeat: () => void;
  onTick?: (nextEffects: HeroEffectState) => void;
};

type BattlePhase =
  | 'encounter-choice' // 전투 전 선택 (싸운다 / 도망간다 or 깨운다 / 몰래가기)
  | 'flee-failed' // 도망/몰래가기 실패 안내
  | 'ambush-alert' // 기습 선공 안내
  | 'in-battle' // 전투 진행 중
  | 'victory' // 승리
  | 'defeat'; // 패배

export function BattleModal({
  card,
  region,
  timeOfDay,
  dayIndex,
  heroStats,
  heroEffects = null,
  missionContext = null,
  config = DEFAULT_BATTLE_CONFIG,
  onVictory,
  onFleeSuccess,
  onDefeat,
  onTick,
}: BattleModalProps) {
  const isSleepingCard = card.encounter === 'sleeping';

  // 1. 잠든 몹인 경우 실제 깨어날 몹과 깊이 사전에 결정
  const [sleepingInfo] = useState(() =>
    isSleepingCard ? resolveSleepingMob(timeOfDay) : null,
  );

  const actualMobId = sleepingInfo ? sleepingInfo.actualMobId : card.mobId ?? 'stone-shell-turtle';
  const sleepDepth: SleepDepth | null = sleepingInfo ? sleepingInfo.depth : null;

  // 2. 조우 스타일 판정 (일반: 70% 일반 vs 30% 기습)
  const [encounterType] = useState<'normal' | 'ambush' | 'sleeping'>(() => {
    if (isSleepingCard) return 'sleeping';
    return rollEncounterStyle();
  });

  const [phase, setPhase] = useState<BattlePhase>(() => {
    if (encounterType === 'ambush') return 'ambush-alert';
    return 'encounter-choice';
  });

  // 용사 효과 상태 (도트, 공방 버프 관리)
  const [currentEffects, setCurrentEffects] = useState<HeroEffectState | null>(() => heroEffects);

  // 보상 2택 1 및 미션 수집 품질 보관
  const [rewardChoices, setRewardChoices] = useState<RewardChoicePair | null>(null);
  const [collectedMissionQuality, setCollectedMissionQuality] = useState<ItemGrade | null>(null);

  // 3. 전투 상태 초기화
  const [battleState, setBattleState] = useState<BattleState>(() => {
    const effHp = heroEffects ? heroEffects.currentHp : heroStats.hp;
    const effMaxHp = heroEffects ? getEffectiveMaxHp(heroEffects) : heroStats.maxHp;
    const effAtk = heroEffects ? getEffectiveAttack(heroEffects) : heroStats.attack;
    const effDef = heroEffects ? getEffectiveDefense(heroEffects) : heroStats.defense;

    const heroParticipant: BattleParticipantState = {
      kind: 'hero',
      id: 'hero',
      name: '용사',
      hp: effHp,
      maxHp: effMaxHp,
      attack: effAtk,
      defense: effDef,
      charged: false,
      defending: false,
      countering: false,
    };

    const mobParticipant = createMobParticipant(
      actualMobId,
      region,
      { sleepDepth, dayIndex },
    );

    const firstActor = encounterType === 'ambush' ? 'mob' : 'hero';
    return createBattleState(heroParticipant, mobParticipant, firstActor, config);
  });

  const [message, setMessage] = useState<string>(() => {
    if (encounterType === 'ambush') return '기습을 당했다! 몬스터가 먼저 공격해 온다!';
    if (encounterType === 'sleeping') {
      return sleepDepth === 'light'
        ? '몬스터가 선잠에 들어 있다. 조심스럽게 지나갈 수 있을 것 같다.'
        : '몬스터가 깊은 잠에 빠져 있다. 몰래 지나갈 기회다!';
    }
    return `${battleState.mob.name}과(와) 마주쳤다. 어떻게 할까?`;
  });

  const handleTurnResolved = (
    next: BattleState,
    actorKind: 'hero' | 'mob',
    action: ActionKind,
  ) => {
    const res = next.history[next.history.length - 1];
    let msg = '';
    const actorName = actorKind === 'hero' ? '용사' : next.mob.name;
    const targetName = actorKind === 'hero' ? next.mob.name : '용사';

    if (action === 'charge') {
      msg = `${actorName}이(가) 힘을 모으기 시작했다! (차지 상태)`;
    } else if (action === 'defend') {
      if (res.actorDied || res.isCountered) {
        msg = `${actorName}이(가) 반격 태세를 취했다!`;
      } else {
        msg = `${actorName}이(가) 방어 태세를 취했다.`;
      }
    } else if (action === 'attack') {
      if (res.isCountered) {
        msg = `${targetName}의 카운터 패링! ${actorName}에게 ${res.reflectedDamage} 피해 반사!`;
      } else if (!res.isHit) {
        msg = `${actorName}의 공격! 헛스윙으로 빗나갔다.`;
      } else {
        const gradeText =
          res.hitGrade === 'crit'
            ? '크리티컬!'
            : res.hitGrade === 'graze'
              ? '빗맞힘.'
              : '명중!';
        msg = `${actorName}의 공격! (${gradeText}) ${targetName}에게 ${res.effectiveDamage} 피해!`;
      }
    }

    // 행동 종료 틱 1회 실행 (§4-7)
    let updatedHeroHp = next.hero.hp;
    if (res.tickExecuted && currentEffects) {
      const tickedEffects = tickEffects(currentEffects);
      setCurrentEffects(tickedEffects);
      onTick?.(tickedEffects);

      // 도트 효과로 인한 HP 변경 반영
      if (currentEffects.vitalSlot?.kind === 'dot-heal') {
        const healAmt = currentEffects.vitalSlot.value;
        const maxHp = getEffectiveMaxHp(tickedEffects);
        updatedHeroHp = Math.min(maxHp, updatedHeroHp + healAmt);
      } else if (currentEffects.vitalSlot?.kind === 'dot-damage') {
        const dmgAmt = currentEffects.vitalSlot.value;
        updatedHeroHp = Math.max(0, updatedHeroHp - dmgAmt);
      }
    }

    const stateWithTickedHp: BattleState = {
      ...next,
      hero: {
        ...next.hero,
        hp: updatedHeroHp,
      },
    };

    if (updatedHeroHp <= 0 && !stateWithTickedHp.isFinished) {
      stateWithTickedHp.isFinished = true;
      stateWithTickedHp.winner = 'mob';
    }

    setMessage(msg);
    setBattleState(stateWithTickedHp);

    if (stateWithTickedHp.isFinished) {
      // 밸런스 데이터 수집기 기록
      const record: BattleRecord = {
        id: `run-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        timestamp: Date.now(),
        configVersion: 'v1.0-runtime',
        config,
        region,
        timeOfDay,
        mobId: stateWithTickedHp.mob.id,
        mobName: stateWithTickedHp.mob.name,
        encounterType,
        fled: false,
        winner: stateWithTickedHp.winner ?? 'mob',
        turnCount: stateWithTickedHp.turnCount,
        initialHeroHp: heroStats.hp,
        finalHeroHp: stateWithTickedHp.hero.hp,
        initialMobHp: stateWithTickedHp.mob.maxHp,
        finalMobHp: stateWithTickedHp.mob.hp,
        totalMobDamage: stateWithTickedHp.totalMobDamageTaken,
        heroRemainingHpRatio: Math.max(0, stateWithTickedHp.hero.hp) / heroStats.maxHp,
        hitGradeCounts: {
          miss: stateWithTickedHp.history.filter((h) => h.actor === 'hero' && h.hitGrade === 'miss').length,
          graze: stateWithTickedHp.history.filter((h) => h.actor === 'hero' && h.hitGrade === 'graze').length,
          normal: stateWithTickedHp.history.filter((h) => h.actor === 'hero' && h.hitGrade === 'normal').length,
          crit: stateWithTickedHp.history.filter((h) => h.actor === 'hero' && h.hitGrade === 'crit').length,
        },
        counterCount: stateWithTickedHp.history.filter((h) => h.isCountered).length,
        chargeAttackCount: stateWithTickedHp.qualityLog.hasChargeCrit || stateWithTickedHp.qualityLog.hasChargeGraze ? 1 : 0,
      };
      analyticsCollector.record(record);

      if (stateWithTickedHp.winner === 'hero') {
        // 1. 배틀 미션 대상 몹 처치 시 미션템 품질 판정 (§4-6)
        const isMissionTarget =
          missionContext?.mission.kind === 'battle' &&
          (actualMobId === missionContext.mission.targetMobId ||
            card.mobId === missionContext.mission.targetMobId);

        let q: ItemGrade | null = null;
        if (isMissionTarget) {
          q = determineMissionItemQuality(stateWithTickedHp.qualityLog);
          setCollectedMissionQuality(q);
        }

        // 2. 막타 타격 분류에 따른 보상 등급 추첨 및 2택 1 보상 생성 (§4-6)
        const isMimic = actualMobId === 'mimic';
        const lastHeroRes = stateWithTickedHp.history
          .filter((h) => h.actor === 'hero')
          .pop();
        const wasLastHitCharged = lastHeroRes?.action === 'attack' && stateWithTickedHp.qualityLog.hasChargeCrit;

        const rewardGrade = rollRewardGrade(
          stateWithTickedHp.qualityLog.lastHitGrade,
          stateWithTickedHp.qualityLog.lastActionType,
          wasLastHitCharged,
          isMimic,
        );

        const mobDef = MOBS.find((m) => m.id === actualMobId);
        const mobItem = ITEMS.find((i) => i.id === mobDef?.exclusiveItemId);
        const isBoxExplore = missionContext?.mission.kind === 'explore';

        const rewards = generateCombatRewards(
          mobDef?.type ?? 'attack',
          mobItem,
          rewardGrade,
          isBoxExplore,
        );
        setRewardChoices(rewards);

        setPhase('victory');
      } else {
        setPhase('defeat');
      }
    }
  };

  const turnResolvedRef = useRef(handleTurnResolved);
  useEffect(() => {
    turnResolvedRef.current = handleTurnResolved;
  });

  // 4. 몹 턴일 때 자동 행동 실행 타이머
  useEffect(() => {
    if (phase !== 'in-battle' || battleState.isFinished) return;
    if (battleState.activeActor === 'mob') {
      const timer = setTimeout(() => {
        const action = chooseMobAction(battleState.mob);
        const next = stepBattle(battleState, action);
        turnResolvedRef.current(next, 'mob', action);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [phase, battleState]);

  const handleHeroAction = (action: ActionKind) => {
    if (phase !== 'in-battle' || battleState.activeActor !== 'hero') return;
    const next = stepBattle(battleState, action);
    handleTurnResolved(next, 'hero', action);
  };

  // 선택지 핸들러
  const handleFight = () => {
    setPhase('in-battle');
  };

  const handleFlee = () => {
    const success = rollFlee(battleState.hero.hp, battleState.mob.hp);
    if (success) {
      analyticsCollector.record({
        id: `flee-${Date.now()}`,
        timestamp: Date.now(),
        configVersion: 'v1.0-runtime',
        config,
        region,
        timeOfDay,
        mobId: battleState.mob.id,
        mobName: battleState.mob.name,
        encounterType,
        fled: true,
        winner: 'fled',
        turnCount: 0,
        initialHeroHp: heroStats.hp,
        finalHeroHp: heroStats.hp,
        initialMobHp: battleState.mob.maxHp,
        finalMobHp: battleState.mob.hp,
        totalMobDamage: 0,
        heroRemainingHpRatio: 1.0,
        hitGradeCounts: { miss: 0, graze: 0, normal: 0, crit: 0 },
        counterCount: 0,
        chargeAttackCount: 0,
      });
      onFleeSuccess();
    } else {
      setMessage('도망치지 못했다! 몬스터가 길을 가로막는다.');
      setPhase('flee-failed');
    }
  };

  const handleSneak = () => {
    const rate = sleepingInfo?.sneakSuccessRate ?? 0.5;
    const success = rollSneakPast(rate);
    if (success) {
      onFleeSuccess();
    } else {
      setMessage('발소리에 몬스터가 눈을 떴다! 강제 전투에 돌입한다.');
      setPhase('flee-failed');
    }
  };

  // 명중률 계산식 코드 (§6-2)
  const heroHp = battleState.hero.hp;
  const mobHp = battleState.mob.hp;
  const heroHitPct = Math.round(computeHitRate(heroHp, mobHp, config) * 100);
  const mobHitPct = Math.round(computeHitRate(mobHp, heroHp, config) * 100);

  const codeDisplay = `let heroHp = ${heroHp};
let monsterHp = ${mobHp};
let monsterCharged = ${battleState.mob.charged};
let heroHit = heroHp / (heroHp + monsterHp);       // hero hit: ${heroHitPct}%
let monsterHit = monsterHp / (heroHp + monsterHp); // monster hit: ${mobHitPct}%`;

  return (
    <div className="battle-modal-content">
      {/* 몹 스프라이트 및 정보 */}
      <div className="battle-header">
        <div className="battle-sprite-box">
          <PixelSprite
            id={isSleepingCard && phase === 'encounter-choice' ? 'event-sleeping-mob-128' : battleState.mob.id}
            palette={getAssetRegionPalette(battleState.mob.id, region)}
            scale={2}
          />
        </div>
        <div className="battle-status-box">
          <div className="battle-status-row">
            <strong>{battleState.mob.name}</strong>
            {battleState.mob.charged && <span className="battle-badge-charge">차지 중!</span>}
            {battleState.mob.defending && <span className="battle-badge-defend">방어 중</span>}
            {battleState.mob.countering && <span className="battle-badge-counter">카운터 준비!</span>}
            <span className="battle-hp-text">
              HP {Math.max(0, battleState.mob.hp)} / {battleState.mob.maxHp}
            </span>
          </div>
          <div className="battle-hp-bar-bg">
            <div
              className="battle-hp-bar-fill mob"
              style={{ width: `${Math.max(0, (battleState.mob.hp / battleState.mob.maxHp) * 100)}%` }}
            />
          </div>

          <div className="battle-status-row" style={{ marginTop: 8 }}>
            <strong>용사 (나)</strong>
            {battleState.hero.charged && <span className="battle-badge-charge">차지 중!</span>}
            {battleState.hero.defending && <span className="battle-badge-defend">방어 중</span>}
            {battleState.hero.countering && <span className="battle-badge-counter">카운터 준비!</span>}
            <span className="battle-hp-text">
              HP {Math.max(0, battleState.hero.hp)} / {battleState.hero.maxHp}
            </span>
          </div>
          <div className="battle-hp-bar-bg">
            <div
              className="battle-hp-bar-fill hero"
              style={{ width: `${Math.max(0, (battleState.hero.hp / battleState.hero.maxHp) * 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* 상황 지문 및 안내 메시지 */}
      <div className="battle-message-box">
        <p>{message}</p>
      </div>

      {/* 코드 표시 영역 (§6-2) */}
      <div className="battle-code-box">
        <pre>{codeDisplay}</pre>
      </div>

      {/* 조작 버튼 영역 */}
      <div className="battle-actions">
        {phase === 'encounter-choice' && (
          <div className="battle-choice-buttons">
            {isSleepingCard ? (
              <>
                <button type="button" className="game-button-primary" onClick={handleFight}>
                  깨워서 싸운다
                </button>
                <button type="button" onClick={handleSneak}>
                  몰래 지나간다 ({sleepDepth === 'light' ? '성공률 낮음' : '성공률 높음'})
                </button>
              </>
            ) : (
              <>
                <button type="button" className="game-button-primary" onClick={handleFight}>
                  싸운다 (유저 선공)
                </button>
                <button type="button" onClick={handleFlee}>
                  도망간다 (확률: {heroHitPct}%)
                </button>
              </>
            )}
          </div>
        )}

        {(phase === 'ambush-alert' || phase === 'flee-failed') && (
          <button type="button" className="game-button-primary" onClick={() => setPhase('in-battle')}>
            전투 시작
          </button>
        )}

        {phase === 'in-battle' && (
          <div className="battle-in-fight-buttons">
            <button
              type="button"
              className="game-button-primary"
              disabled={battleState.activeActor !== 'hero'}
              onClick={() => handleHeroAction('attack')}
            >
              {battleState.hero.charged ? '차지 공격 (2.2배)' : '일반 공격'}
            </button>
            <button
              type="button"
              disabled={battleState.activeActor !== 'hero'}
              onClick={() => handleHeroAction('defend')}
            >
              {battleState.hero.charged ? '카운터 (패링 반사)' : '방어 (피해 감소)'}
            </button>
            <button
              type="button"
              disabled={battleState.activeActor !== 'hero' || battleState.hero.charged}
              onClick={() => handleHeroAction('charge')}
              title={battleState.hero.charged ? '연속 차지 불가' : '다음 공격/방어 강화'}
            >
              차지 (기 모으기)
            </button>
            {battleState.activeActor === 'mob' && (
              <span className="battle-turn-indicator">몬스터 차례...</span>
            )}
          </div>
        )}

        {phase === 'victory' && (
          <div className="battle-result-box" style={{ width: '100%' }}>
            <div style={{ color: '#86efac', fontWeight: 600, fontSize: 13, marginBottom: 4 }}>
              승리! 몬스터를 물리쳤다.
            </div>

            {/* 미션템 자동 수집 알림 (§4-6) */}
            {collectedMissionQuality && missionContext && (
              <div
                className="battle-mission-collect-notice"
                style={{
                  background: 'rgba(56, 189, 248, 0.15)',
                  border: '1px solid #38bdf8',
                  borderRadius: 4,
                  padding: '4px 8px',
                  marginBottom: 8,
                  fontSize: 11,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <PixelSprite id={missionContext.item.assetId} scale={1} />
                <span>
                  <strong>[의뢰품 자동 수집]</strong> {missionContext.item.name} (
                  <span
                    style={{
                      color:
                        collectedMissionQuality === 'shining'
                          ? '#fef08a'
                          : collectedMissionQuality === 'broken'
                            ? '#fca5a5'
                            : '#86efac',
                      fontWeight: 600,
                    }}
                  >
                    {collectedMissionQuality === 'shining'
                      ? '빛나는'
                      : collectedMissionQuality === 'broken'
                        ? '부서진'
                        : '일반'}
                  </span>
                  ) 획득!
                </span>
              </div>
            )}

            {/* 보상 선택 (2택 1) (§4-6) */}
            {rewardChoices ? (
              <div className="battle-reward-selection" style={{ marginTop: 4 }}>
                <div style={{ fontSize: 11, color: '#cbd5e1', marginBottom: 6 }}>
                  전리품 보상 선택 (2개 중 택 1 · 즉시 적용):
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  <button
                    type="button"
                    className="game-button-primary battle-reward-btn"
                    style={{
                      padding: '6px 4px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 2,
                      fontSize: 11,
                      lineHeight: 1.2,
                    }}
                    onClick={() =>
                      onVictory(
                        battleState.totalMobDamageTaken,
                        rewardChoices.optionA,
                        collectedMissionQuality,
                      )
                    }
                  >
                    <PixelSprite id={rewardChoices.optionA.assetId} scale={1} />
                    <strong style={{ marginTop: 2 }}>{rewardChoices.optionA.name}</strong>
                    <span style={{ fontSize: 9, opacity: 0.9 }}>
                      {rewardChoices.optionA.description}
                    </span>
                  </button>

                  <button
                    type="button"
                    className="game-button-primary battle-reward-btn"
                    style={{
                      padding: '6px 4px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 2,
                      fontSize: 11,
                      lineHeight: 1.2,
                    }}
                    onClick={() =>
                      onVictory(
                        battleState.totalMobDamageTaken,
                        rewardChoices.optionB,
                        collectedMissionQuality,
                      )
                    }
                  >
                    <PixelSprite id={rewardChoices.optionB.assetId} scale={1} />
                    <strong style={{ marginTop: 2 }}>{rewardChoices.optionB.name}</strong>
                    <span style={{ fontSize: 9, opacity: 0.9 }}>
                      {rewardChoices.optionB.description}
                    </span>
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className="game-button-primary"
                onClick={() => onVictory(battleState.totalMobDamageTaken)}
              >
                다음으로 (참여 +1)
              </button>
            )}
          </div>
        )}

        {phase === 'defeat' && (
          <div className="battle-result-box">
            <span style={{ color: '#f87171', fontWeight: 600 }}>패배... 용사가 쓰러졌다.</span>
            <button type="button" onClick={onDefeat}>
              결과 확인
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
