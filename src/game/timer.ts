import { ADVENTURE_TIME_LIMIT_SEC } from '../config';

/**
 * TinyArcade 플랫폼 세션이 제공하는 타이머 정보.
 * 현재 저장소에 플랫폼 SDK 연동 계층이 아직 연결되어 있지 않으므로,
 * 향후 SDK 연동 시 플랫폼이 전달한 남은 시간을 주입할 수 있는 경계 타입으로 둔다.
 */
export type PlatformTimerSession = {
  remainingSeconds: number;
};

/** 유효한 플랫폼 세션이 존재하고 숫자형 남은 시간을 제공하는지 확인한다. */
export function hasValidPlatformSession(
  session?: PlatformTimerSession | null,
): session is PlatformTimerSession {
  return (
    session != null &&
    typeof session.remainingSeconds === 'number' &&
    Number.isFinite(session.remainingSeconds)
  );
}

/** 실제 시각(deadlineMs - nowMs) 기준으로 남은 초를 올림 계산한다(0 미만 방지). */
export function computeRemainingSeconds(
  deadlineMs: number,
  nowMs: number,
): number {
  const remainingMs = Math.max(0, deadlineMs - nowMs);
  return remainingMs === 0 ? 0 : Math.ceil(remainingMs / 1000);
}

/** 남은 초를 MM:SS 형식 문자열로 변환한다. */
export function formatRemainingTime(seconds: number): string {
  const safe = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  const mm = String(Math.floor(safe / 60)).padStart(2, '0');
  const ss = String(safe % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

/** 플랫폼 세션 유무에 따라 표시할 남은 시간을 결정한다. */
export function resolveDisplayedRemainingSeconds(
  localRemainingSeconds: number = ADVENTURE_TIME_LIMIT_SEC,
  platformSession?: PlatformTimerSession | null,
): number {
  if (hasValidPlatformSession(platformSession)) {
    return Math.max(0, Math.floor(platformSession.remainingSeconds));
  }
  return Math.max(0, Math.floor(localRemainingSeconds));
}
