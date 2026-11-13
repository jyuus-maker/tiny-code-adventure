import { useState } from 'react';
import { PixelSprite } from '../../render/PixelSprite';
import { GAME_FRAME_HEIGHT, GAME_FRAME_WIDTH } from '../frame';

const TITLE_BG_ASSET_ID = 'bg-title-adventure-512';

export type TitleScreenProps = {
  onStart: () => void;
};

export function TitleScreen({ onStart }: TitleScreenProps) {
  const [helpOpen, setHelpOpen] = useState(false);

  return (
    <section className="screen title-screen" data-scene="title">
      {/* 1. 배경 아트 (512x512 원본을 800x500으로 강제 전체 화면 맞춤) */}
      <div className="pix-bg" aria-hidden="true">
        <PixelSprite
          id={TITLE_BG_ASSET_ID}
          width={GAME_FRAME_WIDTH}
          height={GAME_FRAME_HEIGHT}
          preserveAspectRatio="none"
        />
      </div>
      <div className="title-haze" aria-hidden="true" />

      {/* 2. 상단 브랜드 라인 */}
      <div className="top-line">
        <span>TINY ARCADE · ORIGINAL GAME</span>
        <span>JAVA / JAVASCRIPT / TYPESCRIPT</span>
      </div>

      {/* 3. 코딩 심볼 문장 crest */}
      <div className="title-crest" aria-hidden="true">
        〈/〉
      </div>

      {/* 4. 타이틀 텍스트 헤드 */}
      <div className="title-head">
        <div className="eyebrow">TINY ARCADE PRESENTS</div>
        <h1>코드용사의 모험</h1>
        <p>서른 장의 카드 · 세 언어의 땅 · 하나의 의뢰</p>
      </div>

      {/* 5. 우측 3D 카드 레일 데코레이션 */}
      <div className="title-rail" aria-hidden="true">
        <div className="title-card one" />
        <div className="title-card two" />
        <div className="title-card three" />
      </div>

      {/* 6. 액션 버튼군 */}
      <div className="title-actions">
        <button
          className="gold-btn"
          type="button"
          onClick={onStart}
          disabled={helpOpen}
        >
          모험 시작　◆
        </button>
        <button
          className="light-btn"
          type="button"
          onClick={() => setHelpOpen(true)}
        >
          도움말
        </button>
      </div>

      {/* 7. 하단 풋노트 */}
      <div className="title-foot">CODE ADVENTURER　•　WEB MINI GAME</div>

      {/* 8. 도움말 모달 레이어 */}
      {helpOpen && (
        <div className="help-layer show" role="dialog" aria-label="도움말">
          <div className="gold-panel help-panel">
            <h2>도움말</h2>
            <p>
              ◆ 카드 길을 따라 모험합니다. 선두 카드는 자동으로 펼쳐집니다.
              <br />
              ◆ 전투: 공격 / 방어 / 차지 · 전투 전 도망 선택 가능
              <br />
              ◆ 패스는 참여 게이지에 포함되지 않습니다.
              <br />
              ◆ 의뢰품을 모으면 귀가를 선택할 수 있습니다.
              <br />
              ◆ 제한 시간과 HP가 소진되면 모험이 종료됩니다.
            </p>
            <div style={{ textAlign: 'right', marginTop: 19 }}>
              <button
                className="gold-btn"
                type="button"
                onClick={() => setHelpOpen(false)}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
