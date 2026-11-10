import type { Rng } from './rng';

/**
 * Box-Muller 변환을 사용한 표준 정규분포 N(0, 1) 표본 추출
 */
function sampleStandardNormal(rng: Rng): number {
  // log(0) 방지를 위해 1 - rng() 사용 (0 < u1 <= 1)
  const u1 = 1 - rng();
  const u2 = rng();
  return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
}

/**
 * 감마 분포 Gamma(alpha, 1) 표본 추출
 * - alpha >= 1: Marsaglia & Tsang (2000) 방식
 * - alpha < 1: sampleGamma(alpha + 1) * U^(1/alpha)
 */
export function sampleGamma(alpha: number, rng: Rng = Math.random): number {
  if (alpha <= 0) {
    throw new Error(`alpha must be positive, got ${alpha}`);
  }

  if (alpha < 1) {
    const u = 1 - rng();
    return sampleGamma(alpha + 1, rng) * Math.pow(u, 1 / alpha);
  }

  const d = alpha - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);

  while (true) {
    const z = sampleStandardNormal(rng);
    const v = 1 + c * z;
    if (v <= 0) {
      continue;
    }
    const v3 = v * v * v;
    const u = 1 - rng(); // (0, 1]

    // 빠른 수락 조건
    if (u < 1 - 0.0331 * z * z * z * z) {
      return d * v3;
    }

    if (Math.log(u) < 0.5 * z * z + d * (1 - v3 + Math.log(v3))) {
      return d * v3;
    }
  }
}
