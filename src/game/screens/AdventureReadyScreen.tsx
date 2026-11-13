import type { Region } from '../../config';
import type { TimeOfDay } from '../../data/types';
import { PixelSprite } from '../../render/PixelSprite';
import { GAME_FRAME_HEIGHT, GAME_FRAME_WIDTH } from '../frame';
import type { MissionContext, StatRollResult } from '../gameState';
import { getSessionNotice, type SdkSessionState } from '../sdk';

const TITLE_BG_ASSET_ID = 'bg-title-adventure-512';
const KIND_LABEL = { battle: '배틀', explore: '탐색' } as const;
const DIFFICULTY_LABEL = { normal: '노멀', hard: '하드' } as const;

export type AdventureReadyScreenProps = {
  roll: StatRollResult;
  context: MissionContext;
  regionOrder: readonly Region[];
  participationCount: number;
  timeOfDay: TimeOfDay;
  sdkSession?: SdkSessionState;
  onEnterAdventure: () => void;
};

export function AdventureReadyScreen({
  roll,
  context,
  sdkSession,
  onEnterAdventure,
}: AdventureReadyScreenProps) {
  const { heroStats } = roll;
  const { mission, client, item } = context;
  const sdkNotice = sdkSession ? getSessionNotice(sdkSession) : null;

  return (
    <section className="screen ready-screen" data-scene="ready">
      {/* 배경 아트 & 딤 (타이틀과 동일한 800x500 배경 + 딤 적용) */}
      <div className="pix-bg" aria-hidden="true">
        <PixelSprite
          id={TITLE_BG_ASSET_ID}
          width={GAME_FRAME_WIDTH}
          height={GAME_FRAME_HEIGHT}
          preserveAspectRatio="none"
        />
      </div>
      <div className="title-haze" aria-hidden="true" />

      <div className="gold-panel ready-card">
        <header>ADVENTURE READY</header>
        <h2>모험을 시작합니다</h2>

        <div className="ready-grid">
          {/* 좌측: 용사 상태 */}
          <section>
            <h3>◆　용사 상태</h3>
            <p>
              HP <b>{heroStats.hp} / {heroStats.maxHp}</b>
              <br />
              공격 <b>{heroStats.attack}</b>　 /　방어 <b>{heroStats.defense}</b>
              <br />
              스탯 배분 완료
            </p>
          </section>

          {/* 우측: 진행 중인 의뢰 */}
          <section>
            <h3>◆　진행 중인 의뢰</h3>
            <p>
              의뢰인　<b>{client.name}</b>
              <br />
              목표　<b>{item.name} × {mission.count}</b>
              <br />
              유형　<b>{KIND_LABEL[mission.kind]} · {DIFFICULTY_LABEL[mission.difficulty]}</b>
            </p>
          </section>
        </div>

        {sdkNotice && (
          <p
            className="sdk-notice"
            style={{
              margin: '0 0 10px',
              fontSize: 12,
              textAlign: 'center',
              color:
                sdkNotice.tone === 'warn'
                  ? '#fca5a5'
                  : sdkNotice.tone === 'ok'
                    ? '#86efac'
                    : '#fde68a',
            }}
          >
            {sdkNotice.text}
          </p>
        )}

        <div className="ready-btn">
          <button
            className="gold-btn"
            type="button"
            onClick={onEnterAdventure}
          >
            카드 길로 출발　◆
          </button>
        </div>
      </div>
    </section>
  );
}
