import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type Ref,
} from 'react';
import { NIGHT_CSS_FILTER, type Region } from '../../config';
import { PixelSprite } from '../../render/PixelSprite';
import { getAssetRegionPalette, getDistantBgId } from '../../render/region';
import {
  TOTAL_PARTICIPATION_CARDS,
  type AdventureState,
  type CardEnv,
  type CardInstance,
  type CardOutcomeKind,
  type CardStage,
} from '../adventure';
import { BattleModal } from '../battle/BattleModal';
import '../battle/battle.css';
import type { HeroStats } from '../../logic/statRoll';
import type { HeroEffectState } from '../../logic/effects/types';
import {
  getEffectiveAttack,
  getEffectiveDefense,
  getEffectiveMaxHp,
} from '../../logic/effects/slotManager';
import type { HeroMissionInventory, MissionContext } from '../gameState';
import type { RewardOption } from '../../logic/rewards/types';
import type { ItemGrade } from '../../render/types';
import { GAME_FRAME_HEIGHT, GAME_FRAME_WIDTH } from '../frame';
import {
  cardSlotDepth,
  computeHorizonY,
  getRoadColors,
  placeProps,
  ROAD_ANIM,
  ROAD_GEOMETRY as G,
  ROAD_TILE_ASSET_ID,
  type PlacedProp,
  type RoadColors,
} from '../road';
import '../road.css';

const REGION_NAME_MAP: Record<Region, string> = {
  warm: 'TS평원',
  desert: 'Java사막',
  cold: 'JS설원',
};

const REGION_LANG_MAP: Record<Region, string> = {
  warm: 'TypeScript',
  desert: 'Java',
  cold: 'JavaScript',
};

export type AdventureScreenProps = {
  adventure: AdventureState;
  participationCount: number;
  heroStats: HeroStats;
  heroEffects?: HeroEffectState | null;
  missionContext?: MissionContext | null;
  missionInventory?: HeroMissionInventory;
  returnPromptPending?: boolean;
  /** 활성 카드가 없을 때(종료 직전) 장면 환경으로 쓸 값 */
  fallbackEnv: CardEnv;
  onArrived: () => void;
  onOutcome: (kind: CardOutcomeKind) => void;
  onExited: () => void;
  onVictoryReward?: (
    reward?: RewardOption,
    quality?: ItemGrade | null,
    damage?: number,
    finalHp?: number,
    finalEffects?: HeroEffectState | null,
  ) => void;
  onDefeat?: (
    finalHp?: number,
    finalEffects?: HeroEffectState | null,
  ) => void;
  onEffectsTick?: (effects: HeroEffectState) => void;
  onReturnDecision?: (decision: 'return' | 'continue') => void;
};

type ModalRect = { left: number; top: number; width: number; height: number };

const TIME_LABEL = { day: '낮', night: '밤' } as const;

/** 개발 확인용 결과 입력. 실제 선택지·판정과 분리된 테스트 입력이다 */
const DEV_OUTCOMES: readonly { kind: CardOutcomeKind; label: string; note: string }[] = [
  { kind: 'pass', label: '패스', note: '참여 +0 · 옆으로 비켜남' },
  { kind: 'participate', label: '참여 확정', note: '전투 진입/이벤트 참여 · 참여 +1' },
  {
    kind: 'pass-forced-battle',
    label: '지나가기 → 강제 전투',
    note: '출렁다리형 · 다리 +0, 전투 +1 (합계 +1)',
  },
  {
    kind: 'participate-linked-battle',
    label: '참여 → 연결 전투',
    note: '상자 실패→미믹형 · 합계 +1',
  },
];

export function AdventureScreen({
  adventure,
  participationCount,
  heroStats,
  heroEffects = null,
  missionContext = null,
  missionInventory = { shining: 0, normal: 0, broken: 0, totalCollected: 0 },
  returnPromptPending = false,
  fallbackEnv,
  onArrived,
  onOutcome,
  onExited,
  onVictoryReward,
  onDefeat,
  onEffectsTick,
  onReturnDecision,
}: AdventureScreenProps) {
  const { active, preview, stage, advanceCount } = adventure;
  const env = active?.env ?? fallbackEnv;
  const isNight = env.timeOfDay === 'night';
  const distantBgId = getDistantBgId(env.region);
  const colors = getRoadColors(env.region, distantBgId);
  const pathPalette = getAssetRegionPalette(ROAD_TILE_ASSET_ID, env.region);
  const horizonY = computeHorizonY();

  // 실시간 유효 스탯 계산 (§4-7)
  const currentHp = heroEffects ? heroEffects.currentHp : heroStats.hp;
  const maxHp = heroEffects ? getEffectiveMaxHp(heroEffects) : heroStats.maxHp;
  const effectiveAtk = heroEffects ? getEffectiveAttack(heroEffects) : heroStats.attack;
  const effectiveDef = heroEffects ? getEffectiveDefense(heroEffects) : heroStats.defense;

  const baseAtk = heroEffects ? heroEffects.baseAttack + heroEffects.permanentAttackBonus : heroStats.attack;
  const baseDef = heroEffects ? heroEffects.baseDefense + heroEffects.permanentDefenseBonus : heroStats.defense;

  const atkDiff = effectiveAtk - baseAtk;
  const defDiff = effectiveDef - baseDef;

  const activeCardRef = useRef<HTMLDivElement | null>(null);
  // 모달 위치는 "어느 카드의 open 단계에서 쟀는가"와 함께 보관해, 카드·단계가 바뀌면 자동으로 무효가 된다
  const [measured, setMeasured] = useState<{ forId: number; rect: ModalRect } | null>(null);
  const activeId = active?.instanceId ?? null;

  // 최신 콜백을 ref에 보관해 타이머 효과가 단계·카드 변경 시에만 다시 걸리게 한다
  const latest = useRef({ onArrived, onExited });
  useEffect(() => {
    latest.current = { onArrived, onExited };
  });

  // 카드가 앞으로 나오고 충분히 그래픽을 본 뒤 모달이 열리도록 riseMs 지연 + 0.5초 대기 (사용자 요청 #1)
  const [modalOpenId, setModalOpenId] = useState<number | null>(null);

  useEffect(() => {
    if (activeId === null || stage !== 'open') return undefined;
    const t = setTimeout(() => {
      setModalOpenId(activeId);
    }, ROAD_ANIM.riseMs + 500);
    return () => clearTimeout(t);
  }, [stage, activeId]);

  const modalVisible = stage === 'open' && modalOpenId === activeId;

  // 단계별 연출 타이머. 규칙 전이는 부모(GameApp)가 소유하고, 여기서는 연출 종료 시점만 알린다.
  useEffect(() => {
    if (activeId === null) return undefined;
    if (stage === 'approach') {
      const t = setTimeout(() => latest.current.onArrived(), ROAD_ANIM.advanceMs);
      return () => clearTimeout(t);
    }
    if (stage === 'open') {
      const t = setTimeout(() => {
        const rect = measureCardRect(activeCardRef.current);
        if (rect) setMeasured({ forId: activeId, rect });
      }, ROAD_ANIM.riseMs + 20);
      return () => clearTimeout(t);
    }
    if (stage === 'closing') {
      const t = setTimeout(() => latest.current.onExited(), ROAD_ANIM.exitMs);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [stage, activeId]);

  const modalRect =
    stage === 'open' && measured && measured.forId === activeId ? measured.rect : null;
  const inputEnabled = modalRect !== null && !!active && !active.resolved;
  const tileSize = 128 * G.tileScale;
  const tileCount = Math.ceil(G.floorDepth / tileSize);
  const distantSize = 128 * G.distantScale;
  const props = placeProps(advanceCount);

  return (
    <div
      className="road-screen"
      style={
        {
          '--road-advance': `${ROAD_ANIM.advanceMs}ms`,
          '--road-rise': `${ROAD_ANIM.riseMs}ms`,
          '--road-modal': `${ROAD_ANIM.modalMs}ms`,
          '--road-exit': `${ROAD_ANIM.exitMs}ms`,
        } as CSSProperties
      }
    >
      <div
        className="road-scene"
        style={{
          background: colors.sky,
          filter: isNight ? NIGHT_CSS_FILTER : undefined,
          perspective: `${G.perspective}px`,
          perspectiveOrigin: `50% ${G.perspectiveOriginY * 100}%`,
        }}
      >
        <div
          className="road-distant"
          style={{
            width: distantSize,
            marginLeft: -distantSize / 2,
            top: horizonY - distantSize,
          }}
          aria-hidden="true"
        >
          <PixelSprite id={distantBgId} scale={G.distantScale} />
        </div>

        <div
          className="road-floor"
          style={{
            width: G.floorWidth,
            height: G.floorDepth,
            marginLeft: -G.floorWidth / 2,
            transform: `rotateX(${G.floorTilt}deg)`,
            background: colors.grass,
          }}
        >
          <div
            className="road-strip"
            style={{ width: tileSize, marginLeft: -tileSize / 2 }}
            aria-hidden="true"
          >
            {Array.from({ length: tileCount }, (_, i) => (
              <div key={i} className="road-tile" style={{ height: tileSize }}>
                <PixelSprite
                  id={ROAD_TILE_ASSET_ID}
                  palette={pathPalette}
                  scale={G.tileScale}
                />
              </div>
            ))}
          </div>

          {props.map((p) => (
            <TerrainProp key={`${p.def.id}-${p.wraps}`} placed={p} colors={colors} />
          ))}

          {active && (
            <RoadCard
              ref={activeCardRef}
              card={active}
              slot={0}
              stage={stage}
              region={env.region}
            />
          )}
          {preview.map((card, i) => (
            <RoadCard
              key={card.instanceId}
              card={card}
              slot={i + 1}
              stage={null}
              region={env.region}
            />
          ))}
        </div>
      </div>

      {/* v9.1 통합 HUD 시스템 (§4-7, §6-4) — 화면 4모서리 및 상단 배치로 중앙 모달과 시각적 간섭 완전 차단 */}

      {/* 1. 좌상단: 히어로 그룹 (190 x 144) */}
      <div className="hero-group gold-panel" aria-label="용사 상태">
        <div className="hero-brand">
          <div className="hero-logo" aria-hidden="true">〈/〉</div>
          <div>
            <div className="tiny-brand">TINY ARCADE</div>
            <div className="game-name">코드용사의 모험</div>
          </div>
        </div>
        <div className="hero-divider" />
        <div className="hp-row">
          <div className="hp-label">HP</div>
          <div className="hp-track">
            <div
              className="fill"
              style={{
                width: `${Math.max(0, Math.min(100, (currentHp / maxHp) * 100))}%`,
              }}
            />
            <div className="hp-num">{currentHp} / {maxHp}</div>
          </div>
        </div>
        <div className="hero-stats">
          <span className="stat-field">
            <span className="miniicon">⚔</span>
            <span>공격</span>
            <b>
              {effectiveAtk}
              {atkDiff !== 0 && (
                <small style={{ color: atkDiff > 0 ? '#86efac' : '#f87171', fontSize: 10, marginLeft: 2 }}>
                  ({atkDiff > 0 ? `+${atkDiff}` : atkDiff})
                </small>
              )}
            </b>
          </span>
          <span className="sep" />
          <span className="stat-field">
            <span className="miniicon">⬡</span>
            <span>방어</span>
            <b>
              {effectiveDef}
              {defDiff !== 0 && (
                <small style={{ color: defDiff > 0 ? '#86efac' : '#f87171', fontSize: 10, marginLeft: 2 }}>
                  ({defDiff > 0 ? `+${defDiff}` : defDiff})
                </small>
              )}
            </b>
          </span>
        </div>
      </div>

      {/* 2. 상단 중앙: 진행 게이지 & 타이머 (230px 위치, 340 x 69) */}
      <div className="progress-group" aria-label="진행 및 시간">
        <div className="progress-top">
          <div className="progress-title">
            ◆ 모험 진행<br />남은 시간
          </div>
          <div className="timer">10:00</div>
          <div className="count">
            <span>참여</span>
            <strong>{String(participationCount).padStart(2, '0')}</strong>
            <small>/30</small>
          </div>
        </div>
        <div className="pipbar" aria-label="참여 카드 진행도">
          {Array.from({ length: TOTAL_PARTICIPATION_CARDS }).map((_, i) => (
            <i key={i} className={i < participationCount ? 'on' : ''} />
          ))}
        </div>
      </div>

      {/* 3. 우상단: 리전 그룹 (190 x 144) (사용자 요청 #2: Java사막, TS평원, JS설원) */}
      <div className="region-group gold-panel" aria-label="지역 정보">
        <div className="where"><span>◆</span> 모험 지역</div>
        <div className="region-name">{REGION_NAME_MAP[env.region]}</div>
        <div className="sunmoon">{isNight ? '☾' : '☀'}</div>
        <div className="region-tail">
          {REGION_LANG_MAP[env.region]} · {env.day}일차 · {TIME_LABEL[env.timeOfDay]}
        </div>
      </div>

      {/* 4. 좌하단: 버프 슬롯 2개 (190 x 90) */}
      <div className="buff-group" aria-label="효과 슬롯 2개">
        {/* 슬롯 1: 공방 슬롯 */}
        <div
          className={`buff-slot ${heroEffects?.combatSlot ? '' : 'empty'}`}
          tabIndex={0}
          role="region"
          aria-label="공방 슬롯"
        >
          {heroEffects?.combatSlot ? (
            <>
              <span className="buff-top">
                {heroEffects.combatSlot.kind === 'atk-buff' ? 'AT' : 'DF'} +{heroEffects.combatSlot.value}
              </span>
              <div className="buff-visual">
                <div className={heroEffects.combatSlot.kind === 'atk-buff' ? 'spark' : 'shield'} />
              </div>
              <span className="buff-bottom">{heroEffects.combatSlot.remainingTurns}T</span>
              <div className="ui-tooltip">
                <strong>{heroEffects.combatSlot.name}</strong>
                <p>
                  공방 효과 · {heroEffects.combatSlot.grade === 'broken' ? '약' : '강'} 임시 효과
                  <br />
                  남은 지속시간 {heroEffects.combatSlot.remainingTurns}턴
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="buff-visual" />
              <div className="ui-tooltip">
                <strong>공방 효과 없음</strong>
                <p>비어 있는 공방 효과 슬롯</p>
              </div>
            </>
          )}
        </div>

        {/* 슬롯 2: 피 슬롯 */}
        <div
          className={`buff-slot ${heroEffects?.vitalSlot ? '' : 'empty'}`}
          tabIndex={0}
          role="region"
          aria-label="피 슬롯"
        >
          {heroEffects?.vitalSlot ? (
            <>
              <span className="buff-top">
                {heroEffects.vitalSlot.kind === 'temp-max-hp-up'
                  ? `MAX +${heroEffects.vitalSlot.value}`
                  : `HP +${heroEffects.vitalSlot.value}`}
              </span>
              <div className="buff-visual">
                <div className="leaf" />
              </div>
              <span className="buff-bottom">{heroEffects.vitalSlot.remainingTurns}T</span>
              <div className="ui-tooltip">
                <strong>{heroEffects.vitalSlot.name}</strong>
                <p>
                  피 효과 · 지속 효과
                  <br />
                  남은 지속시간 {heroEffects.vitalSlot.remainingTurns}턴
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="buff-visual" />
              <div className="ui-tooltip">
                <strong>피 효과 없음</strong>
                <p>비어 있는 피 효과 슬롯</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 5. 우하단: 퀘스트 패널 (190 x 90) */}
      {missionContext && (
        <div
          className="quest-panel gold-panel"
          tabIndex={0}
          role="region"
          aria-label="미션 수집 현황"
        >
          <div className="quest-header">
            ◆ 미션 · {missionContext.mission.difficulty === 'hard' ? '하드의뢰' : '노멀의뢰'}
          </div>
          <div className="quest-main-row">
            <div className="gem">
              <PixelSprite id={missionContext.item.assetId} scale={0.7} />
            </div>
            <div className="quest-two-lines">
              <div className="quest-title">{missionContext.item.name}</div>
              <div className="quest-sub-row">
                <span className="quest-category">수집품</span>
                <span className="quest-progress">
                  {missionInventory.totalCollected}/{missionContext.mission.count}
                </span>
              </div>
            </div>
          </div>
          <div className="ui-tooltip">
            <strong>{missionContext.item.name} · 수집 내역</strong>
            <p>
              ✦ 빛나는　{missionInventory.shining}개
              <br />
              ◆ 일반　　{missionInventory.normal}개
              <br />
              ◇ 부서진　{missionInventory.broken}개
              <br />
              요구 수량　{missionContext.mission.count}개
            </p>
          </div>
        </div>
      )}

      {/* 6. 모달 오픈 시 소프트 딤 배경 (카드 전진 및 떠오름 후 modalVisible 시점에 표시) */}
      {((stage === 'open' && modalVisible) || returnPromptPending) && (
        <div className="soft-dim" aria-hidden="true" />
      )}

      {/* 7. 활성 카드 모달 (전투 모달 또는 일반 이벤트 모달: modalVisible 시점에 표시) */}
      {active && stage === 'open' && modalVisible && (
        active.def.kind === 'mob' ? (
          <BattleModal
            card={active.def}
            region={env.region}
            timeOfDay={env.timeOfDay}
            dayIndex={env.day}
            heroStats={heroStats}
            heroEffects={heroEffects}
            missionContext={missionContext}
            onVictory={(totalDamage, reward, quality, finalHp, finalEffects) => {
              onVictoryReward?.(reward, quality, totalDamage, finalHp, finalEffects);
              onOutcome('participate');
            }}
            onFleeSuccess={() => onOutcome('pass')}
            onDefeat={(finalHp, finalEffects) => {
              onDefeat?.(finalHp, finalEffects);
            }}
            onTick={onEffectsTick}
          />
        ) : (
          <div className="event-floats">
            <div className="event-info float-panel">
              <div className="kicker">
                ADVENTURE · EVENT · {env.region.toUpperCase()}
              </div>
              <h2>{active.def.name}</h2>
              <p>
                길 위에서 사건이 발생했다.
                <br />
                선택지에 따라 결과가 결정됩니다.
              </p>
              <div className="art">
                <PixelSprite
                  id={active.def.assetId ?? 'event-herb-tree-128'}
                  scale={0.7}
                />
              </div>
            </div>

            <pre className="code-panel event-code-panel float-panel" aria-label="이벤트 코드">
{`let heroHp: number = ${currentHp};
let region: string = "${env.region}";
let isDay: boolean = ${!isNight};

// 사건 분기 및 조건식 판정
if (heroHp > 0) {
  event.resolve();
}`}
            </pre>

            <div className="action-float">
              {DEV_OUTCOMES.slice(0, 2).map(({ kind, label, note }) => (
                <button
                  key={kind}
                  type="button"
                  className={kind === 'participate' ? 'gold-btn' : 'light-btn'}
                  disabled={!inputEnabled}
                  onClick={() => onOutcome(kind)}
                  title={note}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )
      )}

      {/* 8. 귀가 선택 모달 (v9.1 .return-floats) */}
      {returnPromptPending && (
        <div className="return-floats">
          <div className="return-card float-panel">
            <div className="gem-text">◆</div>
            <h2>미션 요구량 달성!</h2>
            <p>
              의뢰품을 모두 모았습니다 ({missionInventory.totalCollected}/
              {missionContext?.mission.count}개).
              <br />
              지금 마을로 귀가하시겠습니까?
            </p>
            <div className="return-actions">
              <button
                type="button"
                className="gold-btn"
                onClick={() => onReturnDecision?.('return')}
              >
                마을로 귀가　◆
              </button>
              <button
                type="button"
                className="light-btn"
                onClick={() => onReturnDecision?.('continue')}
              >
                계속 모험하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** 떠오른 활성 카드의 프레임 내부 좌표(프레임 배율 보정) */
function measureCardRect(cardEl: HTMLDivElement | null): ModalRect | null {
  if (!cardEl) return null;
  const frameEl = cardEl.closest('.game-frame') as HTMLElement | null;
  if (!frameEl) return null;
  const f = frameEl.getBoundingClientRect();
  const c = cardEl.getBoundingClientRect();
  const s = f.width / GAME_FRAME_WIDTH || 1;
  const cardLeft = (c.left - f.left) / s;
  const cardTop = (c.top - f.top) / s;
  const cardW = c.width / s;
  const cardH = c.height / s;
  // TEMP: 모달은 카드와 같은 자리에 카드보다 조금 크게. 프레임 밖으로 나가지 않게 보정
  const width = Math.min(GAME_FRAME_WIDTH - 16, Math.max(340, cardW + 56));
  const height = Math.min(GAME_FRAME_HEIGHT - 16, Math.max(380, cardH + 40));
  const left = clamp(cardLeft + cardW / 2 - width / 2, 8, GAME_FRAME_WIDTH - width - 8);
  const top = clamp(cardTop + cardH / 2 - height / 2, 8, GAME_FRAME_HEIGHT - height - 8);
  return { left, top, width, height };
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

// ---------------------------------------------------------------------------
// 카드
// ---------------------------------------------------------------------------

type RoadCardProps = {
  card: CardInstance;
  slot: number;
  /** 활성 카드만 단계를 가진다. 예고 카드는 null */
  stage: CardStage | null;
  region: Region;
  ref?: Ref<HTMLDivElement>;
};

function RoadCard({ card, slot, stage, region, ref }: RoadCardProps) {
  const depth = cardSlotDepth(slot);
  const upright = -G.floorTilt;
  const leaning = -(G.floorTilt - G.cardLean);

  let transform = `translateY(${-depth}px) rotateX(${leaning}deg)`;
  let className = 'road-card';
  let duration = `var(--road-advance)`;

  if (stage === 'open') {
    transform =
      `translateY(${-depth}px) rotateX(${upright}deg) ` +
      `translateY(${-G.cardRiseLift}px) translateZ(${G.cardRiseZ}px) scale(${G.cardRiseScale})`;
    className += ' road-card-open';
    duration = `var(--road-rise)`;
  } else if (stage === 'closing') {
    const kind = card.outcome?.kind;
    duration = `var(--road-exit)`;
    if (kind === 'pass') {
      transform = `translateY(${-depth}px) rotateX(${upright}deg) translateX(${G.cardWidth * 1.3}px)`;
      className += ' road-card-exit-pass';
    } else {
      transform =
        `translateY(${-depth}px) rotateX(${upright}deg) ` +
        `translateY(${-G.cardRiseLift}px) rotateY(75deg) scale(0.55)`;
      className += ' road-card-exit-discard';
    }
  }

  const sprite = (
    <PixelSprite
      id={card.def.assetId}
      palette={getAssetRegionPalette(card.def.assetId, region)}
      scale={G.tileScale}
    />
  );

  const isFront = slot === 0;
  const cardTypeWord = card.def.kind === 'mob' ? 'BATTLE' : 'EVENT';

  return (
    <div
      ref={ref}
      className={className}
      data-instance-id={card.instanceId}
      data-base-id={card.def.baseId}
      data-slot={slot}
      style={{
        width: G.cardWidth,
        height: G.cardHeight,
        marginLeft: -G.cardWidth / 2,
        transform,
        transitionDuration: duration,
      }}
    >
      <small className="road-card-top">
        {isFront ? '◆　A D V E N T U R E　◆' : '◆'}
      </small>
      <div className="road-card-art">{sprite}</div>
      <span className="road-card-name">{card.def.name}</span>
      <span className="road-card-bottom">{cardTypeWord}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 길가 지형지물 (TEMP 종이공예 실루엣. 전용 픽셀 에셋이 들어오면 assetId로 교체)
// ---------------------------------------------------------------------------

function TerrainProp({ placed, colors }: { placed: PlacedProp; colors: RoadColors }) {
  const { def, depth } = placed;
  const transform = `translateY(${-depth}px) rotateX(${-G.floorTilt}deg)`;
  return (
    <div
      className="road-prop"
      data-prop-id={def.id}
      style={{ left: `calc(50% + ${def.x}px)`, transform }}
      aria-hidden="true"
    >
      {def.assetId ? (
        <PixelSprite id={def.assetId} scale={G.tileScale} />
      ) : (
        <PlaceholderShape shape={def.shape} colors={colors} />
      )}
    </div>
  );
}

function PlaceholderShape({
  shape,
  colors,
}: {
  shape: PlacedProp['def']['shape'];
  colors: RoadColors;
}) {
  if (shape === 'tree') {
    return (
      <svg width="96" height="120" viewBox="0 0 96 120" shapeRendering="crispEdges">
        <rect x="40" y="84" width="16" height="36" fill={colors.trunk} />
        <polygon points="48,0 92,56 4,56" fill={colors.foliage} />
        <polygon points="48,28 96,92 0,92" fill={colors.foliage} />
      </svg>
    );
  }
  if (shape === 'rock') {
    return (
      <svg width="88" height="64" viewBox="0 0 88 64" shapeRendering="crispEdges">
        <polygon points="8,64 0,36 20,8 56,0 88,24 80,64" fill={colors.rock} />
        <polygon points="20,8 56,0 60,24 28,30" fill={colors.grass} opacity="0.35" />
      </svg>
    );
  }
  return (
    <svg width="96" height="56" viewBox="0 0 96 56" shapeRendering="crispEdges">
      <ellipse cx="30" cy="36" rx="30" ry="20" fill={colors.foliage} />
      <ellipse cx="62" cy="30" rx="34" ry="26" fill={colors.foliage} />
    </svg>
  );
}
