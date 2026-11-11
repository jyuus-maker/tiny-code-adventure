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
  /** 활성 카드가 없을 때(종료 직전) 장면 환경으로 쓸 값 */
  fallbackEnv: CardEnv;
  onArrived: () => void;
  onOutcome: (kind: CardOutcomeKind) => void;
  onExited: () => void;
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
  fallbackEnv,
  onArrived,
  onOutcome,
  onExited,
}: AdventureScreenProps) {
  const { active, preview, stage, advanceCount } = adventure;
  const env = active?.env ?? fallbackEnv;
  const isNight = env.timeOfDay === 'night';
  const distantBgId = getDistantBgId(env.region);
  const colors = getRoadColors(env.region, distantBgId);
  const pathPalette = getAssetRegionPalette(ROAD_TILE_ASSET_ID, env.region);
  const horizonY = computeHorizonY();

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

      <div className="road-hud" aria-label="진행 정보">
        <div className="road-hud-region">{REGION_DISPLAY[env.region]}</div>
        <div className="road-hud-progress">
          {env.day}일차 {TIME_LABEL[env.timeOfDay]} · 참여 {participationCount} /{' '}
          {TOTAL_PARTICIPATION_CARDS}
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
          <div className="road-modal-head">
            <strong>{active.def.name}</strong>
            <span className="road-modal-env">
              {REGION_DISPLAY[env.region]} · {env.day}일차 {TIME_LABEL[env.timeOfDay]}
            </span>
          </div>
          <dl className="road-modal-slots">
            <dt>지문</dt>
            <dd>미구현 (후속 이벤트·전투 작업)</dd>
            <dt>코드</dt>
            <dd>미구현 (CHK 06)</dd>
            <dt>선택지</dt>
            <dd>미구현</dd>
            <dt>결과</dt>
            <dd>미구현</dd>
          </dl>
          <div className="road-dev-input">
            <div className="road-dev-title">[개발 확인용 결과 입력] 실제 선택지가 아니다</div>
            {DEV_OUTCOMES.map((o) => (
              <button
                key={o.kind}
                type="button"
                disabled={!inputEnabled}
                onClick={() => onOutcome(o.kind)}
                title={o.note}
              >
                {o.label}
                <small>{o.note}</small>
              </button>
            ))}
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
