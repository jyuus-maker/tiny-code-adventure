import type { HeroMissionInventory } from './gameState';

export type TinyArcadeStartResult = {
  sessionId: string | null;
  testMode: boolean;
  loggedIn: boolean;
};

export type TinyArcadeSubmitResult = {
  score: number;
  verifyStatus: 'NORMAL' | 'PENDING' | null;
  testMode: boolean;
};

export type TinyArcadeError = {
  code?: string;
  message?: string;
};

declare global {
  interface Window {
    TinyArcade?: {
      version: string;
      start(): Promise<TinyArcadeStartResult>;
      submitScore(score: number): Promise<TinyArcadeSubmitResult>;
    };
  }
}

export type SdkSessionState = {
  status: 'idle' | 'starting' | 'started' | 'error';
  sessionId: string | null;
  testMode: boolean;
  loggedIn: boolean;
  errorMessage: string | null;
};

export type SdkSubmitState = {
  status: 'idle' | 'submitting' | 'submitted' | 'error';
  verifyStatus: 'NORMAL' | 'PENDING' | null;
  testMode: boolean;
  submittedScore: number | null;
  errorMessage: string | null;
};

export const INITIAL_SDK_SESSION_STATE: SdkSessionState = {
  status: 'idle',
  sessionId: null,
  testMode: false,
  loggedIn: false,
  errorMessage: null,
};

export const INITIAL_SDK_SUBMIT_STATE: SdkSubmitState = {
  status: 'idle',
  verifyStatus: null,
  testMode: false,
  submittedScore: null,
  errorMessage: null,
};

/** 0 이상, 소수 둘째 자리까지의 최종 점수를 계산한다 */
export function computeRunScore(params: {
  heroDead: boolean;
  totalMobDamage: number;
  scoreItemPoints: number;
  missionInventory: HeroMissionInventory;
  missionTargetCount: number | null;
}): {
  isMissionCompleted: boolean;
  missionBonus: number;
  totalScore: number;
} {
  const {
    heroDead,
    totalMobDamage,
    scoreItemPoints,
    missionInventory,
    missionTargetCount,
  } = params;
  const isMissionCompleted =
    missionTargetCount !== null
      ? missionInventory.totalCollected >= missionTargetCount
      : false;
  const missionBonus =
    !heroDead && isMissionCompleted
      ? missionInventory.shining * 300 +
        missionInventory.normal * 150 +
        missionInventory.broken * 50
      : 0;
  const rawTotal = totalMobDamage + scoreItemPoints + missionBonus;
  const totalScore = Math.max(0, Math.round(rawTotal * 100) / 100);
  return { isMissionCompleted, missionBonus, totalScore };
}

export async function startTinyArcadeSession(): Promise<TinyArcadeStartResult> {
  if (typeof window === 'undefined' || !window.TinyArcade) {
    return { sessionId: null, testMode: false, loggedIn: false };
  }
  return window.TinyArcade.start();
}

export async function submitTinyArcadeScore(
  score: number,
): Promise<TinyArcadeSubmitResult> {
  const sanitizedScore = Number.isFinite(score)
    ? Math.max(0, Math.round(score * 100) / 100)
    : 0;
  if (typeof window === 'undefined' || !window.TinyArcade) {
    throw {
      code: 'SDK_UNAVAILABLE',
      message: '플랫폼 SDK를 불러올 수 없습니다.',
    } satisfies TinyArcadeError;
  }
  return window.TinyArcade.submitScore(sanitizedScore);
}

export function extractSdkErrorMessage(err: unknown): string {
  if (
    err &&
    typeof err === 'object' &&
    'message' in err &&
    typeof (err as { message: unknown }).message === 'string' &&
    (err as { message: string }).message.trim().length > 0
  ) {
    return (err as { message: string }).message;
  }
  return '점수 처리 중 오류가 발생했습니다.';
}

export type SdkNotice = {
  tone: 'ok' | 'info' | 'warn';
  text: string;
};

export function getSessionNotice(session: SdkSessionState): SdkNotice | null {
  if (session.status === 'error' && session.errorMessage) {
    return { tone: 'warn', text: session.errorMessage };
  }
  if (session.status === 'started') {
    if (session.testMode) {
      return { tone: 'info', text: '미리보기 · 기록 안 됨' };
    }
    if (!session.loggedIn) {
      return { tone: 'info', text: '로그인하면 점수가 기록됩니다' };
    }
  }
  return null;
}

export function getSubmitNotice(
  submit: SdkSubmitState,
  session?: SdkSessionState,
): SdkNotice | null {
  if (submit.status === 'submitting') {
    return { tone: 'info', text: '점수 제출 중...' };
  }
  if (submit.status === 'submitted') {
    if (submit.testMode) {
      return { tone: 'info', text: '미리보기 · 기록 안 됨' };
    }
    if (submit.verifyStatus === 'PENDING') {
      return { tone: 'ok', text: '기록 완료 · 검증 중' };
    }
    return { tone: 'ok', text: '점수 기록 완료' };
  }
  if (submit.status === 'error' && submit.errorMessage) {
    return { tone: 'warn', text: submit.errorMessage };
  }
  return session ? getSessionNotice(session) : null;
}
