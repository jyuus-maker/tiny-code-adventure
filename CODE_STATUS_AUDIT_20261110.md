# [코드용사의 모험] 현재 코드 현황 전수조사 보고서

- **작성 일자**: 2026-11-10
- **저장소**: jyuus-maker/tiny-code-adventure
- **기준 브랜치**: `main`
- **기준 커밋**: `905802581b1bcfafe6ce3e8e0731c9822b0b3b82` (refactor: split render check into tabbed sections)
- **조사 방식**: 전체 정적 코드 전수 분석 (정적 소스코드 파싱 및 구조적 연결 검증, 빌드 및 개발용 렌더링 검사 검증)

---

## 1. 조사 목적 및 원칙

본 보고서는 향후 게임 메인 명세 v1.2 작성 및 코드 검수에 활용하기 위해, 저장소의 실제 구현 상태를 있는 그대로 객관적으로 조사·기록한 전수조사 보고서이다.

### 조사 원칙
1. **실제 코드만 근거로 판단**: 기획 의도나 주관적 추측을 배제하고 코드의 실재 여부로만 평가한다.
2. **미구현과 오류의 구분**: 코드가 작성되지 않은 상태(미구현)를 비정상 동작(오류)으로 단정하지 않는다.
3. **영역의 명확한 구분**: 순수 데이터 정의(Data), 개발용 검증 로직/화면(Dev/Verification), 실제 게임 동작 로직(Runtime/Game Flow)을 엄격히 구분한다.
4. **수정 및 개선안 제시 금지**: 문제를 발견하더라도 임의로 수정하거나 변경 방향을 제안하지 않고, 현황과 의존관계만 기록한다.
5. **확인 불가 사항 명시**: 정적 분석 및 현행 환경에서 확인할 수 없는 항목은 '확인 불가'로 명시한다.

---

## 2. 조사 범위 A: 전체 구조 현황

### 2.1 디렉터리 및 주요 파일 역할

| 디렉터리 / 파일 경로 | 역할 및 책임 | 비고 |
|---|---|---|
| `src/main.tsx` | React 19 진입점 (`ReactDOM.createRoot`) | `App` 마운트 |
| `src/App.tsx` | 최상위 애플리케이션 컴포넌트 | 현재 `<RenderCheck />`만 마운트되어 있음 |
| `src/config.ts` | 전역 게임 설정 상수 및 시스템 기본 파라미터 정의 | 지역, 언어, 필터, 스탯 수치 등 |
| `src/assets/pixel/` | 픽셀 아트 RLE 프로젝트 데이터 (`*-pixelcode.ts`) 47종 | `.gitkeep` 포함 총 48개 파일 |
| `src/data/types.ts` | 데이터 모델, AST, 이벤트, 미션, 제단 관련 TypeScript 인터페이스 및 타입 정의 | 게임 전반의 데이터 명세 타입 |
| `src/data/mobs.ts` | 몬스터 9종 정적 데이터 목록 | 몹 기본 정보 정의 |
| `src/data/items.ts` | 아이템 9종 정적 데이터 목록 | 원천 몹 및 보상 스탯 매핑 |
| `src/data/clients.ts` | 미션 의뢰자 9명 정적 데이터 목록 | 의뢰 물품, 장면 에셋, 대사 및 엔딩 문구 |
| `src/data/missions.ts` | 미션 17개 정적 데이터 목록 | 배틀 미션 9개, 탐색 미션 8개 |
| `src/data/events.ts` | 필드 이벤트 6종 메타데이터 목록 | 에셋, 통과/분기 여부 정의 |
| `src/data/altar.ts` | 고대 제단 술식 데이터 및 선택지 판정 로직 | 술식 문자열 및 축복/저주 계산식 |
| `src/data/codeRender.ts` | 중립 코드 AST를 Java/JS/TS 3개 언어로 변환하는 렌더링 엔진 및 QA 통계 함수 | 문자열 배열 변환 및 줄 수/연산자 계측 |
| `src/data/itemEffect.ts` | 아이템 등급에 따른 효과 객체 생성 함수 (`getItemEffect`) | 등급별 영구/임시 버프 효과 매핑 |
| `src/data/validate.ts` | 데이터 무결성 검증 함수 (`validateContentData`) | 11개 항목 교차 검증 |
| `src/logic/rng.ts` | 시드 기반 32비트 난수 생성기 (`createSeededRng`, mulberry32) | 결정론적 난수 공급 |
| `src/logic/gamma.ts` | Marsaglia-Tsang 알고리즘 기반 감마 분포 난수 표본 추출기 (`sampleGamma`) | 스탯 가중치 샘플링 |
| `src/logic/statRoll.ts` | 영웅 스탯 배분(`rollStatPoints`), 영웅 스탯 변환(`toHeroStats`), 지배 스탯 판정(`dominantStat`) | 스탯 생성 코어 로직 |
| `src/render/types.ts` | 픽셀 에셋, 런, 사각형, 렌더링 설정 관련 타입 정의 | RLE 및 SVG 렌더러용 타입 |
| `src/render/assets.ts` | `import.meta.glob` 기반 픽셀코드 에셋 자동 수집·검증·등록기 | `getAsset`, `getAllAssets` |
| `src/render/pixel.ts` | RLE 데이터를 최적화된 SVG 사각형(`PixelRect[]`)으로 병합 및 캐싱 | 사각형 압축 및 CSS 색상 변환 |
| `src/render/PixelSprite.tsx` | 단일 에셋을 표시하는 SVG 렌더링 컴포넌트 (`PixelSprite`, `PixelRectsGroup`) | 스케일, 반전, 팔레트 교체 지원 |
| `src/render/region.ts` | 지역별(`warm`, `desert`, `cold`) 색상 매핑 테이블 및 팔레트 빌더 | 몹/아이템/길 색상 치환 |
| `src/render/itemGrade.ts` | 아이템 3등급 외형 처리(HSL 색상 감쇄, 반짝임 외곽 좌표 선출) 유틸리티 | 부서진 팔레트 및 반짝임 좌표 계산 |
| `src/render/ItemSprite.tsx` | 등급별(빛나는/일반/부서진) 복합 이펙트가 적용된 아이템 SVG 렌더러 | 반짝임 파티클 및 금간 오버레이 |
| `src/render/ItemSprite.css` | 빛나는 등급 아이템 반짝임 키프레임 애니메이션 정의 | SVG 불투명도 및 스케일 제어 |
| `src/dev/RenderCheck.tsx` | 개발용 검증 화면 허브 컴포넌트 (10개 탭 인터페이스 및 지역/시간대 제어) | 전체 시스템 검증 뷰포트 |
| `src/dev/common.ts` | 검증 페이지 2개 구역에서 공용으로 사용하는 상수 (`MOB_ITEM_PAIRS`) | 몹-아이템 짝 상수 |
| `src/dev/codeSamples.ts` | 코드 렌더러 검증용 샘플 5종 및 3개 언어 기대 출력 텍스트 정의 | AST 정답 대조용 픽스처 |
| `src/dev/sections/*` | 검증 페이지의 10개 구역별 독립 컴포넌트 (10개 파일) | 각 서브시스템 검증 화면 |

### 2.2 구현된 기능 vs 미구현 기능 구분
- **구현 완료/부분 구현된 영역**:
  - 픽셀 에셋 로딩, RLE 사각형 최적화 병합, SVG 기반 스프라이트 렌더링
  - 지역별(`warm`, `desert`, `cold`) 팔레트 색상 매핑 및 동적 교체
  - 아이템 3등급(`shining`, `normal`, `broken`) 시각적 이펙트(반짝임 애니메이션, HSL 감쇄, 클립패스 금간 오버레이) 및 효과 객체 생성
  - 시드 기반 난수(mulberry32) 및 감마 분포(Marsaglia-Tsang)를 이용한 초기 영웅 스탯 굴림 로직
  - 중립 코드 AST의 3개 언어(Java, JS, TS) 문자열 렌더링 및 QA 기준치 계측
  - 고대 제단 술식 선택 판정 로직
  - 콘텐츠 데이터(몹, 아이템, 의뢰자, 미션, 이벤트, 픽셀코드) 무결성 11개 규칙 자동 검증
- **미구현 영역**:
  - 실제 게임 시작/종료/오버 루프 및 화면 전환(타이틀 화면 -> 스탯 생성 -> 미션 선택 -> 필드 모험 -> 전투 -> 엔딩)
  - 턴제 전투 엔진(선공/후공 판정, 공격/방어 계산, 충전 링, 반격, 행동 선택)
  - 필드 3D 카드 레인 진행 및 카드 드로우 덱(30장) 시스템
  - 이벤트 6종 인게임 선택지 상호작용 및 확률 판정 시스템
  - 런타임 플레이어 상태 관리(현재 HP, 영구/임시 버프 스택, 인벤토리, 미션 진행도 추적)
  - 인게임 HUD 및 사용자 조작 인터페이스
  - 플랫폼 SDK 연동(`postMessage`, 세션 스토리지 등)

### 2.3 실제 게임 실행 로직 vs 개발용 검증 화면
- `src/App.tsx`는 현재 게임 화면이 아닌 개발용 검증 허브 컴포넌트(`<RenderCheck />`)를 직접 렌더링하고 있다.
- 코드베이스 내의 모든 시각적 UI 컴포넌트는 `src/render/`의 스프라이트 렌더러와 `src/dev/sections/`의 검증용 화면에 집중되어 있으며, 실제 게임 플레이어가 상호작용할 인게임 화면 컴포넌트는 현재 전무하다.

### 2.4 데이터 정의 vs 실제 동작 로직
- **데이터 정의만 완료된 항목**:
  - 몬스터 9종 기본 정보 (`src/data/mobs.ts`): id, name, time, type, assetId, exclusiveItemId만 정의되어 있고, 전투 수치(`baseStats`, `regionVariants`) 및 출현 가중치 없음.
  - 미션 17개 및 의뢰자 9명 (`src/data/missions.ts`, `src/data/clients.ts`): 텍스트 및 연결 정보는 완전하나 게임 내 수락·진행·평가 루프에 연결되지 않음.
  - 이벤트 6종 (`src/data/events.ts`): 카드 메타데이터만 존재하며, 선택지(`choices`)와 상황 설명(`situation`)은 데이터조차 비어 있음.
- **실제 동작 로직까지 구현된 항목**:
  - 픽셀 RLE -> 사각형 병합 및 SVG 렌더링 (`src/render/pixel.ts`, `PixelSprite.tsx`)
  - 지역 색상 변환 및 아이템 등급 팔레트 변환 (`src/render/region.ts`, `itemGrade.ts`, `ItemSprite.tsx`)
  - 감마 분포 스탯 굴림 및 지배 스탯 계산 (`src/logic/statRoll.ts`)
  - AST -> 3개 언어 코드 문자열 생성 (`src/data/codeRender.ts`)
  - 제단 술식 판정 계산 (`src/data/altar.ts`)
  - 콘텐츠 데이터 11개 무결성 검증 (`src/data/validate.ts`)

---

## 3. 조사 범위 B: 게임 시스템 14종 상세 분석

### 1. 게임 시작·종료 및 전체 진행 흐름
- **상태**: 미구현
- **관련 파일**: `src/App.tsx` (L1-L7)
- **현재 구현 내용**:
  - 최상위 진입점인 `App.tsx`에서 개발 검증용 화면 `<RenderCheck />`만 반환하고 있음.
  - 게임 상태 머신(State Machine), 모험 씬 매니저, 게임 시작/클리어/오버 화면 및 진행 흐름 로직은 코드상에 전혀 존재하지 않음.

### 2. 지역·시간대·언어 선택
- **상태**: 개발용 검증 기능만 존재
- **관련 파일**:
  - `src/config.ts` (L1-L17, L20): 지역(`Region`), 언어(`CodeLanguage`), 상호 매핑 테이블, 밤 CSS 필터 정의
  - `src/render/region.ts` (L4-L215): 지역별 색상 매핑 및 원경 배경 매핑
  - `src/dev/RenderCheck.tsx` (L16-L17, L72-L135): 검증 화면 상단에서 버튼을 통해 `region`과 `isNight`를 변경하는 UI 제공
- **현재 구현 내용**:
  - 지역 3종(`warm`, `desert`, `cold`)과 프로그래밍 언어 3종(`TS`, `Java`, `JS`)의 1:1 매핑 상수(`LANGUAGE_TO_REGION`, `REGION_TO_LANGUAGE`) 및 밤 필터 CSS(`NIGHT_CSS_FILTER`)가 정의되어 있음.
  - 실제 인게임에서 플레이어가 지역이나 언어를 선택하는 화면이나 시스템은 없으며, 개발용 페이지 상단의 버튼으로 상태를 토글하여 에셋 팔레트 변경 및 CSS 필터 적용 여부를 시각적으로 확인하는 기능만 존재함.

### 3. 몬스터 종류·능력치·등장 조건
- **상태**: 데이터만 존재
- **관련 파일**:
  - `src/data/types.ts` (L9-L40): `Mob`, `MobBaseStats`, `StatRange`, `MobRegionVariant` 타입 정의
  - `src/data/mobs.ts` (L3-L76): 몹 9종 정의 (`MOBS`)
- **현재 구현 내용**:
  - 몹 9종(`stone-shell-turtle`, `golem`, `grass-slime`, `field-boar`, `nightshade-wolf`, `blood-bat-swarm`, `wandering-skeleton`, `mist-fox`, `mimic`)의 기본 메타데이터(이름, 주/야간 구분, 속성 타입, 에셋 id, 전용 드롭 아이템 id)가 정의되어 있음.
  - 그러나 `types.ts`에 선언된 전투 능력치 범위(`baseStats`)와 지역별 수치 변형(`regionVariants`)은 `mobs.ts`의 모든 몹 객체에서 누락(생략)되어 있음.
  - 필드 덱 내 등장 조건, 지역별 조우 확률, 시간대별 등장 가중치 로직은 미구현 상태임.

### 4. 전투 판정·선공·공격·방어·충전·반격
- **상태**: 미구현
- **관련 파일**:
  - `src/assets/pixel/eff-charge-ring-64-pixelcode.ts`: 충전 링 에셋 파일만 존재
- **현재 구현 내용**:
  - 전투 라운드 연산, 턴 진행, 플레이어 및 몬스터의 선공 판정, 공격/방어 수치 계산, 차지 링 이펙트 발동, 반격 판정 로직이 일체 구현되어 있지 않음 (`src/logic/`에 전투 관련 로직 파일 전무).

### 5. 이벤트 6종의 선택지·확률·결과
- **상태**: 부분 구현
- **관련 파일**:
  - `src/data/types.ts` (L102-L124): `EventCard`, `EventChoice`, `EventOutcome` 타입 정의
  - `src/data/events.ts` (L3-L48): 이벤트 6종 메타데이터 정의 (`EVENTS`)
  - `src/data/altar.ts` (L19-L59): 고대 제단 술식 및 판정 함수 (`resolveAltarChoice`)
  - `src/dev/sections/AltarSection.tsx` (L1-L241): 제단 판정 매트릭스 및 저주 하한 검증 화면
- **현재 구현 내용**:
  - 이벤트 6종(`rest-tree`, `suspicious-chest`, `merchant`, `altar`, `rope-bridge`, `foggy-crossroads`)의 기본 정보(id, 이름, 배경 에셋, 아이콘, 통과/분기 여부)가 정의되어 있음.
  - 그러나 6종 이벤트 모두 `situation`(상황 문구)과 `choices`(선택지 목록) 필드가 비어 있음.
  - 고대 제단(`altar`)의 경우 `altar.ts`에 단일 술식(`sample-word-open`)과 지역 언어 일치 여부에 따른 축복(+2) / 저주(-1) 판정 함수(`resolveAltarChoice`)가 구현되어 있고 검증 페이지에서 테스트 가능함.
  - 나머지 5종 이벤트의 선택지, 코드 조건문, 확률 판정, 결과 보상/패널티 로직은 미구현 상태임.

### 6. 아이템 드롭·등급·보상 선택
- **상태**: 부분 구현
- **관련 파일**:
  - `src/data/items.ts` (L3-L76): 아이템 9종 메타데이터 (`ITEMS`)
  - `src/data/itemEffect.ts` (L8-L23): 아이템 등급별 효과 반환 함수 (`getItemEffect`)
  - `src/render/itemGrade.ts` (L71-L193): 부서진 등급 팔레트 변환 및 빛나는 등급 반짝임 좌표 계산
  - `src/render/ItemSprite.tsx` (L52-L140): 아이템 3등급 SVG 렌더러
  - `src/dev/sections/ItemGradesSection.tsx` (L1-L165): 아이템 등급 시각적 검증 화면
- **현재 구현 내용**:
  - 아이템 9종의 원천 몹 및 보상 스탯(attack/defense/hp/score)이 정의되어 있음.
  - 아이템 등급(빛나는/일반/부서진)에 따라 효과를 산출하는 순수 함수 `getItemEffect`가 구현되어 있음 (빛나는: 영구 버프, 일반: 2전투 버프, 부서진: 1전투 버프, 미믹 자물쇠: score).
  - 아이템 3등급의 시각적 렌더링(빛나는 등급의 3개 파티클 순차 반짝임 애니메이션, 부서진 등급의 채도/명도 감쇄 및 금간 오버레이 클리핑)이 완전하게 구현되어 있음.
  - 단, 전투 후 아이템 드롭 확률 테이블, 등급 결정 알고리즘(품질 판정), 인게임 보상 선택 모달/UI는 미구현 상태임.

### 7. 미믹 전투 및 보상
- **상태**: 데이터만 존재
- **관련 파일**:
  - `src/data/mobs.ts` (L69-L75): 몹 `mimic` 정의 (`type: 'special'`, `time: 'both'`)
  - `src/data/items.ts` (L69-L75): 아이템 `mimic-lock` 정의 (`reward: 'score'`)
  - `src/data/clients.ts` (L101-L111): 의뢰자 `locksmith` (자물쇠공) 정의
  - `src/data/missions.ts` (L86-L94): 배틀 미션 `battle-locksmith` 정의 (처치 수 1)
  - `src/data/validate.ts` (L94-L97, L230-L234): 미믹 아이템은 score여야 하며, 탐색 미션 대상이 될 수 없다는 검증 규칙
- **현재 구현 내용**:
  - 미믹 몬스터, 자물쇠 아이템, 의뢰자, 배틀 미션 데이터 및 관련 유효성 검증 규칙이 완전히 작성되어 있음.
  - 수상한 상자 이벤트와의 조우 연계, 미믹 특수 전투 로직, 승리 시 스코어/골드 환산 보상 처리 로직은 미구현 상태임.

### 8. 영구·임시 버프와 디버프
- **상태**: 부분 구현
- **관련 파일**:
  - `src/data/types.ts` (L51-L54, L163-L166): `ItemEffect`, `AltarOutcome` 타입 정의
  - `src/config.ts` (L41-L43, L49-L51): 버프 유지 전투 수, 제단 축복/저주 수치 상수
  - `src/data/itemEffect.ts` (L8-L23): `getItemEffect`
  - `src/data/altar.ts` (L30-L59): `resolveAltarChoice`
  - `src/assets/pixel/ui-buff-*.ts`: 버프 UI 아이콘 에셋 3종
- **현재 구현 내용**:
  - 아이템 획득 및 제단 판정을 통해 영구 버프(`permanent`), 임시 버프(`temporary`, 전투 횟수 지정), 제단 축복/저주 수치를 생성하는 데이터 구조와 계산 함수가 구현되어 있음.
  - 그러나 런타임에 영웅에게 버프/디버프를 등록하고 전투 종료마다 유지 카운트를 차감하거나 능력치에 가산/감산하는 상태 관리 시스템은 미구현 상태임.

### 9. HP·최대 HP·회복·지속 회복
- **상태**: 부분 구현
- **관련 파일**:
  - `src/config.ts` (L61): `HP_PER_POINT = 10` (포인트당 HP 배율)
  - `src/logic/statRoll.ts` (L86-L94): `toHeroStats` (포인트로부터 `maxHp`, `hp` 초기화)
  - `src/assets/pixel/ui-heart-64-pixelcode.ts`: 하트 아이콘 에셋 존재
- **현재 구현 내용**:
  - 초기 영웅 스탯 생성 시 HP 포인트에 `HP_PER_POINT`(10)를 곱하여 `maxHp`와 초기 `hp`를 산출하는 계산 로직이 구현되어 있음.
  - 인게임 전투 피격(HP 감소), 휴식/포션 회복, 턴당 지속 회복(도트힐) 연산 및 플레이어 체력 게이지 UI는 미구현 상태임.

### 10. 미션 생성·진행·완료·평가
- **상태**: 데이터만 존재
- **관련 파일**:
  - `src/data/clients.ts` (L3-L112): 의뢰자 9명 데이터 (`CLIENTS`)
  - `src/data/missions.ts` (L3-L177): 미션 17개 데이터 (`MISSIONS`)
  - `src/data/validate.ts` (L114-L266): 의뢰자-미션-아이템 간 무결성 검증 규칙 6종
  - `src/dev/sections/ContentDataSection.tsx` (L1-L454): 의뢰자 및 미션 카탈로그 표시
- **현재 구현 내용**:
  - 의뢰자 9명의 요구 아이템, 128px 씬 에셋, 3단계 결과 엔딩 대사(`glad`, `calm`, `sad`), 실패 대사(`failText`)가 완전하게 정의되어 있음.
  - 미션 17개(배틀 9개, 탐색 8개)의 목표 몹/아이템, 요구 수량, 의뢰 대사가 정의되어 있고 상호 참조 무결성이 검증되어 있음.
  - 게임 시작 시 3개 미션 무작위 제시/선택, 모험 진행 중 처치/수집 카운트 누적, 제출 아이템의 품질 평가에 따른 엔딩 분기 출력 시스템은 미구현 상태임.

### 11. 코드 카드 생성 및 Java/JS/TS 변환
- **상태**: 부분 구현
- **관련 파일**:
  - `src/data/types.ts` (L56-L99): 중립 코드 AST 인터페이스 (`NeutralCode`, `CodeVar`, `CodeExpr`, `CodeIf`, `CodeSwitch`)
  - `src/data/codeRender.ts` (L8-L143): 3개 언어 렌더링 엔진(`renderCode`), 연산자 수 카운팅(`countLogicalOps`), QA 기준 검사(`getCodeQaStats`)
  - `src/dev/codeSamples.ts` (L1-L217): 5종 검증 샘플 AST 및 3개 언어 기대 출력문 정의
  - `src/dev/sections/CodeRendererSection.tsx` (L1-L195): 5개 샘플 × 3개 언어(15개 조합) 일치 및 QA 한도 검증 화면
- **현재 구현 내용**:
  - 조건문(`if`, `switch`), 논리 연산자, 비교 연산자, 부정 연산자, 타입 선언을 포괄하는 중립 코드 AST 구조가 정의되어 있음.
  - AST를 입력받아 언어별 규칙(변수 선언 키워드, 타입 표기, if/else 포맷, switch 들여쓰기 등)에 맞추어 문자열 배열로 변환하는 변환기가 구현되어 있으며, 샘플 5종 검증에서 100% 정답 일치(`PASS`)가 확인됨.
  - 최대 줄 수(6줄 이하) 및 논리 연산자 수(3개 이하)를 검수하는 `getCodeQaStats`가 구현되어 있음.
  - 그러나 실제 게임에서 사용될 30장 카드 덱의 정적 데이터 정의 및 필드 덱 셔플/드로우 시스템은 미구현 상태임.

### 12. HUD 및 화면 표시
- **상태**: 미구현
- **관련 파일**:
  - `src/dev/RenderCheck.tsx`: 개발 검증용 탭 UI만 존재
- **현재 구현 내용**:
  - 실제 플레이 화면에 사용될 HUD(체력 바, 스탯 수치 표시, 버프/디버프 아이콘 슬롯, 미션 진행 현황 카드, 남은 카드 수, 3D 레인 길 표시 뷰포트) 컴포넌트는 전혀 구현되어 있지 않음.

### 13. 픽셀 에셋과 렌더링 구조
- **상태**: 구현 완료
- **관련 파일**:
  - `src/assets/pixel/*-pixelcode.ts`: 픽셀 에셋 47개 파일
  - `src/render/assets.ts` (L1-L66): 에셋 일괄 동적 임포트, 파일명 파싱(크기, 버전 검증), Map 캐싱
  - `src/render/pixel.ts` (L1-L105): RLE 데이터를 인접 사각형(`PixelRect[]`)으로 병합 및 캐싱, CSS 색상 변환
  - `src/render/PixelSprite.tsx` (L1-L90): SVG crispEdges 기반 스프라이트 렌더러
  - `src/render/region.ts` (L1-L215): 지역별 색상 매핑 및 팔레트 빌더
  - `src/render/ItemSprite.tsx` (L1-L141): 아이템 등급별 복합 스프라이트 렌더러
- **현재 구현 내용**:
  - 47종의 픽셀 프로젝트 파일을 `import.meta.glob`으로 일괄 적재하고 파일명 규격 및 런 데이터를 검증함.
  - RLE run 목록을 2차원 공간에서 가로·세로로 최대한 병합하여 최소 사각형 개수의 SVG `<rect>` 요소로 변환하는 최적화 알고리즘 완비 및 캐싱 처리.
  - 지역 변경(`warm`, `desert`, `cold`)에 따른 몹, 아이템, 길 팔레트 색상 치환 완비.
  - 아이템 3등급 외형 효과(반짝임 파티클, HSL 감쇄, 클립패스 금간 오버레이) 완비.
  - 47종 모든 에셋에 대해 원본 픽셀과 SVG 사각형 복원 결과의 1:1 일치 검증 통과.

### 14. 데이터 검증·테스트 구조
- **상태**: 개발용 검증 기능만 존재
- **관련 파일**:
  - `src/data/validate.ts` (L15-L302): `validateContentData` (11개 규칙 검사)
  - `src/dev/RenderCheck.tsx` 및 `src/dev/sections/*`: 10개 검증 섹션
- **현재 구현 내용**:
  - 별도의 CLI 자동화 테스트 프레임워크(Vitest, Jest 등)는 설치되어 있지 않음 (`package.json`에 test 스크립트 없음).
  - 대신 애플리케이션 내부에 개발용 검증 페이지(`RenderCheck.tsx`)를 구축하여 다음 항목들을 런타임에 전수 검증하고 있음:
    1. 콘텐츠 데이터 11개 무결성 검증 (에셋 존재, 양방향 링크, 몹 타입-보상 매칭, 미션 의뢰자/카운트 유효성, 야간 몹 수량 상한, 미믹 제외, 고유 ID, 단일 이미지, 이벤트 개수)
    2. 코드 렌더러 15개 조합 일치 검사 및 QA 한도 검사
    3. 고대 제단 축복/저주 매트릭스 9칸 및 저주 하한(0 미만 방지) 검사
    4. 47종 픽셀 에셋 복원 일치 검사
    5. 비대상 에셋 팔레트 색상 오염(충돌) 점검
    6. 스탯 배분 불변식 3종 및 20만 회 난수 시뮬레이션을 통한 명세 대조 5종 검사

---

## 4. 보고서 형식 ①: 전체 구현 현황표

| 기능 (시스템) | 상태 | 관련 파일·함수 | 현재 구현 내용 | 비고 |
|---|---|---|---|---|
| 게임 시작·종료 및 전체 진행 흐름 | **미구현** | `src/App.tsx` | `App.tsx`에서 개발 검증 화면(`<RenderCheck />`)만 렌더링 | 게임 루프, 화면 전환, 씬 매니저 없음 |
| 지역·시간대·언어 선택 | **개발용 검증 기능만 존재** | `src/config.ts`<br>`src/render/region.ts`<br>`src/dev/RenderCheck.tsx` | 지역/언어 매핑 상수 및 밤 필터 CSS 정의됨. 개발 페이지 상단 토글 버튼으로만 동작 | 인게임 선택 UI 및 선택 흐름 없음 |
| 몬스터 종류 및 기본 정보 | **데이터만 존재** | `src/data/mobs.ts` (`MOBS`) | 몹 9종의 기본 메타데이터(이름, 시간대, 타입, 에셋 id, 전용 아이템 id) 정의 | `baseStats`, `regionVariants` 데이터 없음 |
| 몬스터 능력치 및 등장 조건 | **미구현** | `src/data/types.ts` (`MobBaseStats`) | 몹 능력치 범위 및 지역 변형 타입 선언만 존재 | 몹 스탯 수치 미기재, 덱 조우 조건 없음 |
| 전투 판정 (선공·공격·방어·반격) | **미구현** | `src/assets/pixel/eff-charge-ring-64-pixelcode.ts` | 충전 링 에셋 파일만 존재하고 전투 로직 전무 | 전투 계산 엔진 파일 부재 |
| 이벤트 6종 기본 정보 | **데이터만 존재** | `src/data/events.ts` (`EVENTS`) | 이벤트 6종의 기본 메타데이터(이름, 장면 에셋, 아이콘, 통과/분기 여부) 정의 | 선택지 및 상황 설명 미기재 |
| 이벤트 6종 선택지·확률·결과 | **미구현** | `src/data/types.ts` (`EventChoice`) | 이벤트 선택지 AST 타입만 선언됨 | 제단 외 5종 이벤트 로직 없음 |
| 고대 제단 이벤트 판정 | **부분 구현** | `src/data/altar.ts` (`resolveAltarChoice`)<br>`src/dev/sections/AltarSection.tsx` | 단일 술식 문자열 정의 및 지역 언어 일치 시 축복(+2), 불일치 시 저주(-1) 계산 함수 구현 및 검증 | `events.ts`의 `altar` 객체와 참조 미연결 |
| 아이템 기본 정보 및 등급별 효과 | **부분 구현** | `src/data/items.ts` (`ITEMS`)<br>`src/data/itemEffect.ts` (`getItemEffect`) | 아이템 9종 메타데이터 정의 및 등급별 영구/임시 버프 효과 객체 생성 함수 구현 | 버프 수치 필드 누락, 획득 UI 없음 |
| 아이템 등급별 외형 렌더링 | **구현 완료** | `src/render/itemGrade.ts`<br>`src/render/ItemSprite.tsx` | 빛나는 등급 순차 반짝임 애니메이션, 부서진 등급 HSL 감쇄 및 금간 오버레이 렌더링 구현 | 3등급 외형 처리 완전 동작 |
| 아이템 전투 드롭 및 보상 선택 | **미구현** | - | - | 드롭 확률 테이블, 품질 판정, 선택 UI 없음 |
| 미믹 데이터 및 전용 미션 | **데이터만 존재** | `src/data/mobs.ts`<br>`src/data/items.ts`<br>`src/data/missions.ts` | 미믹 몹, 자물쇠 아이템, 의뢰자, 배틀 미션 데이터 및 유효성 검증 규칙 정의 | 미믹 전투, 상자 조우 연계 로직 없음 |
| 영구·임시 버프 시스템 | **부분 구현** | `src/data/types.ts`<br>`src/data/itemEffect.ts`<br>`src/data/altar.ts` | 영구/임시 버프 및 축복/저주 데이터 구조 및 생성 함수 구현 | 런타임 버프 컨테이너 및 턴 차감 로직 없음 |
| 영웅 스탯 배분 (스탯 굴림) | **구현 완료** | `src/logic/rng.ts`<br>`src/logic/gamma.ts`<br>`src/logic/statRoll.ts` | 30포인트를 최소 5점 보장 후 감마분포(alpha=2)로 무작위 배분하는 로직 및 지배 스탯 판정 구현 | 20만 회 시뮬레이션 검증 통과 |
| HP 초기화 및 생명력 관리 | **부분 구현** | `src/logic/statRoll.ts` (`toHeroStats`) | HP 스탯 포인트로부터 `maxHp`, `hp` 초기화 계산 함수 구현 | 피격, 회복, 도트힐 등 런타임 생명력 관리 없음 |
| 미션 및 의뢰자 데이터 | **데이터만 존재** | `src/data/clients.ts` (`CLIENTS`)<br>`src/data/missions.ts` (`MISSIONS`) | 의뢰자 9명(대사, 3단계 엔딩 문구 완비) 및 미션 17개(배틀 9개, 탐색 8개) 데이터 정의 | 인게임 수락, 진행 카운트, 평가 UI 없음 |
| 코드 카드 AST 렌더링 및 QA 계측 | **부분 구현** | `src/data/codeRender.ts` (`renderCode`, `getCodeQaStats`) | 중립 코드 AST를 Java/JS/TS로 변환하는 렌더러 및 줄 수/논리연산자 수 검수 함수 구현 | 실제 게임용 30장 카드 덱 데이터 부재 |
| 인게임 HUD 및 화면 표시 | **미구현** | - | - | 인게임 HUD 컴포넌트 전무 |
| 픽셀 에셋 등록 및 RLE 병합 | **구현 완료** | `src/render/assets.ts`<br>`src/render/pixel.ts` | 47종 에셋 일괄 로드 및 RLE 사각형 최적화 병합 알고리즘 구현 | 47종 픽셀 일치 검증 통과 |
| 지역별 팔레트 동적 치환 | **구현 완료** | `src/render/region.ts` (`buildRegionPalette`) | `warm`, `desert`, `cold` 색상 매핑 테이블 및 팔레트 치환 로직 구현 | 비대상 에셋 색상 충돌 없음 검증 통과 |
| 데이터 무결성 자체 검증 구조 | **개발용 검증 기능만 존재** | `src/data/validate.ts`<br>`src/dev/RenderCheck.tsx` | 콘텐츠 무결성 11개 규칙 검사 및 검증 페이지 내 10개 섹션 검증 화면 구현 | CLI 자동화 테스트 프레임워크 없음 |

---

## 5. 보고서 형식 ②: 기술적 문제 목록

| ID | 문제 유형 | 발견 내용 | 파일·줄 번호 | 영향 범위 |
|---|---|---|---|---|
| **ISSUE-01** | **연결 누락** | `src/data/mobs.ts`의 9개 몹 객체에 `types.ts`에 정의된 `baseStats`(스탯 범위)와 `regionVariants`(지역 변형) 필드가 정의되어 있지 않고 완전히 생략됨 | `src/data/types.ts` L38-L39<br>`src/data/mobs.ts` L3-L76 | 몬스터의 체력/공격/방어 능력치 부재로 전투 로직 구현 불가, 지역별 능력치 변형 미반영 |
| **ISSUE-02** | **연결 누락** | `src/data/events.ts`의 6개 이벤트 객체에 `types.ts`에 정의된 `situation`(상황 문구)과 `choices`(선택지 목록) 필드가 정의되어 있지 않고 비어 있음 | `src/data/types.ts` L122-L123<br>`src/data/events.ts` L3-L48 | 이벤트 조우 시 표시할 설명 텍스트 및 플레이어가 선택할 선택지 데이터 부재 |
| **ISSUE-03** | **연결 누락** | `src/data/altar.ts`에 정의된 술식 데이터(`ALTAR_INSCRIPTIONS`) 및 상황 문구(`ALTAR_SITUATION_TEXT`)가 `src/data/events.ts`의 `altar` 이벤트 객체와 데이터적으로 연결(참조)되어 있지 않음 | `src/data/events.ts` L27-L33<br>`src/data/altar.ts` L9-L28 | 제단 이벤트 카드가 제단 술식 데이터를 포함하지 않아 분리된 상태로 유지됨 |
| **ISSUE-04** | **로직 불일치** | `src/data/mobs.ts`에서 다른 8종 몹은 id와 에셋 파일명의 프리픽스가 일치하나(예: `grass-slime` ↔ `mob-grass-slime-64`), 유독 골렘만 id는 `golem`이고 assetId는 `mob-moss-golem-64`로 명칭 규칙이 불일치함 | `src/data/mobs.ts` L13-L19 | 몹 id 기반 자동 에셋 매핑이나 컨벤션 기반 참조 시 불일치 유발 가능 |
| **ISSUE-05** | **타입·참조 오류** | `src/data/types.ts`의 `ItemEffect` 타입 및 `src/data/itemEffect.ts`의 `getItemEffect` 반환 객체에 버프의 '수치(amount)' 필드가 누락되어 있어 스탯이 얼마나 증가하는지 알 수 없음 | `src/data/types.ts` L51-L54<br>`src/data/itemEffect.ts` L8-L23 | 영구/임시 버프 적용 시 능력치 가산량을 결정할 수 없음 |
| **ISSUE-06** | **미사용 코드** | `src/config.ts`에 선언된 `LANGUAGE_TO_REGION` 상수가 코드베이스 전체에서 단 한 번도 사용되지 않음 (역방향인 `REGION_TO_LANGUAGE`만 사용됨) | `src/config.ts` L7-L11 | 불필요한 export 상수 잔존 |
| **ISSUE-07** | **연결 누락** | `src/assets/pixel/` 디렉토리에 존재하는 에셋 중 5종(`eff-charge-ring-64`, `event-sleeping-mob-128`, `ui-buff-attack-64`, `ui-buff-defense-64`, `ui-heart-64`)이 소스코드에서 단 한 번도 id로 참조되지 않음 | `src/assets/pixel/` 내 5개 파일 | 미참조 에셋이 번들에 포함되거나 시스템 미구현으로 방치됨 |
| **ISSUE-08** | **검증 공백** | `src/data/validate.ts`의 `validateContentData()` 함수는 몹의 `baseStats` 존재 여부, 이벤트의 `choices` 존재 여부를 검사하지 않아 빈 데이터 상태에서도 모든 검사가 `PASS`로 판정됨 | `src/data/validate.ts` L15-L302 | 데이터 누락 상태를 정적 검증에서 사전에 감지하지 못함 |
| **ISSUE-09** | **타입·참조 오류** | `src/data/codeRender.ts`의 `renderResultVarDecl` 함수에서 Java 변수 타입이 `int ${resultVar};`로 하드코딩되어 있어, 결과 변수가 정수가 아닌 경우 Java 구문 오류 발생 잠재성 있음 | `src/data/codeRender.ts` L37-L45 | 결과 변수 타입이 `int`가 아닌 AST 확장 시 타입 불일치 발생 |
| **ISSUE-10** | **로직 불일치** | `src/data/types.ts`의 `CodeSwitch` 타입에서 `cases`가 `[CodeSwitchCase, CodeSwitchCase]`인 고정 2-튜플로 선언되어 있어, 3개 이상의 분기나 default 케이스를 표현할 수 없음 | `src/data/types.ts` L89-L93 | switch 분기가 3개 이상인 코드 카드 확장 불가 |
| **ISSUE-11** | **타입·참조 오류** | `src/data/types.ts`의 `Mission` 타입에 미션 완료 시 보상(보상 경험치, 골드, 아이템, 스탯 등)에 대한 필드가 전혀 선언되어 있지 않음 | `src/data/types.ts` L145-L154 | 미션 성공 후 플레이어에게 지급할 보상 정보 부재 |
| **ISSUE-12** | **기타** | 실제 픽셀 에셋 파일 개수는 47종(`.gitkeep` 제외)이나, 직전 리팩토링 보고서 등 일부 문서에서 48종으로 혼용 기재되어 있음 | `src/assets/pixel/`<br>`docs/reports/*` | 문서와 실제 에셋 수 불일치로 인한 혼선 |

---

## 6. 보고서 형식 ③: 시스템별 의존관계

| 시스템 | 핵심 파일·함수 | 연결된 시스템 | 변경 시 영향받는 영역 |
|---|---|---|---|
| **픽셀 에셋 및 스프라이트 렌더링** | `src/render/assets.ts`<br>`src/render/pixel.ts`<br>`src/render/PixelSprite.tsx` | - 픽셀코드 에셋 47종 (`src/assets/pixel/*`)<br>- 지역 팔레트 (`region.ts`)<br>- 아이템 등급 스프라이트 (`ItemSprite.tsx`)<br>- 검증 뷰포트 (`AssetCatalogSection.tsx` 등) | - 에셋 파일명 규칙, RLE 파싱 규격, SVG 렌더링 품질<br>- 에셋 사각형 압축 알고리즘 변경 시 번들 크기 및 렌더링 성능<br>- 전체 스프라이트 표시 컴포넌트 |
| **지역 팔레트 및 배경 매핑** | `src/render/region.ts`<br>`src/config.ts` | - 픽셀 스프라이트 (`PixelSprite.tsx`)<br>- 아이템 스프라이트 (`ItemSprite.tsx`)<br>- 원경 검증 뷰 (`DistantAndPathSection.tsx`)<br>- 색상 충돌 검증 뷰 (`ColorCollisionSection.tsx`) | - `REGION_COLOR_MAP` 변경 시 사막(`desert`), 설산(`cold`)의 몹/아이템/길 색상 전체<br>- 원경 배경 매핑(`getDistantBgId`) 변경 시 지역별 배경 에셋 ID<br>- 비대상 에셋 팔레트 충돌 점검 결과 |
| **아이템 등급 및 효과 시스템** | `src/render/itemGrade.ts`<br>`src/render/ItemSprite.tsx`<br>`src/data/itemEffect.ts`<br>`src/config.ts` | - 아이템 데이터 (`src/data/items.ts`)<br>- 몹 데이터 (`src/data/mobs.ts`)<br>- 검증 뷰 (`ItemGradesSection.tsx`, `MobsAndItemsSection.tsx`) | - 등급별 HSL 감쇄 배율 및 반짝임 좌표 선출 알고리즘<br>- 빛나는 등급 CSS 키프레임 애니메이션<br>- 부서진 등급 금간 오버레이(`eff-crack-64`) 클립패스<br>- 등급별 버프 지속 전투 수 (`NORMAL_ITEM_BUFF_BATTLES` 등) |
| **스탯 굴림 및 영웅 수치 시스템** | `src/logic/rng.ts`<br>`src/logic/gamma.ts`<br>`src/logic/statRoll.ts`<br>`src/config.ts` | - 스탯 검증 뷰 (`StatRollSection.tsx`)<br>- 향후 구현될 영웅 상태 관리 및 전투 시스템 | - 난수 시드 생성기(`createSeededRng`) 알고리즘<br>- 감마 분포 형상 모수(`STAT_ROLL_ALPHA`)<br>- 총 스탯 포인트(`STAT_TOTAL_POINTS = 30`), 최소 보장치(`STAT_MIN_POINTS = 5`)<br>- 포인트당 HP 배율(`HP_PER_POINT = 10`)<br>- 지배 스탯 판정식 |
| **중립 코드 AST 및 다국어 렌더러** | `src/data/codeRender.ts`<br>`src/data/types.ts`<br>`src/config.ts` | - 검증 코드 샘플 (`codeSamples.ts`)<br>- 코드 검증 뷰 (`CodeRendererSection.tsx`)<br>- 향후 구현될 30장 코드 카드 시스템 | - 중립 코드 인터페이스(`NeutralCode`, `CodeExpr` 등)<br>- Java, JS, TS 코드 렌더링 서식 및 타입 매핑 규칙<br>- QA 검수 한계치(`CODE_QA_MAX_LINES`, `CODE_QA_MAX_LOGICAL_OPS`) |
| **고대 제단 판정 시스템** | `src/data/altar.ts`<br>`src/config.ts` | - 이벤트 데이터 (`src/data/events.ts`)<br>- 제단 검증 뷰 (`AltarSection.tsx`) | - 제단 축복 수치(`ALTAR_BLESSING_AMOUNT = 2`) 및 저주 비율(`ALTAR_CURSE_RATIO = 0.5`)<br>- 저주 하한(0 미만 방지) 판정 규칙<br>- 술식 텍스트 목록(`ALTAR_INSCRIPTIONS`) |
| **콘텐츠 데이터 무결성 검증** | `src/data/validate.ts` | - `mobs.ts`, `items.ts`, `clients.ts`, `missions.ts`, `events.ts`<br>- 검증 뷰 (`ContentDataSection.tsx`) | - 몹-아이템 간 양방향 참조 규칙<br>- 의뢰자-미션-아이템 간 3자 연결 무결성<br>- 배틀 미션 야간 몹 수량 상한(3 이하) 규칙<br>- 탐색 미션 미믹 자물쇠 제외 규칙 |

---

## 7. 보고서 형식 ④: 조사 한계

### 7.1 정적 코드 분석으로 확인한 사항
- 파일 트리 및 모듈 구조, 모든 소스코드 파일의 import/export 참조 관계
- TypeScript 타입 선언과 실제 데이터 객체 간의 필드 일치/누락 여부
- 미사용 변수, 미사용 상수, 호출되지 않는 함수, 미참조 에셋 파일 목록
- AST 변환 로직, 감마 분포 수식, 제단 판정 함수의 수학적/논리적 무결성
- 인앱 검증 페이지(`RenderCheck.tsx`)의 컴포넌트 구조 및 탭 전환 흐름

### 7.2 실제 실행 및 테스트를 통해 확인한 사항
- `npm.cmd run build` 실행을 통한 TypeScript 컴파일 및 Vite 빌드 성공 (`✓ 96 modules transformed`)
- `dist/index.html` 및 CSS 파일 내 자산 상대 경로(`./assets/...`, `./favicon.svg`) 생성 확인
- Node.js 스크립트를 통한 47종 픽셀코드 에셋 파일의 id 추출 및 전수 코드 참조 매칭 검증
- 검증 페이지 내 11개 콘텐츠 무결성 검사, 15개 코드 렌더러 변환 일치 검사, 47종 에셋 픽셀 일치 검사의 실행 검증

### 7.3 확인 불가 사항
- 실제 게임 플레이 진행(게임 오버, 승리, 턴 진행 등) 시의 런타임 안정성 (실제 게임 루프가 미구현 상태이므로 실행 검증 불가)
- 실제 모바일/플랫폼 iframe 환경에서의 터치 반응성 및 CSS 필터 성능 (현재 브라우저 iframe 연동 코드가 부재하여 확인 불가)
- 30장 카드 덱 셔플 및 확률 밸런스 체감 (덱 데이터가 미구현 상태이므로 확인 불가)
- 실제 화면 크기별 HUD 레이아웃 및 폰트 렌더링 (HUD 컴포넌트 부재로 확인 불가)

---

## 8. 최종 산출물 저장 위치

본 전수조사 보고서는 저장소 루트에 다음 경로로 생성되었습니다:
- **파일 경로**: `CODE_STATUS_AUDIT_20261110.md` (루트 디렉터리)
- **절대 경로**: `D:\academy\tiny\tiny-code-adventure\CODE_STATUS_AUDIT_20261110.md`

*(추가 개발 및 소스코드 수정은 수행하지 않았으며, 지시서의 조사 및 보고 원칙을 100% 준수하여 조사를 종료합니다.)*
