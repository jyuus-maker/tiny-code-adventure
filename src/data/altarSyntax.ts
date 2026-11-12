/**
 * CHK 06 — 고대 제단 술식의 언어별 문법 유효성 자료와 분류 경계.
 *
 * `src/data/altar.ts`의 기존 술식·판정(resolveAltarChoice)은 건드리지 않는다.
 * 이 모듈은 "고른 술식이 현재 지역 언어의 컴파일러에서 실제로 유효한가"를 술식별로 적어 둔 자료와,
 * 그것으로 정답/호환/오답을 가르는 순수 함수만 제공한다. 축복·저주 수치·HP 적용은 후속 작업(중력이)이다.
 *
 * validUnder[chosen][regionLang]: chosen 언어로 적힌 술식을 regionLang 컴파일러에 넣었을 때 유효한가.
 * - 같은 언어는 항상 true.
 * - Java 술식은 JS/TS에서, JS/TS 술식은 Java에서 유효하지 않다.
 * - TS 술식은 타입 표기 때문에 JS에서 유효하지 않다.
 * - JS 술식이 TS에서 유효한지는 **술식마다 다르다**. 판단 기준은 `tsc --strict`(noImplicitAny 포함).
 *   값은 javac 21 / tsc 7 / node 24로 실제 컴파일·구문 검사한 결과를 적는다(보고서 참조).
 */
import type { CodeLanguage } from '../config';

export const ALTAR_SYNTAX_LANGUAGES: readonly CodeLanguage[] = ['Java', 'JS', 'TS'];

export type AltarSyntaxValidity = Record<CodeLanguage, Record<CodeLanguage, boolean>>;

export type AltarSyntaxInscription = {
  id: string;
  title: string;
  /** 어떤 언어 고유 차이를 보여 주는가 */
  concept: string;
  /** 플레이어에게 보이는 술식 (언어 이름은 숨긴다) */
  snippets: Record<CodeLanguage, string[]>;
  /** 컴파일 검증 시 앞에 두는 전제 선언 (술식 자체에는 포함되지 않음) */
  prelude: Record<CodeLanguage, string[]>;
  validUnder: AltarSyntaxValidity;
  /** JS 술식이 TS에서 유효/무효인 이유 */
  jsInTsNote: string;
};

function validity(jsValidInTs: boolean): AltarSyntaxValidity {
  return {
    Java: { Java: true, JS: false, TS: false },
    JS: { Java: false, JS: true, TS: jsValidInTs },
    TS: { Java: false, JS: false, TS: true },
  };
}

/**
 * 술식 후보 (§5-4: String/.equals()/System.out.println/람다/for-each, 화살표 함수/console.log, 타입 표기/interface).
 * 세 언어 표현이 서로 구별되도록 구성했다(동일 표현만으로 구분 불가능한 샘플 배제).
 */
export const ALTAR_SYNTAX_INSCRIPTIONS: readonly AltarSyntaxInscription[] = [
  {
    id: 'altar-declare-string',
    title: '문자열 변수 선언',
    concept: 'Java String 타입 / JS let / TS 타입 표기',
    snippets: {
      Java: ['String word = "open";'],
      JS: ['let word = "open";'],
      TS: ['let word: string = "open";'],
    },
    prelude: { Java: [], JS: [], TS: [] },
    validUnder: validity(true),
    jsInTsNote: 'let 선언에 초기값이 있어 TS가 string으로 추론한다 → TS에서도 유효',
  },
  {
    id: 'altar-equals',
    title: '문자열 같음 비교',
    concept: 'Java .equals() / JS === / TS === 와 boolean 타입 표기',
    snippets: {
      Java: ['boolean same = word.equals("open");'],
      JS: ['let same = word === "open";'],
      TS: ['let same: boolean = word === "open";'],
    },
    prelude: {
      Java: ['String word = "open";'],
      JS: ['let word = "open";'],
      TS: ['let word: string = "open";'],
    },
    validUnder: validity(true),
    jsInTsNote: 'word가 string이면 === 비교는 TS에서도 유효',
  },
  {
    id: 'altar-length-function',
    title: '길이를 돌려주는 함수',
    concept: 'Java 메서드 시그니처·.length() / JS function / TS 매개변수·반환 타입',
    snippets: {
      Java: ['int size(String w) { return w.length(); }'],
      JS: ['function size(w) { return w.length; }'],
      TS: ['function size(w: string): number { return w.length; }'],
    },
    prelude: { Java: [], JS: [], TS: [] },
    validUnder: validity(false),
    jsInTsNote: '매개변수 w에 타입이 없어 tsc --strict(noImplicitAny)에서 오류 → TS에서 무효',
  },
  {
    id: 'altar-arrow',
    title: '느낌표를 붙이는 함수',
    concept: 'Java 메서드 / JS 화살표 함수 / TS 화살표 함수 타입 표기',
    snippets: {
      Java: ['String shout(String w) { return w + "!"; }'],
      JS: ['const shout = (w) => w + "!";'],
      TS: ['const shout = (w: string): string => w + "!";'],
    },
    prelude: { Java: [], JS: [], TS: [] },
    validUnder: validity(false),
    jsInTsNote: '화살표 함수 매개변수 w가 암묵적 any → tsc --strict에서 오류 → TS에서 무효',
  },
  {
    id: 'altar-shape',
    title: '문을 나타내는 모양',
    concept: 'Java record / JS 객체 리터럴 / TS interface',
    snippets: {
      Java: ['record Door(String word) {}'],
      JS: ['const door = { word: "open" };'],
      TS: ['interface Door { word: string; }'],
    },
    prelude: { Java: [], JS: [], TS: [] },
    validUnder: validity(true),
    jsInTsNote: '객체 리터럴은 TS가 { word: string }으로 추론한다 → TS에서도 유효',
  },
  {
    id: 'altar-print',
    title: '화면에 출력',
    concept: 'Java System.out.println / JS console.log / TS satisfies 타입 확인',
    snippets: {
      Java: ['System.out.println(word);'],
      JS: ['console.log(word);'],
      TS: ['console.log(word satisfies string);'],
    },
    prelude: {
      Java: ['String word = "open";'],
      JS: ['let word = "open";'],
      TS: ['let word: string = "open";'],
    },
    validUnder: validity(true),
    jsInTsNote: 'console.log 호출은 TS에서도 그대로 유효',
  },
];

export type AltarSyntaxVerdict =
  | 'correct' // 지역 언어의 술식 → 정상 축복 경로
  | 'compatible' // 다른 언어로 적혔지만 지역 언어 컴파일러에서도 유효 → 부분 축복 경로 (현재 JS→TS만 해당)
  | 'wrong'; // 유효하지 않음 → 저주 경로

/**
 * 고른 술식의 문법 분류. 효과 수치는 다루지 않는다.
 * "TS 지역에서 JS 술식은 실제 TS 문법으로 유효한 경우에만 부분 축복" (§4-8)을
 * 술식별 validUnder로 판정하며, 언어 ID만으로 일괄 호환 처리하지 않는다.
 */
export function classifyInscriptionChoice(
  inscription: AltarSyntaxInscription,
  chosenLang: CodeLanguage,
  regionLang: CodeLanguage,
): AltarSyntaxVerdict {
  if (chosenLang === regionLang) return 'correct';
  return inscription.validUnder[chosenLang][regionLang] ? 'compatible' : 'wrong';
}

export function getAltarSyntaxInscription(id: string): AltarSyntaxInscription | undefined {
  return ALTAR_SYNTAX_INSCRIPTIONS.find((i) => i.id === id);
}
