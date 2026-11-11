import { RenderCheck } from './dev/RenderCheck';
import { resolveEntryView } from './entryView';
import { GameApp } from './game/GameApp';

// 진입 화면은 모듈 로드 시 URL query로 한 번만 결정한다.
// 기본: 게임 타이틀 / `?view=rendercheck`: 기존 개발 검증 화면
const entryView = resolveEntryView(
  typeof window === 'undefined' ? '' : window.location.search,
);

function App() {
  return entryView === 'rendercheck' ? <RenderCheck /> : <GameApp />;
}

export default App;
