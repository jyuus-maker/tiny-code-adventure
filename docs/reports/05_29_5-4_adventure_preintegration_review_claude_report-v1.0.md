# [Tiny Code Adventure] 작업 05 사전 통합 검수 보고 — 03·04 ↔ 06-A (Claude) v1.0

- 지시서: `docs/tasks/05_29_5-4_adventure_preintegration_review_claude-v1.0.md`
- 작성: IDE Claude / 2026-11-12
- 성격: 읽기 전용 정적 검수·통합 사전 분석. 소스·설정·기획·Git 변경 없음(병합·cherry-pick·패치 시행 안 함). 작업 05 구현과 통합·기술 검수는 중력이 담당이며 이 문서는 그 인계 자료다.
- 최상위 기준: Notion 메인스펙 v1.2(2026-11-11 판). 이미 검출된 I-01·I-02·I-03은 새 발견으로 집계하지 않고 의존 순서만 다룬다.

---

## 1. 읽은 자료·대상 HEAD·환경

| 항목 | 값 |
| --- | --- |
| Notion 메인스펙 v1.2 | `41559ce9…13408` 직접 열람(이전 검수에서 전문 확인, §4-3·4-6~9·5-4~6·6·8-3 재대조) |
| Notion 작업명세 모음 | `40c59ce9…4e246` 열람. 하위에 작업명세·보고서 MD 첨부와 "2026-11-12 교차검증 완료" 메모가 있다. 메모 요지: 중력이가 c443624 대조 결과 I-01·02·03은 코드 경로·빌드 재현으로 확인, I-04~07 검토, 11-13 아침 I-03→I-01→I-02 순으로 수정 예정, I-06·피해 스케일은 CHK 08 조율 항목. 이 외 별도의 교차검증 보고 원문은 로컬에 없다 |
| 로컬 MD | `05_29_5-4_adventure_events_code_cards_antigravity-v1.0.md`, `05_29_5-4_adventure_code_card_chk06_claude-v1.0.md`, `05_29_8-2_…chk08_claude_report-v1.0.md` 전부 로컬에 있음 |
| 작업 폴더 | `main` = `cc983bdf…` (= origin/main), status clean. 전환·수정 없음 |
| 대상 HEAD | `origin/work/adventure-03-04-antigravity` = `c4436244…` / `origin/work/adventure-chk06-claude` = `89a6c103…` / 공통 조상 `cc983bdf…` — 모두 지시서 해시와 일치 |
| 검수 방식 | 두 커밋을 스크래치 경로에 `git worktree add --detach`로 분리 체크아웃(정션으로 node_modules 연결) 후 정적 독해·타입/빌드 실행. 추가로 `git merge-tree --write-tree`(ref·작업 트리를 건드리지 않는 읽기 전용 명령)로 두 브랜치의 합성 트리 객체 `12263e5e…`를 만들고 `git archive`로 스크래치에 풀어 타입검사·빌드만 돌렸다. 저장소에는 아무 변경이 없다(검수 후 워크트리·정션 제거) |
| Node / npm | v24.19.0 / 11.17.0 |
| 브라우저 | 미사용(자동화 도구 없음). 화면 연결은 코드 추적만 |

---

## 2. 브랜치 변경면 비교표

### 2-1. 03·04 (c443624, 공통 조상 대비 29파일)

| 파일 | 역할 | 외부 의존(import) | 비고 |
| --- | --- | --- | --- |
| `src/logic/battle/{types,statCalc,encounter,mobAi,engine,index}.ts` (신규) | 전투 엔진·몹 생성·조우·AI | `config`(Region), `data/mobs`, `data/types`(TimeOfDay), `logic/rng` | 순수 함수. 코드 렌더러 미사용 |
| `src/logic/effects/{types,slotManager,index}.ts` (신규) | 영구/임시/피 효과 | `logic/statRoll` | |
| `src/logic/rewards/{types,roller,score,index}.ts` (신규) | 품질·등급·보상 2택1·점수 | `data/types`, `render/types`(ItemGrade), `logic/effects`, `logic/battle/types` | |
| `src/logic/balance/{types,collector,simulator,explore_scales,index}.ts` (신규) | 분석 수집기·시뮬레이터 | `data/mobs`, `logic/battle` | `explore_scales.ts` 절대경로 = I-03 |
| `src/data/mobs.ts` (수정) | 몹 9종 baseStats·regionVariants 추가 | — | `Mob` 타입은 이미 선택 필드로 존재, `types.ts` 미변경 |
| `src/game/gameState.ts` (수정) | heroEffects·미션 인벤토리·점수·귀가 질문 전이 | `logic/effects`, `logic/rewards/types` | |
| `src/game/GameApp.tsx` (수정) | 보상/귀가 핸들러, 귀가 질문 분기 | | I-02 위치 |
| `src/game/screens/AdventureScreen.tsx` (수정) | HUD 3행, 몹 카드→BattleModal, 귀가 모달 | `game/battle/BattleModal`, `logic/effects/slotManager` | 이벤트 카드는 "미구현" 플레이스홀더 + 개발용 결과 버튼 유지 |
| `src/game/battle/BattleModal.tsx`, `battle.css` (신규) | 전투 UI·보상·분석 기록 | `logic/battle`, `logic/effects`, `logic/rewards`, `logic/balance`, `render/PixelSprite`, `render/region`, `data/items`, `data/mobs` | 명중률 코드는 수제 템플릿 문자열(렌더러 미사용) |
| `dist/*` | 빌드 산출물 | | 해시 `index-C701fdpo.js` |

### 2-2. 06-A (89a6c10, 공통 조상 대비 8파일)

| 파일 | 역할 | 외부 의존 | 비고 |
| --- | --- | --- | --- |
| `src/data/codeSyntax.ts` (신규) | `NeutralCodeV2`·타입 추론·`evaluateCode`(Rng 주입, eval 없음)·`analyzeCode` | `logic/rng`(type), `data/types`(CodeVar·연산자 타입) | v1 `NeutralCode`를 구조적으로 포함 |
| `src/data/codeRender.ts` (수정) | 3언어 렌더: `==`/`===`, Java `(double)` 형변환, `Math.random()`, 주석 줄 끝 정렬, 결과변수 타입 추론 | `codeSyntax`, `config` | 시그니처 `renderCode(NeutralCodeV2, lang)`로 확장(v1 호환), `renderExpr(expr, lang?, env?)`에 인자 추가(기존 1인자 호출 호환) |
| `src/data/altarSyntax.ts` (신규) | 술식 6종 + 언어별 유효성표 + `classifyInscriptionChoice` → correct/compatible/wrong | `config` | `altar.ts`는 미변경 |
| `src/dev/chk06Checks.ts`, `src/dev/codeChk06Samples.ts` (신규) | 검증 실행기·샘플 F1~F7·경고 케이스·평가 케이스 | 위 모듈, `dev/codeSamples` | |
| `src/dev/sections/CodeRendererSection.tsx` (수정) | 코드 렌더러 탭에 CHK06 검증 69항목 표시 | | 탭 수 10 유지 |
| `dist/*` | 빌드 산출물 | | 해시 `index-roCgZ6RM.js`. `dist/index.html`이 CRLF로 저장돼 파일 전체가 diff |

### 2-3. 겹침과 충돌

| 구분 | 결과 |
| --- | --- |
| `src/` 동일 파일 수정 | **없음**(교집합 0). 두 브랜치 모두 `src/data/types.ts`, `src/config.ts`, `src/logic/rng.ts`, `src/dev/codeSamples.ts`, `src/data/altar.ts`, `src/data/events.ts`를 수정하지 않았고 import만 한다 |
| 텍스트 충돌(`merge-tree`) | `dist/index.html`(내용 충돌: 03-04는 LF+새 해시, 06-A는 CRLF+다른 해시), `dist/assets/*.js`(rename/delete, modify/delete). **소스 충돌 0건** |
| 합성 트리 타입검사 | `tsc -p tsconfig.app.json --noEmit`: 오류 3건 = 전부 I-03(`explore_scales.ts`). 그 외 타입 오류 없음 |
| 합성 트리 lint / 빌드 | oxlint src 통과, `vite build` 128 모듈 성공(03-04 124 + 06-A 신규 4) |
| 각 브랜치 단독 | 03-04: `tsc -b` FAIL(I-03), vite build OK. 06-A: `tsc -b` PASS, oxlint PASS, vite build OK(해시 `roCgZ6RM` = 커밋된 dist와 일치) |
| 06-A 검증기 독립 실행 | `runChk06Checks()` 69/69 PASS(렌더 36, 기존 샘플 QA 5, 경고 7, 평가 11, 확률 3, 술식 7). 확률 F1 표시 0.3 vs 실측 0.3015(20,000회, 시드 20261111) |

결론(변경면): 두 브랜치는 소스 수준에서 독립이며 타입·빌드 결합에 문제가 없다. `dist/`는 어느 쪽도 병합하지 말고 통합 후 `main`에서 다시 빌드한다(06-A 명세 §3과 일치). 단, "파일이 겹치지 않음"은 결합 안전을 뜻하지 않으며 실제 접점은 3절에 있다.

---

## 3. 연결 지점별 상태

상태 기호: **확인됨**(현재 코드로 성립) / **잠재 충돌**(통합 시 규칙·타입·데이터가 어긋남) / **미구현(05)**(작업 05 범위, 결함 아님) / **확인 불가**(실행 증거 없음).

### 3-1. 이벤트 중립 데이터 → 코드 변환 → 판정 → 효과 → 상태 → 카드 퇴장

| # | 접점 | 상태 | 코드 위치·근거 |
| --- | --- | --- | --- |
| C-1 | 이벤트 6종 원본 ID·그림·passable/branch | 확인됨 | `src/data/events.ts`(공통, 미변경). `situation`/`choices` 비어 있음 → 05가 채움 |
| C-2 | 이벤트 선택지 코드 타입 | **잠재 충돌(기술 결정)** | `src/data/types.ts:108~113` `EventChoice.code?: NeutralCode`(v1). 06-A의 `random`·`arith`·식 변수·주석은 `NeutralCodeV2`(`codeSyntax.ts:27~85`)에만 있다. v1 값은 v2 함수에 그대로 들어가지만(구조적 상위 타입), **실확률 `Math.random() < 0.3` 표현을 쓰는 이벤트 데이터는 v1 타입에 담을 수 없다.** 05가 `EventChoice.code`를 `NeutralCodeV2`로 넓히거나(`types.ts` 수정) 이벤트 데이터를 별도 타입으로 둬야 한다. 06-A는 `types.ts` 수정 금지였으므로 미결 상태로 남긴 것이 맞다 |
| C-3 | 지역 → 언어 매핑 | 확인됨 | `config.ts` `REGION_TO_LANGUAGE`(warm=TS, desert=Java, cold=JS). 카드 환경 `CardEnv.region`(`adventure.ts:24~30`)을 넣어 `renderCode(code, REGION_TO_LANGUAGE[env.region])` 호출 가능 |
| C-4 | 렌더 문법(if/switch, `==`/`===`, Java double, 결과변수 타입) | 확인됨 | `codeRender.ts`(06-A) 36개 렌더 케이스 PASS. switch 2케이스·default 없음·break는 렌더러가 고정 출력 |
| C-5 | 표시 코드와 실제 판정의 동일 원천 | 확인됨(계약) / **결정 필요(표현 방식)** | `evaluateCode(code, rng)`(`codeSyntax.ts:262~292`)가 같은 데이터로 `path`/`result`를 돌려준다. 그러나 **v1 `rate = 80` 방식이면 `result`는 80이고 성공 판정은 별도 난수(`rng() < 80/100`)가 필요**하며, v1.2 실확률 방식이면 `path`(then/else)가 곧 결과다. 어느 방식을 이벤트에 쓸지는 05 명세 §1의 조율 항목(사용자 승인). 두 방식을 섞으면 "코드가 확률을 말해 준다"는 원칙이 깨진다 |
| C-6 | 난수 주입 | **잠재 충돌** | `GameApp`은 `rng` prop을 카드 추첨에 쓰지만 `BattleModal`은 `Math.random` 고정(이전 보고 S-03). 05가 `evaluateCode`에 `GameApp`의 rng를 넘기면 이벤트만 재현 가능하고 전투는 불가. 통합 시 한 쪽으로 통일 권고(기술) |
| C-7 | 결과 → 효과 적용 | **미구현(05)** + 잠재 충돌 | 04가 제공하는 적용기는 `applyPermanentEffect`·`applyCombatSlotEffect`·`applyVitalEffect`(`slotManager.ts`)와 보상 1개용 `applyRewardChoice`(`gameState.ts`). `EventOutcome.effects?: unknown[]`(`types.ts:102~106`)는 자리만 있다. 상인(공방+피 동시), 제단(영구+강 임시 동시)은 **복수 효과를 한 번에 적용하는 상태 전이가 없다** → 05가 신규 전이(`applyEffects(list)` 등)를 추가해야 한다 |
| C-8 | 영구 HP 효과 단위 | **잠재 충돌(기획 미확정)** | `PermanentEffect.stat='hp'`의 value는 HP 단위로 `baseMaxHp`에 더해진다(`slotManager.ts:91~97`). 제단 생명 +2는 "포인트"(§4-8 생명 계열은 공방과 같은 포인트 구조)라 ×100 환산이 필요한지 CHK 08 미확정. 05가 임의로 ×100을 넣으면 안 됨 |
| C-9 | 즉시 HP 감소(휴식 실패 피로) | 확인됨(함수) / 의존 I-01 | `applyVitalEffect({kind:'instant-damage'})`가 `isDead`까지 세팅. 그러나 사망 후 게임오버 전이는 없고(종료 작업 후속), I-01이 남아 있으면 전투 사망과 마찬가지로 진행이 이어진다 |
| C-10 | 카드 결과 1회·게이지 | 확인됨 | `adventure.ts:61~77` `CardOutcomeKind` 4종(pass/participate/pass-forced-battle/participate-linked-battle), `participationDelta`는 두 연결형 모두 +1, `applyCardOutcome`은 카드당 1회만 적용(`resolved` 가드). 05는 **이벤트→전투가 끝난 뒤** `onOutcome` 1회만 호출하면 된다 |
| C-11 | 한 카드 안의 연결 전투(상자 실패→미믹, 다리 지나가기→강제 전투) | **미구현(05)** + 잠재 충돌 | `AdventureState`에는 카드 내부 하위 단계가 없다(`stage`는 approach/open/closing). `BattleModal`은 `card: MobCardDef`(`cards.ts:15~23`)를 받고 `encounter`가 `'normal'|'ambush'|'sleeping'`뿐이라 **강제 전투 모드가 없다.** `'normal'`로 넣으면 `rollEncounterStyle`로 기습을 다시 추첨하고 "싸운다/도망간다"를 띄운다 → §4-3 "강제 경로 이중 도망/기습 추첨 금지" 위반. 05가 `EncounterStyle`에 강제형을 추가하거나 BattleModal에 초기 phase 입력을 둬야 한다(`BattleModal.tsx:97~105,140`) |
| C-12 | 연결 전투의 결과 전달 | 잠재 충돌 | `BattleModal`은 `onVictory/onDefeat/onFleeSuccess` 안에서 직접 `onOutcome(...)`을 호출한다(`AdventureScreen.tsx` 호출부). 상자 카드에서 미믹 전투가 끝나면 outcome은 `'participate-linked-battle'`이어야 하는데 현재 호출부는 `'participate'` 고정 → 05가 호출부를 분기해야 한다 |
| C-13 | 환경 전환 시점 | 확인됨 | 지역/낮밤 전환은 `applyAdventureExited`(퇴장 후)에서 `plan.env`로 적용. 연결 전투까지 같은 카드 안에서 끝내면 자연히 "결과·보상 종료 후 전환" |

### 3-2. 전투·미믹·미션·보상·점수 경계

| # | 접점 | 상태 | 코드 위치·근거 |
| --- | --- | --- | --- |
| C-14 | 미믹 생성 | 확인됨 | `createMobParticipant('mimic', region, {dayIndex})` 가능(`mobs.ts` 미믹 baseStats 있음, `time:'both'`). 카드 풀·잠든 몹 추첨에서는 제외됨 |
| C-15 | **전투 모달 몹 그림 조회 키 불일치** | **잠재 충돌(03-04 신규 발견, 미등록)** | `BattleModal.tsx:390~393` `PixelSprite id={battleState.mob.id}`와 `getAssetRegionPalette(battleState.mob.id, region)` — `mob.id`는 `'golem'`·`'stone-shell-turtle'`인데 에셋 레지스트리 키는 `assetId`(`'mob-moss-golem-64'` 등). `getAsset(id)`가 undefined → `PixelSprite`가 `null` 반환(`render/PixelSprite.tsx:52~55`), 팔레트도 undefined. **일반 몹·미믹 모두 전투 모달에서 그림이 비어 있을 것**(코드 추적, 브라우저 미확인). 잠든 몹 선택 단계의 `'event-sleeping-mob-128'`만 정상. 05에서 미믹 그림(`mob-mimic-64`)을 연결하려면 이 키를 `MOBS`의 `assetId`로 바꿔야 한다. I-01~03과 별개 항목이며 중력이 기술 검수 대상 |
| C-16 | 전투 전 도망·몰래가기 | 확인됨 | `BattleModal` `encounter-choice` 단계에서만. 도망 판정 clamp 불일치는 기존 I-06(CHK 08) |
| C-17 | 미션 자동 수집(배틀) | 확인됨 / 잠재 충돌(미믹) | `BattleModal.tsx:256~265`는 `mission.kind==='battle' && mobId===targetMobId`만 수집. **`battle-locksmith`(대상 미믹)** 는 이 경로로 차지 품질 규칙에 따라 **빛나는이 나올 수 있다**(`determineMissionItemQuality`) → §4-6·§4-8 "미믹 경로는 일반/부서진만"과 충돌. 05가 미믹 처치 수집을 상자 경로 규칙으로 돌리고, 같은 카드에서 배틀 수집과 상자 수집이 **둘 다** 일어나지 않게 해야 한다 |
| C-18 | 미션 자동 수집(탐색, 상자 성공) | **미구현(05)** | 수집 전이 `applyMissionItemCollected(state, 'shining')`(`gameState.ts`)은 있다. 대상 판정은 `missionContext.mission.targetItemId === missionContext.item.id`(validate `explore-mission-target`이 보장). 미믹 경유 시 일반/부서진 **비율을 정하는 함수는 없다**(`rollRewardGrade(isMimic)`은 보상템 등급용이지 미션템 품질용이 아님) → CHK 08 조율 + 05 구현 |
| C-19 | 미믹 선택 보상 | 확인됨 | `generateCombatRewards('special', …, isBoxExploreMission)`: 일반 경로 금빛 자물쇠(100/50 TEMP) vs 피템, 탐색 미션 중 공방 버프 vs 피템. `BattleModal.tsx:283`은 `mission.kind==='explore'`를 그대로 넘긴다(탐색 미션은 전부 상자형이므로 §4-6 표와 일치). 스코어템은 선택 시만 `scoreItemPoints`에 1회 가산 |
| C-20 | 막타 등급 추첨 입력 | 기존 I-05 | 05 범위 아님. 중력이 후속 |
| C-21 | 점수 중복 | 확인됨 | `applyMobDamageRecorded`는 승리 시 1회(`handleVictoryReward`). 이벤트 피해는 점수에 넣지 않음(§4-10 몹 피해만) |
| C-22 | 귀가 질문 | 기존 I-02 / 의존 | 상자 성공 수집으로 미션이 달성되면 `missionReturnCheck`→질문→'계속' 정지. **I-02 수정이 05 상자 이벤트 테스트의 선행 조건** |
| C-23 | 미션 대상 출현 배율 1.5/0.5 | 미구현(05) | `cards.ts:84~92` `CardWeights` 입력 자리만 있음(`DEFAULT_CARD_WEIGHTS = {}`). `planAdvance`/`drawAdventureStart`에 weights 인자 있음 |

### 3-3. 고대 제단

| # | 접점 | 상태 | 코드 위치·근거 |
| --- | --- | --- | --- |
| C-24 | 술식 데이터 이원화 | **잠재 충돌(데이터)** | `src/data/altar.ts` `ALTAR_INSCRIPTIONS`(1종 `sample-word-open`, RenderCheck '고대 제단' 탭과 `resolveAltarChoice`가 사용) vs 06-A `altarSyntax.ts` `ALTAR_SYNTAX_INSCRIPTIONS`(6종, `altar-declare-string`이 같은 내용). 05는 한 벌로 정리하거나 매핑해야 하며, 기존 탭·검사는 보존해야 한다(06-A·05 명세 공통) |
| C-25 | 판정 규칙 | **잠재 충돌(기획 v1.2 미반영)** | `altar.ts:30~59` `resolveAltarChoice`는 언어 ID만 비교(같으면 축복 +2, 다르면 저주 −1, 0 미만이면 `none`). v1.2 §4-8: 정상 축복 = 영구 +2 **와** 강 임시 +2/+4 동시, **TS 지역에서 TS-유효 JS만 부분 축복**(임시 50%·약 턴·영구 없음), 저주 −1.5/−3 풀 추첨, 하한 clamp. 06-A `classifyInscriptionChoice`(correct/compatible/wrong)가 분류를 제공하고(6종 중 JS→TS compatible 4·wrong 2) 효과는 만들지 않는다. 05가 `resolveAltarChoice`를 06-A 분류 + 04 효과 적용기로 재구성해야 한다. `config.ts` `ALTAR_CURSE_RATIO=0.5`는 v1.1 값 |
| C-26 | 0 미만 `none` 규칙 | 잠재 충돌(기획) | v1.2는 "0 미만 무효 정책 금지, 최종 하한 clamp". `altar.ts:50~52`와 AltarSection의 `zeroCurseOutcome` 검사는 05 명세대로 "검사 보존·의미 갱신" 대상 |
| C-27 | 술식 유효성 근거 | 확인 불가(이 환경) | `altarSyntax.ts` 주석은 javac 21 / tsc 7 / node 24 실측이라고 적었으나 06-A 보고서(워크트리 내부 작성)가 로컬에 없어 근거 로그를 보지 못했다. 분류 로직 자체는 표대로 동작(7/7 PASS) |

### 3-4. 공용 화면·렌더러·검증 도구 회귀

| # | 접점 | 상태 | 코드 위치·근거 |
| --- | --- | --- | --- |
| C-28 | `renderCode`/`renderExpr` 시그니처 변경의 기존 호출부 | 확인됨 | 호출부는 `dev/` 두 곳뿐. `getCodeQaStats` 반환형이 `CodeAnalysis & {...}`로 넓어졌고 기존 필드는 유지. 합성 트리 타입검사 통과 |
| C-29 | 배틀 모달 명중률 코드 | **잠재 충돌(표현 불일치)** | `BattleModal.tsx:379~383`은 JS 문법 고정 템플릿. 06-A F5 샘플(`codeChk06Samples.ts` `chk06-battle-hit-rate`)은 같은 §6-2 예시를 `NeutralCodeV2`(cardKind battle, 식 변수+영어 주석)로 3언어 렌더한다. 05가 지역 언어로 보여 주려면 BattleModal을 `renderCode`로 교체해야 한다. 이때 주석 %는 `computeHitRate`(clamp)로 계산해 넣어야 하며 코드 본문은 원식이므로 기존 I-13(코드와 주석 불일치) 결정이 필요 |
| C-30 | 선택지 확률 표기 | 기존 I-07 | `BattleModal.tsx:451,460` "성공률 낮음/높음", "확률: N%". 05의 잠든 몹·일반 조우를 "동일 모달/실제 확률 코드"로 연결하려면 이 문구를 코드 표현으로 바꾸는 결정이 선행 |
| C-31 | RenderCheck 10탭 | 확인됨 | 양 브랜치 모두 `RenderCheck.tsx` 탭 10개 동일(06-A는 '코드 렌더러' 탭 내용만 변경). 콘텐츠 데이터 11개 검사(`validate.ts`)는 양쪽 미변경 |
| C-32 | HUD | 미구현(05) + 기존 I-12 | 이벤트 결과 문구+수치 표시(§5-5), 디버프 부호 표시 |
| C-33 | 분석 기록 | 미구현(05) | `BattleRecord`(`balance/types.ts`)에 이벤트 필드 없음. 05 명세 §5의 이벤트 기록 추가는 03-04 쪽 타입 확장이며 06-A와 무관 |
| C-34 | `passable` 의미 | 잠재 충돌(데이터) | `events.ts` 출렁다리 `passable:false, branch:true`; v1.2는 지나가기 +0 후 확률 강제 전투. 05 명세 §3이 "필드와 검사 최소 갱신"을 지시. `validate.ts`에는 passable 검사가 없어 검사 추가 여부는 05 판단 |

---

## 4. 중력이에게 넘길 통합 체크리스트

### 4-1. 선행 조건(순서 의존)

| 순서 | 항목 | 이유 |
| --- | --- | --- |
| 1 | **I-03** `explore_scales.ts` 절대경로 제거 | `npm run build` 게이트. 06-A는 지금도 빌드 통과하므로 03-04만 막혀 있다 |
| 2 | **I-01** 전투 결과 HP·틱·사망의 게임 상태 반영 | 05의 휴식 피로·제단·상인·다리 효과는 전부 `heroEffects`를 읽고 쓴다. 전투 HP가 전파되지 않은 채 이벤트 HP 변화를 얹으면 테스트 결과를 해석할 수 없다. 연결 전투(C-11)도 같은 경로 |
| 3 | **I-02** 귀가 '계속' 재진입 | 상자 성공 수집으로 미션 달성 시 즉시 재현(C-22) |
| 4 | C-15 몹 그림 키(`mob.id`→`assetId`) | 미믹·강제 전투 화면 확인의 전제. I-01~03과 별도 신규 |
| 5 | 통합 순서 | (a) 03-04에 1~4 반영 → `main` 반영, (b) 06-A → `main` 반영(소스 충돌 없음, 순서 바꿔도 무방), (c) `main`에서 `npm run build`로 `dist/` 재생성(두 브랜치의 dist는 모두 버림), (d) 05 착수. 06-A를 먼저 올리면 빌드가 깨끗한 상태에서 03-04 수정분을 검증할 수 있다는 장점이 있다 |
| 6 | `dist/index.html` 줄 끝 | 06-A 산출물은 CRLF. (c)에서 재빌드하면 해소. `.gitattributes`가 없으므로 재발 방지는 별도 판단 |

### 4-2. 작업 05 예정 접점(파일/함수)

| 파일 | 함수·항목 | 할 일 |
| --- | --- | --- |
| `src/data/types.ts` | `EventChoice.code`, `EventOutcome.effects` | 코드 타입을 `NeutralCodeV2`로 넓힐지 결정(C-2), 효과 스키마를 04의 `PermanentEffect`/`CombatSlotEffect`/`VitalSlotEffect`/즉시 효과로 정의(C-7). 06-A가 손대지 않은 파일이므로 충돌 없음 |
| `src/data/events.ts` | 6종 `situation`/`choices`/효과 풀 | §5-5 문구, 수치 풀·가중치 TEMP 분리. `passable` 의미 정리(C-34) |
| `src/data/codeRender.ts`, `codeSyntax.ts` | `renderCode`, `evaluateCode`, `analyzeCode` | 그대로 사용. 모험 카드 주석 금지는 `analyzeCode`가 경고로 잡는다. 확률 표현 방식(C-5)은 승인 후 데이터로 결정 |
| `src/game/screens/AdventureScreen.tsx` | 이벤트 모달 분기(현재 "미구현" `<dl>`과 `DEV_OUTCOMES` 버튼) | 지문→`renderCode`→선택지→판정→결과 문구·수치→효과 적용→(연결 전투)→`onOutcome` 1회. 개발용 버튼은 "검증 기능 보존" 원칙에 따라 삭제가 아니라 대체 여부를 보고 |
| `src/game/battle/BattleModal.tsx` | `encounterType` 초기화, `onVictory`/`onDefeat` 호출부, `isMissionTarget`, 몹 그림 키, 명중률 코드 | 강제 전투 모드(C-11), 연결형 outcome(C-12), 미믹 수집 규칙(C-17), `assetId`(C-15), `renderCode` 교체 여부(C-29) |
| `src/game/cards.ts` | `EncounterStyle`, `CardWeights` | 강제형 추가(C-11), 미션 대상 배율 입력(C-23) |
| `src/game/gameState.ts` | 신규 `applyEventEffects`(가칭), `applyMissionItemCollected`, `missionReturnCheck` | 복수 효과 일괄 적용(C-7), 상자 성공 빛나는 수집(C-18), 재질문 범위(기존 I-04 결정 후) |
| `src/game/GameApp.tsx` | `handleCardOutcome`, `handleVictoryReward` | 이벤트 효과·수집·연결 전투 결과를 한 번만 반영 |
| `src/data/altar.ts`, `altarSyntax.ts`, `config.ts` | `resolveAltarChoice`, `ALTAR_INSCRIPTIONS`, `ALTAR_CURSE_RATIO` | 06-A 분류 결과를 입력으로 받아 v1.2 효과(영구+임시/부분/저주 풀/clamp) 생성(C-24~26). 기존 탭·검사 보존 |
| `src/logic/balance/types.ts`, `collector.ts` | `BattleRecord` 확장 또는 이벤트 레코드 추가 | 05 명세 §5 |
| `src/data/validate.ts` | 이벤트 선택지·효과·passable 검사 | 11개 기존 검사 보존 + 추가 |

### 4-3. 통합 후 회귀 검증 목록

1. `npm run build`(tsc+vite), `npm run lint`, `dist/index.html` `./assets/` 상대경로, `dist` 줄 끝.
2. `?view=rendercheck` 10탭 로드. '코드 렌더러' 탭 CHK06 합계 69/69, '고대 제단' 탭 기존 표, '콘텐츠 데이터' 11개 검사.
3. 01~02: 타이틀→스탯 굴림→미션→출발→카드 전진·패스·30장 종료.
4. 03~04(I-01~03 수정 후): 전투 후 HUD HP 감소, 버프 잔여 턴 감소, 패배 처리, 귀가 질문 '계속' 후 전진, 몹 그림 표시, 미션 대상 처치 수집 1회.
5. 05 접점: 각 이벤트 패스 +0 / 참여 +1 단 한 번, 상자 실패→같은 카드 미믹 전투 +1(기습·도망 재추첨 없음), 다리 지나가기 +0→강제 전투 +1, 미믹 처치 시 미션템 1개만(배틀/상자 경로 중복 없음), 탐색 미션 중 자물쇠 스코어템 없음, 상인 2슬롯 동시, 제단 정상/부분/저주 3경로와 TS 지역 JS 술식 분기, 5·10·30 경계에서 결과 처리 후 전환.
6. 코드 카드: 지역 언어별 렌더 결과가 실제 판정(`evaluateCode`)과 같은 데이터를 쓰는지 시드 고정 테스트, 모험 카드 주석 없음, 선택지에 확률 미표기.

---

## 5. 확정 기획과의 불일치 / 별도 승인 필요 사항 (분리)

### 5-1. 확정 기획(v1.2)과 현재 코드가 다른 것 — 05에서 반영해야 할 기술 항목

| ID | 내용 | 위치 |
| --- | --- | --- |
| N-1 | 제단 판정이 언어 ID 비교·저주 0.5배·0 미만 무효(v1.1) 그대로 | `altar.ts:30~59`, `config.ts:50~51` (C-25·26) |
| N-2 | 미믹 처치 시 배틀 미션 수집 경로가 빛나는을 허용 | `BattleModal.tsx:256~265` (C-17) |
| N-3 | 강제 전투에 기습/도망 재추첨이 걸리는 구조 | `BattleModal.tsx:97~105`, `cards.ts:13` (C-11) |
| N-4 | 전투 모달 몹 그림 키 불일치(그림 미표시) | `BattleModal.tsx:390~393` (C-15) — 기획 불일치라기보다 결함 |
| N-5 | 배틀 코드가 지역 언어와 무관한 JS 고정 | `BattleModal.tsx:379~383` (C-29) |
| N-6 | 출렁다리 `passable:false`가 v1.2 지나가기 경로와 다름 | `events.ts:35~40` (C-34) |

### 5-2. 사용자 승인 없이는 결정할 수 없는 것

| ID | 사항 | 관련 |
| --- | --- | --- |
| A-1 | 이벤트 코드의 확률 표현 방식: v1.1 `rate = 80` 대입 + 별도 판정 vs v1.2 `Math.random() < p` 실확률(판정 = 분기). 혼용 허용 여부 | C-5, CHK 06 |
| A-2 | `EventChoice.code`를 `NeutralCodeV2`로 넓히는 `types.ts` 변경 승인(06-A는 금지였음) | C-2 |
| A-3 | 제단 생명 계열의 HP 환산(포인트 ×100 여부)과 영구 최대 HP/임시/도트 중 적용 방식 | C-8, CHK 08 |
| A-4 | 미믹 경유 미션템 일반:부서진 비율, 비대상 미믹 자동 수집 범위, 탐색 중 미믹 공방 종류 추첨 | C-17·18, §4-6·4-8 |
| A-5 | 술식 데이터 단일화 방식(`altar.ts` 1종 vs `altarSyntax.ts` 6종)과 RenderCheck '고대 제단' 탭의 참조 대상 | C-24 |
| A-6 | 전투 전 선택지의 확률 표기 제거·코드화(기존 I-07)와 배틀 명중률 코드/주석 불일치(기존 I-13) | C-29·30 |
| A-7 | 난수 원천 통일(GameApp rng 주입)과 분석 기록 재현성 | C-6 |
| A-8 | 통합 순서(03-04 먼저 vs 06-A 먼저)와 `dist` 재빌드·줄 끝 규칙 | 4-1 |
| A-9 | 제단 저주 풀(−1.5/−3)·임시 +2/+4·부분 축복 50%·약 턴 등 수치는 v1.2 초기값이며 TEMP로 분리 | CHK 08 |

### 5-3. 이미 확정된 규칙으로 재분류하지 않은 것

강제 전투에 재추첨 금지, 미믹 경로 빛나는 제외, 부분 축복은 TS-유효 JS만, 1카드 1게이지, 모험 카드 주석 금지, 선택지에 확률 미표기는 v1.2 확정이며 위 표에서 "결정"으로 올리지 않았다. 다만 A-1·A-6처럼 확정 규칙을 **어떤 표현으로** 구현할지는 05 명세가 승인 항목으로 남긴 부분이다.

---

## 6. 자체 검증 결과·재현·한계

| 검증 | 결과 |
| --- | --- |
| 변경면·충돌 | `git diff --name-only` 교집합 = `dist/index.html`만. `merge-tree` 충돌 = dist 3건, 소스 0건 |
| 합성 트리(스크래치) 타입검사 | 오류 3건 = I-03만. 06-A↔03-04 타입 결합 문제 없음 |
| 합성 트리 lint/빌드 | 통과(128 모듈) |
| 06-A 단독 | `tsc -b` PASS, lint PASS, vite build 해시 = 커밋 dist. `runChk06Checks` 69/69 PASS(CommonJS 컴파일본으로 독립 실행) |
| 03-04 단독 | 이전 보고와 동일(tsc FAIL=I-03, vite OK) |
| 새 발견 | C-15 몹 그림 키 불일치(코드 추적, 결정적). 브라우저 미확인 |
| 한계 | 브라우저 시연 없음. 06-A 보고서 원문(워크트리 내부 저장)과 중력이 교차검증 보고 원문은 로컬에 없어 Notion 메모 요약만 참고. Java/TS 컴파일러로 술식 유효성 재검증은 하지 않음(`javac` 미확인 환경) |
| 저장소 영향 | 변경 파일 = 본 보고서 1개. 스크래치 워크트리 2개·합성 트리·정션은 검수 후 제거. `main`·두 작업 브랜치·원격 모두 무변경 |

이 보고서는 중력이 교차검증과 ChatGPT 최종 검수를 거친 뒤 사용자 결정에 따라 처리한다. 대기한다.
