export type EntryView = 'game' | 'rendercheck';

/**
 * URL query의 view 값으로 진입 화면을 정한다.
 * - `?view=rendercheck` 가 명시된 경우에만 기존 RenderCheck(개발 검증 화면)
 * - 그 외(쿼리 없음, 다른 값)는 게임 타이틀
 */
export function resolveEntryView(search: string): EntryView {
  const view = new URLSearchParams(search).get('view');
  return view === 'rendercheck' ? 'rendercheck' : 'game';
}
