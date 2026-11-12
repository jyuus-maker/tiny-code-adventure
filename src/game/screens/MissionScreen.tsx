import { PixelSprite } from '../../render/PixelSprite';
import { GAME_FRAME_HEIGHT, GAME_FRAME_WIDTH } from '../frame';
import type { MissionContext } from '../gameState';

const TITLE_BG_ASSET_ID = 'bg-title-adventure-512';
const KIND_LABEL = { battle: '배틀 의뢰', explore: '탐색 의뢰' } as const;
const DIFFICULTY_LABEL = { normal: '노멀', hard: '하드' } as const;

export type MissionScreenProps = {
  context: MissionContext;
  onDepart: () => void;
};

export function MissionScreen({ context, onDepart }: MissionScreenProps) {
  const { mission, client, item } = context;

  return (
    <section className="screen mission-screen" data-scene="mission">
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

      <div className="mission-modal">
        {/* 상단 헤더 */}
        <div className="mh">
          <b>◆　오늘의 의뢰</b>
          <span>
            {KIND_LABEL[mission.kind]}　/　{DIFFICULTY_LABEL[mission.difficulty]}
          </span>
        </div>

        {/* 미션 본문 내용 */}
        <div className="mission-content">
          {/* 의뢰인 초상화 아트 */}
          <div className="client-art">
            <div className="sprite-holder">
              <PixelSprite id={client.sceneAssetId} scale={2} />
            </div>
            <span>{client.name}</span>
          </div>

          {/* 의뢰 텍스트 정보 */}
          <div className="mission-info">
            <div className="mission-desc">
              <div className="mini">THE REQUEST · VILLAGE QUEST</div>
              <h2>{item.name}을(를) 구해 주세요.</h2>
              <p className="speaker">{client.name}</p>
              <blockquote>{mission.dialogue}</blockquote>
            </div>

            <div className="objective">
              <span className="objective-ic">◈</span>
              <div>
                <small>의뢰 목표</small>
                <b>
                  {item.name} <em>× {mission.count}</em>
                </b>
              </div>
            </div>
          </div>
        </div>

        {/* 하단 확인 및 수락 버튼 */}
        <div className="mission-bottom">
          <span>의뢰를 확인하고 출발해 주세요.</span>
          <button className="gold-btn" type="button" onClick={onDepart}>
            의뢰 수락　◆
          </button>
        </div>
      </div>
    </section>
  );
}
