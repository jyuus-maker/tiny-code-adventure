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
    finalHeroHp?: number,
    finalHeroEffects?: HeroEffectState | null,
  ) => void;
  onFleeSuccess: () => void;
  onDefeat: (
    finalHeroHp?: number,
    finalHeroEffects?: HeroEffectState | null,
  ) => void;
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
        ? '몬스터가 선잠에 빠져 있다. 조용히 지나갈까?'
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
      const effectsBeforeTick: HeroEffectState = {
        ...currentEffects,
        currentHp: updatedHeroHp,
        isDead: updatedHeroHp <= 0,
      };
      const tickedEffects = tickEffects(effectsBeforeTick);
      setCurrentEffects(tickedEffects);
      onTick?.(tickedEffects);
      updatedHeroHp = tickedEffects.currentHp;
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
        const isMimic = actualMobId === 'mimic';
        const lastHitGrade = stateWithTickedHp.qualityLog.lastHitGrade;
        const lastActionType = stateWithTickedHp.qualityLog.lastActionType;
        const wasLastHitCharged = stateWithTickedHp.qualityLog.lastHitWasCharged;

        // 1. 배틀 미션 대상 몹 처치 시 미션템 품질 판정 (§4-6, §12-3)
        // 대상 몹 처치 막타 타격 유형별 가중치 추첨 적용 (보상과 분리된 독립 추첨)
        const isMissionTarget =
          missionContext?.mission.kind === 'battle' &&
          (actualMobId === missionContext.mission.targetMobId ||
            card.mobId === missionContext.mission.targetMobId);

        let q: ItemGrade | null = null;
        if (isMissionTarget) {
          q = determineMissionItemQuality(
            lastHitGrade,
            lastActionType,
            wasLastHitCharged,
            isMimic,
          );
          setCollectedMissionQuality(q);
        }

        // 2. 막타 타격 분류에 따른 보상 등급 추첨 및 2택 1 보상 생성 (§4-6)
        const rewardGrade = rollRewardGrade(
          lastHitGrade,
          lastActionType,
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

  const mobDef = MOBS.find((m) => m.id === actualMobId);
  const mobAssetId = mobDef?.assetId ?? battleState.mob.assetId ?? actualMobId;

  return (
    <div className="battle-floats-container">
      {/* 1. 승리 시 보상 선택 오버레이 (v9.1 .reward-floats) */}
      {phase === 'victory' && (
        <div className="reward-floats">
          <div className="float-panel reward-title">
            <div className="trophy">✦</div>
            <h2>전투 승리!</h2>
            {collectedMissionQuality && missionContext ? (
              <p>
                <strong>[의뢰품 자동 수집]</strong> {missionContext.item.name} (
                <span
                  style={{
                    color:
                      collectedMissionQuality === 'shining'
                        ? '#ffd700'
                        : collectedMissionQuality === 'broken'
                          ? '#f87171'
                          : '#86efac',
                    fontWeight: 800,
                  }}
                >
                  {collectedMissionQuality === 'shining'
                    ? '빛나는'
                    : collectedMissionQuality === 'broken'
                      ? '부서진'
                      : '일반'}
                </span>
                ) 획득 완료!
                <br />
                전투 전리품은 두 가지 중 하나를 선택하세요.
              </p>
            ) : (
              <p>
                의뢰품은 대상 몹 처치 시 자동 수집됩니다.
                <br />
                전투 보상은 두 가지 중 하나를 선택하세요.
              </p>
            )}
          </div>

          {rewardChoices ? (
            <div className="reward-choices">
              <button
                type="button"
                id="rewardA"
                onClick={() =>
                  onVictory(
                    battleState.totalMobDamageTaken,
                    rewardChoices.optionA,
                    collectedMissionQuality,
                    battleState.hero.hp,
                    currentEffects,
                  )
                }
              >
                <span className="tag">
                  {rewardChoices.optionA.type === 'permanent'
                    ? 'A · 영구 스탯'
                    : rewardChoices.optionA.type === 'combat'
                      ? 'A · 공방 효과'
                      : rewardChoices.optionA.type === 'vital'
                        ? 'A · 피 효과'
                        : 'A · 보너스'}
                </span>
                <b>{rewardChoices.optionA.name}</b>
                <small>{rewardChoices.optionA.description}</small>
                <div className="reward-icon-box">
                  <PixelSprite id={rewardChoices.optionA.assetId} scale={0.7} />
                </div>
              </button>

              <button
                type="button"
                id="rewardB"
                onClick={() =>
                  onVictory(
                    battleState.totalMobDamageTaken,
                    rewardChoices.optionB,
                    collectedMissionQuality,
                    battleState.hero.hp,
                    currentEffects,
                  )
                }
              >
                <span className="tag">
                  {rewardChoices.optionB.type === 'permanent'
                    ? 'B · 영구 스탯'
                    : rewardChoices.optionB.type === 'combat'
                      ? 'B · 공방 효과'
                      : rewardChoices.optionB.type === 'vital'
                        ? 'B · 피 효과'
                        : 'B · 보너스'}
                </span>
                <b>{rewardChoices.optionB.name}</b>
                <small>{rewardChoices.optionB.description}</small>
                <div className="reward-icon-box">
                  <PixelSprite id={rewardChoices.optionB.assetId} scale={0.7} />
                </div>
              </button>
            </div>
          ) : (
            <div className="action-float">
              <button
                type="button"
                className="gold-btn"
                onClick={() =>
                  onVictory(
                    battleState.totalMobDamageTaken,
                    undefined,
                    collectedMissionQuality,
                    battleState.hero.hp,
                    currentEffects,
                  )
                }
              >
                다음으로　◆
              </button>
            </div>
          )}
        </div>
      )}

      {/* 2. 패배 결과 안내 */}
      {phase === 'defeat' && (
        <div className="battle-result-card">
          <h2>용사는 전투에서 힘이 다해 쓰러졌습니다.</h2>
          <button
            type="button"
            className="gold-btn"
            onClick={() => onDefeat(battleState.hero.hp, currentEffects)}
          >
            결과 확인
          </button>
        </div>
      )}

      {/* 3. 전투 전/전투 중 헤더 및 코드, 버튼 레이아웃 */}
      {phase !== 'victory' && phase !== 'defeat' && (
        <>
          {/* 상단: 몹 프레임 및 HP 바 */}
          <div className="battle-head float-panel">
            <div className="battle-main">
              <div className="battle-art">
                <PixelSprite
                  id={isSleepingCard && phase === 'encounter-choice' ? 'event-sleeping-mob-128' : mobAssetId}
                  palette={isSleepingCard && phase === 'encounter-choice' ? undefined : getAssetRegionPalette(mobAssetId, region)}
                  scale={1.2}
                />
              </div>
              <div className="battle-data">
                <small>
                  MONSTER ENCOUNTER · {region.toUpperCase()}
                  {isSleepingCard ? ' · 잠든 몹' : ''}
                </small>
                <h2>
                  <strong style={{ fontWeight: 900 }}>{battleState.mob.name}</strong>
                  {battleState.mob.charged && <span className="badge charge">차지</span>}
                  {battleState.mob.defending && <span className="badge defend">방어</span>}
                  {battleState.mob.countering && <span className="badge counter">카운터</span>}
                </h2>
                <div className="enemy-hp">
                  <div
                    className="fill"
                    style={{ width: `${Math.max(0, (battleState.mob.hp / battleState.mob.maxHp) * 100)}%` }}
                  />
                </div>
                <div className="enemy-hp-num">
                  <span>HP</span>
                  <span>{Math.max(0, battleState.mob.hp)} / {battleState.mob.maxHp}</span>
                </div>
              </div>
            </div>

            <div className="battle-status">
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{message}</span>
              <span>
                TURN <b>{String(battleState.turnCount + 1).padStart(2, '0')}</b>
              </span>
            </div>
          </div>

          {/* 중앙: 코드 패널 */}
          <pre className="code-panel battle-code" aria-label="전투 코드">
            {codeDisplay}
          </pre>

          {/* 하단: 액션 버튼군 */}
          <div className="battle-actions">
            {phase === 'encounter-choice' && (
              isSleepingCard ? (
                <>
                  <button type="button" className="gold-btn" onClick={handleFight}>
                    깨워서 싸운다
                  </button>
                  <button type="button" className="light-btn" onClick={handleSneak}>
                    몰래 지나간다 ({sleepDepth === 'light' ? '선잠' : '깊은잠'})
                  </button>
                </>
              ) : (
                <>
                  <button type="button" className="gold-btn" onClick={handleFight}>
                    싸운다
                  </button>
                  <button type="button" className="light-btn" onClick={handleFlee}>
                    도망간다 ({heroHitPct}%)
                  </button>
                </>
              )
            )}

            {(phase === 'ambush-alert' || phase === 'flee-failed') && (
              <button
                type="button"
                className="gold-btn"
                style={{ flex: 1 }}
                onClick={() => setPhase('in-battle')}
              >
                전투 시작
              </button>
            )}

            {phase === 'in-battle' && (
              <>
                <button
                  type="button"
                  className="gold-btn"
                  disabled={battleState.activeActor !== 'hero'}
                  onClick={() => handleHeroAction('attack')}
                >
                  {battleState.hero.charged ? '차지공격' : '공격'}
                </button>
                <button
                  type="button"
                  className="light-btn"
                  disabled={battleState.activeActor !== 'hero'}
                  onClick={() => handleHeroAction('defend')}
                >
                  {battleState.hero.charged ? '카운터' : '방어'}
                </button>
                <button
                  type="button"
                  className="light-btn"
                  disabled={battleState.activeActor !== 'hero' || battleState.hero.charged}
                  onClick={() => handleHeroAction('charge')}
                >
                  차지
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
