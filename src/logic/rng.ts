export type Rng = () => number;

/**
 * mulberry32 32비트 시드 난수 생성기
 * 반환값: 0 이상 1 미만의 부동소수점 실수
 */
export function createSeededRng(seed: number): Rng {
  let s = seed >>> 0;
  return function rng(): number {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
