import { useState } from 'react';
import { PixelSprite } from '../../render/PixelSprite';
import { GAME_FRAME_HEIGHT } from '../frame';

const TITLE_BG_ASSET_ID = 'bg-title-adventure-512';
const TITLE_BG_SOURCE_SIZE = 512;

/** 도움말 항목 자리. 기본 조작·진행 규칙만 두고 공략은 넣지 않는다. 최종 문구는 별도 작업. */
const HELP_SECTIONS: readonly string[] = [
  '조작: 공격 / 방어 / 차지',
  '차지 다음 행동',
  '전투 전 도망',
  '패스와 참여 게이지',
  '미션과 귀가',
  '시간과 엔딩',
];

export type TitleScreenProps = {
  onStart: () => void;
};

export function TitleScreen({ onStart }: TitleScreenProps) {
  const [helpOpen, setHelpOpen] = useState(false);

  return (
    <>
      <div className="game-title-bg" aria-hidden="true">
        {/* 타이틀 배경은 예외 배율: 512px 원본을 프레임 높이에 맞춘다 (메인스펙 §2 표시 배율) */}
        <PixelSprite
          id={TITLE_BG_ASSET_ID}
          scale={GAME_FRAME_HEIGHT / TITLE_BG_SOURCE_SIZE}
        />
      </div>

      <div className="game-title-content">
        <h1>코드용사의 모험</h1>
        <div className="game-title-buttons">
          <button
            type="button"
            className="game-button-primary"
            onClick={onStart}
            disabled={helpOpen}
          >
            시작
          </button>
          <button type="button" onClick={() => setHelpOpen(true)}>
            도움말
          </button>
        </div>
      </div>

      {helpOpen && (
        <div className="game-help" role="dialog" aria-label="도움말">
          <div className="game-help-panel">
            <h2>도움말</h2>
            <ul className="game-help-list">
              {HELP_SECTIONS.map((title) => (
                <li key={title}>
                  {title} <span>(문구 작성 예정)</span>
                </li>
              ))}
            </ul>
            <div className="game-screen-footer">
              <button type="button" onClick={() => setHelpOpen(false)}>
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
