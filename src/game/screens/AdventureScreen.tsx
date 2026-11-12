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
  REGION_DISPLAY,
  ROAD_ANIM,
  ROAD_GEOMETRY as G,
  ROAD_TILE_ASSET_ID,
  type PlacedProp,
  type RoadColors,
} from '../road';
import '../road.css';

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

  // 미션 아이콘 호버 툴팁 상태
  const [missionHovered, setMissionHovered] = useState(false);

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

      {/* 작업 04 HUD 시스템 (§4-7, §6-4) */}
      <div className="road-hud" aria-label="진행 정보" style={{ flexDirection: 'column', gap: 4, width: 'calc(100% - 24px)', maxWidth: 420 }}>
        {/* 1행: 지역 / 일차 / 참여수 / 타이머(미구현) */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', fontSize: 11 }}>
          <div className="road-hud-region" style={{ fontSize: 13, fontWeight: 700 }}>
            {REGION_DISPLAY[env.region]}
          </div>
          <div className="road-hud-progress" style={{ fontSize: 11 }}>
            {env.day}일차 {TIME_LABEL[env.timeOfDay]} · 참여 {participationCount} / {TOTAL_PARTICIPATION_CARDS}
          </div>
          <div style={{ fontSize: 10, color: '#94a3b8', background: 'rgba(0,0,0,0.4)', padding: '2px 6px', borderRadius: 4 }}>
            타이머 (미구현)
          </div>
        </div>

        {/* 2행: 용사 스탯 & HP 게이지 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', fontSize: 11 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
            <span style={{ fontWeight: 600 }}>HP</span>
            <div style={{ flex: 1, height: 8, background: '#0f172a', borderRadius: 4, overflow: 'hidden', border: '1px solid #334155' }}>
              <div
                style={{
                  height: '100%',
                  background: currentHp <= 0 ? '#ef4444' : '#10b981',
                  width: `${Math.max(0, Math.min(100, (currentHp / maxHp) * 100))}%`,
                  transition: 'width 0.2s',
                }}
              />
            </div>
            <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: 11 }}>
              {currentHp}/{maxHp}
            </span>
          </div>

          <div style={{ display: 'flex', gap: 8, fontVariantNumeric: 'tabular-nums' }}>
            <span>
              공격 <strong>{effectiveAtk}</strong>
              {atkDiff !== 0 && (
                <span style={{ color: atkDiff > 0 ? '#86efac' : '#f87171', fontSize: 10 }}>
                  ({atkDiff > 0 ? `+${atkDiff}` : atkDiff})
                </span>
              )}
            </span>
            <span>
              방어 <strong>{effectiveDef}</strong>
              {defDiff !== 0 && (
                <span style={{ color: defDiff > 0 ? '#86efac' : '#f87171', fontSize: 10 }}>
                  ({defDiff > 0 ? `+${defDiff}` : defDiff})
                </span>
              )}
            </span>
          </div>
        </div>

        {/* 3행: 공방 슬롯 (1칸), 피 슬롯 (1칸), 미션 슬롯 (1칸) */}
        <div style={{ display: 'flex', gap: 6, width: '100%', fontSize: 10, marginTop: 2 }}>
          {/* 공방 슬롯 */}
          <div
            style={{
              flex: 1,
              background: 'rgba(15, 23, 42, 0.75)',
              border: heroEffects?.combatSlot ? '1px solid #3b82f6' : '1px dashed #475569',
              borderRadius: 4,
              padding: '3px 6px',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              overflow: 'hidden',
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{ color: '#93c5fd', fontWeight: 600 }}>공방:</span>
            {heroEffects?.combatSlot ? (
              <span title={`${heroEffects.combatSlot.name} (${heroEffects.combatSlot.remainingTurns}턴 남음)`}>
                {heroEffects.combatSlot.name} (+{heroEffects.combatSlot.value}){' '}
                <span style={{ color: '#facc15' }}>{heroEffects.combatSlot.remainingTurns}T</span>
              </span>
            ) : (
              <span style={{ color: '#64748b' }}>비어 있음</span>
            )}
          </div>

          {/* 피 슬롯 */}
          <div
            style={{
              flex: 1,
              background: 'rgba(15, 23, 42, 0.75)',
              border: heroEffects?.vitalSlot ? '1px solid #10b981' : '1px dashed #475569',
              borderRadius: 4,
              padding: '3px 6px',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              overflow: 'hidden',
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{ color: '#86efac', fontWeight: 600 }}>피:</span>
            {heroEffects?.vitalSlot ? (
              <span title={`${heroEffects.vitalSlot.name} (${heroEffects.vitalSlot.remainingTurns}턴 남음)`}>
                {heroEffects.vitalSlot.name}{' '}
                <span style={{ color: '#facc15' }}>{heroEffects.vitalSlot.remainingTurns}T</span>
              </span>
            ) : (
              <span style={{ color: '#64748b' }}>비어 있음</span>
            )}
          </div>

          {/* 미션 슬롯 (호버 툴팁 지원) */}
          {missionContext && (
            <div
              style={{
                position: 'relative',
                background: 'rgba(15, 23, 42, 0.75)',
                border: '1px solid #eab308',
                borderRadius: 4,
                padding: '2px 6px',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                cursor: 'pointer',
              }}
              onMouseEnter={() => setMissionHovered(true)}
              onMouseLeave={() => setMissionHovered(false)}
              onClick={() => setMissionHovered((prev) => !prev)}
            >
              <PixelSprite id={missionContext.item.assetId} scale={0.5} />
              <span style={{ fontWeight: 600, color: '#fde047' }}>
                {missionInventory.totalCollected}/{missionContext.mission.count}
              </span>

              {/* 호버 툴팁 */}
              {missionHovered && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: '100%',
                    right: 0,
                    marginBottom: 6,
                    background: '#0f172a',
                    border: '1px solid #eab308',
                    borderRadius: 6,
                    padding: '6px 8px',
                    fontSize: 10,
                    color: '#f8fafc',
                    whiteSpace: 'nowrap',
                    zIndex: 100,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                  }}
                >
                  <div style={{ fontWeight: 600, color: '#fde047', marginBottom: 2 }}>
                    {missionContext.item.name}
                  </div>
                  <div>빛나는: {missionInventory.shining}개</div>
                  <div>일반: {missionInventory.normal}개</div>
                  <div>부서진: {missionInventory.broken}개</div>
                  <div style={{ color: '#94a3b8', fontSize: 9, marginTop: 2 }}>
                    (요구 수량: {missionContext.mission.count}개)
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {active && stage === 'open' && modalRect && (
        <div
          className="road-modal"
          role="dialog"
          aria-label={active.def.name}
          style={{
            left: modalRect.left,
            top: modalRect.top,
            width: modalRect.width,
            height: modalRect.height,
          }}
        >
          {active.def.kind === 'mob' ? (
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
            <>
              <div className="road-modal-head">
                <strong>{active.def.name}</strong>
                <span className="road-modal-env">
                  {REGION_DISPLAY[env.region]} · {env.day}일차 {TIME_LABEL[env.timeOfDay]}
                </span>
              </div>
              <dl className="road-modal-slots">
                <dt>지문</dt>
                <dd>미구현 (후속 이벤트·전투 작업)</dd>
              </dl>
              <div className="road-modal-actions" aria-label="개발 확인용 결과 입력">
                {DEV_OUTCOMES.map(({ kind, label, note }) => (
                  <button
                    key={kind}
                    type="button"
                    className="road-modal-btn"
                    disabled={!inputEnabled}
                    onClick={() => onOutcome(kind)}
                    title={note}
                  >
                    <span>{label}</span>
                    <small>{note}</small>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* 귀가 질문 모달 (§4-9) */}
      {returnPromptPending && (
        <div
          className="return-prompt-overlay"
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 120,
          }}
        >
          <div
            style={{
              background: '#1e293b',
              border: '2px solid #eab308',
              borderRadius: 8,
              padding: '16px 20px',
              maxWidth: 320,
              textAlign: 'center',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)',
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 700, color: '#fde047', marginBottom: 8 }}>
              미션 요구량 달성!
            </div>
            <p style={{ fontSize: 12, color: '#e2e8f0', lineHeight: 1.5, marginBottom: 16 }}>
              의뢰에 필요한 물품을 모두 모았습니다 ({missionInventory.totalCollected}/
              {missionContext?.mission.count}개).
              <br />
              지금 마을로 귀가하시겠습니까?
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button
                type="button"
                className="game-button-primary"
                style={{ padding: '8px 14px', fontSize: 12 }}
                onClick={() => onReturnDecision?.('return')}
              >
                마을로 귀가 (완료)
              </button>
              <button
                type="button"
                style={{
                  padding: '8px 14px',
                  fontSize: 12,
                  background: '#334155',
                  color: '#f8fafc',
                  border: '1px solid #64748b',
                  borderRadius: 4,
                  cursor: 'pointer',
                }}
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
      <div className="road-card-art">{sprite}</div>
      <div className="road-card-name">{card.def.name}</div>
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
