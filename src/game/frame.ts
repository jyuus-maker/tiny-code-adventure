import { useEffect, useState } from 'react';

/** 게임 화면 논리 프레임 (메인스펙 §6-1: 800×500 고정 비율) */
export const GAME_FRAME_WIDTH = 800;
export const GAME_FRAME_HEIGHT = 500;

function computeScale(viewportWidth: number, viewportHeight: number): number {
  if (viewportWidth <= 0 || viewportHeight <= 0) return 1;
  return Math.min(
    viewportWidth / GAME_FRAME_WIDTH,
    viewportHeight / GAME_FRAME_HEIGHT,
  );
}

function readScale(): number {
  if (typeof window === 'undefined') return 1;
  return computeScale(window.innerWidth, window.innerHeight);
}

/**
 * 뷰포트(iframe 포함)에 800×500 비율을 유지하며 맞추는 배율.
 * 프레임 전체가 보이도록 가로·세로 중 작은 쪽에 맞춘다.
 */
export function useFrameScale(): number {
  const [scale, setScale] = useState(readScale);

  useEffect(() => {
    const onResize = () => setScale(readScale());
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return scale;
}
