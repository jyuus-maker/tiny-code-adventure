/**
 * CHK 06 검증 픽스처. 기존 `codeSamples.ts`(샘플 A~E)는 그대로 두고, 확장 문법만 여기서 다룬다.
 * 확률 0.3·0.5 등은 문법 검증용 예시이며 운영 성공률 확정값이 아니다.
 */
import type { CodeLanguage } from '../config';
import type { NeutralCodeV2 } from '../data/codeSyntax';

export type Chk06Sample = {
  id: string;
  title: string;
  code: NeutralCodeV2;
  expected: Record<CodeLanguage, string[]>;
};

export const CHK06_SAMPLES: readonly Chk06Sample[] = [
  {
    id: 'chk06-random-if',
    title: 'F1 실제 확률 문법 (Math.random() < 0.3 → boolean 결과)',
    code: {
      vars: [],
      resultVar: 'success',
      body: {
        kind: 'if',
        condition: {
          kind: 'compare',
          op: '<',
          left: { kind: 'random' },
          right: { kind: 'literal', value: 0.3 },
        },
        thenRate: true,
        elseRate: false,
      },
    },
    expected: {
      Java: [
        'boolean success;',
        'if (Math.random() < 0.3) { success = true; }',
        'else { success = false; }',
      ],
      JS: [
        'let success;',
        'if (Math.random() < 0.3) { success = true; }',
        'else { success = false; }',
      ],
      TS: [
        'let success: boolean;',
        'if (Math.random() < 0.3) { success = true; }',
        'else { success = false; }',
      ],
    },
  },
  {
    id: 'chk06-strict-equals',
    title: 'F2 동등 비교 (Java == / JS·TS ===)',
    code: {
      vars: [{ name: 'count', type: 'number', value: 3 }],
      body: {
        kind: 'if',
        condition: {
          kind: 'compare',
          op: '==',
          left: { kind: 'var', name: 'count' },
          right: { kind: 'literal', value: 3 },
        },
        thenRate: 60,
        elseRate: 40,
      },
    },
    expected: {
      Java: ['int count = 3;', 'int rate;', 'if (count == 3) { rate = 60; }', 'else { rate = 40; }'],
      JS: ['let count = 3;', 'let rate;', 'if (count === 3) { rate = 60; }', 'else { rate = 40; }'],
      TS: [
        'let count: number = 3;',
        'let rate: number;',
        'if (count === 3) { rate = 60; }',
        'else { rate = 40; }',
      ],
    },
  },
  {
    id: 'chk06-not-equals',
    title: 'F3 비동등 비교 (Java != / JS·TS !==)',
    code: {
      vars: [{ name: 'hp', type: 'number', value: 45 }],
      body: {
        kind: 'if',
        condition: {
          kind: 'compare',
          op: '!=',
          left: { kind: 'var', name: 'hp' },
          right: { kind: 'literal', value: 0 },
        },
        thenRate: 70,
        elseRate: 30,
      },
    },
    expected: {
      Java: ['int hp = 45;', 'int rate;', 'if (hp != 0) { rate = 70; }', 'else { rate = 30; }'],
      JS: ['let hp = 45;', 'let rate;', 'if (hp !== 0) { rate = 70; }', 'else { rate = 30; }'],
      TS: [
        'let hp: number = 45;',
        'let rate: number;',
        'if (hp !== 0) { rate = 70; }',
        'else { rate = 30; }',
      ],
    },
  },
  {
    id: 'chk06-double-result',
    title: 'F4 실수 결과값 (Java double 결과변수)',
    code: {
      vars: [{ name: 'luck', type: 'number', value: 7 }],
      body: {
        kind: 'if',
        condition: {
          kind: 'compare',
          op: '>=',
          left: { kind: 'var', name: 'luck' },
          right: { kind: 'literal', value: 5 },
        },
        thenRate: 0.75,
        elseRate: 0.25,
      },
    },
    expected: {
      Java: ['int luck = 7;', 'double rate;', 'if (luck >= 5) { rate = 0.75; }', 'else { rate = 0.25; }'],
      JS: ['let luck = 7;', 'let rate;', 'if (luck >= 5) { rate = 0.75; }', 'else { rate = 0.25; }'],
      TS: [
        'let luck: number = 7;',
        'let rate: number;',
        'if (luck >= 5) { rate = 0.75; }',
        'else { rate = 0.25; }',
      ],
    },
  },
  {
    id: 'chk06-battle-hit-rate',
    title: 'F5 배틀 명중률 표시 (§6-2 예시: 정수 나눗셈 형변환·영어 주석 줄 끝 정렬)',
    code: {
      cardKind: 'battle',
      vars: [
        { name: 'heroHp', type: 'number', value: 820 },
        { name: 'monsterHp', type: 'number', value: 640 },
        { name: 'monsterCharged', type: 'boolean', value: true },
        {
          name: 'heroHit',
          type: 'number',
          expr: {
            kind: 'arith',
            op: '/',
            left: { kind: 'var', name: 'heroHp' },
            right: {
              kind: 'arith',
              op: '+',
              left: { kind: 'var', name: 'heroHp' },
              right: { kind: 'var', name: 'monsterHp' },
            },
          },
          comment: 'hero hit: 56%',
        },
        {
          name: 'monsterHit',
          type: 'number',
          expr: {
            kind: 'arith',
            op: '/',
            left: { kind: 'var', name: 'monsterHp' },
            right: {
              kind: 'arith',
              op: '+',
              left: { kind: 'var', name: 'heroHp' },
              right: { kind: 'var', name: 'monsterHp' },
            },
          },
          comment: 'monster hit: 44%',
        },
      ],
    },
    expected: {
      Java: [
        'int heroHp = 820;',
        'int monsterHp = 640;',
        'boolean monsterCharged = true;',
        'double heroHit = (double) heroHp / (heroHp + monsterHp);       // hero hit: 56%',
        'double monsterHit = (double) monsterHp / (heroHp + monsterHp); // monster hit: 44%',
      ],
      JS: [
        'let heroHp = 820;',
        'let monsterHp = 640;',
        'let monsterCharged = true;',
        'let heroHit = heroHp / (heroHp + monsterHp);       // hero hit: 56%',
        'let monsterHit = monsterHp / (heroHp + monsterHp); // monster hit: 44%',
      ],
      TS: [
        'let heroHp: number = 820;',
        'let monsterHp: number = 640;',
        'let monsterCharged: boolean = true;',
        'let heroHit: number = heroHp / (heroHp + monsterHp);       // hero hit: 56%',
        'let monsterHit: number = monsterHp / (heroHp + monsterHp); // monster hit: 44%',
      ],
    },
  },
  {
    id: 'chk06-random-twice',
    title: 'F6 랜덤의 랜덤 (boolean 식 변수 + 단락 평가)',
    code: {
      vars: [
        {
          name: 'side',
          type: 'boolean',
          expr: {
            kind: 'compare',
            op: '<',
            left: { kind: 'random' },
            right: { kind: 'literal', value: 0.5 },
          },
        },
      ],
      body: {
        kind: 'if',
        condition: {
          kind: 'logical',
          op: '&&',
          left: { kind: 'var', name: 'side' },
          right: {
            kind: 'compare',
            op: '<',
            left: { kind: 'random' },
            right: { kind: 'literal', value: 0.3 },
          },
        },
        thenRate: 1,
        elseRate: 0,
      },
    },
    expected: {
      Java: [
        'boolean side = Math.random() < 0.5;',
        'int rate;',
        'if (side && Math.random() < 0.3) { rate = 1; }',
        'else { rate = 0; }',
      ],
      JS: [
        'let side = Math.random() < 0.5;',
        'let rate;',
        'if (side && Math.random() < 0.3) { rate = 1; }',
        'else { rate = 0; }',
      ],
      TS: [
        'let side: boolean = Math.random() < 0.5;',
        'let rate: number;',
        'if (side && Math.random() < 0.3) { rate = 1; }',
        'else { rate = 0; }',
      ],
    },
  },
  {
    id: 'chk06-arith-parens',
    title: 'F7 사칙연산 괄호·우선순위 (정수 유지)',
    code: {
      vars: [
        { name: 'a', type: 'number', value: 10 },
        { name: 'b', type: 'number', value: 4 },
        { name: 'c', type: 'number', value: 2 },
        {
          name: 'd',
          type: 'number',
          expr: {
            kind: 'arith',
            op: '*',
            left: {
              kind: 'arith',
              op: '-',
              left: { kind: 'var', name: 'a' },
              right: { kind: 'var', name: 'b' },
            },
            right: { kind: 'var', name: 'c' },
          },
        },
        {
          name: 'e',
          type: 'number',
          expr: {
            kind: 'arith',
            op: '-',
            left: { kind: 'var', name: 'a' },
            right: {
              kind: 'arith',
              op: '-',
              left: { kind: 'var', name: 'b' },
              right: { kind: 'var', name: 'c' },
            },
          },
        },
      ],
      body: {
        kind: 'if',
        condition: {
          kind: 'compare',
          op: '>',
          left: { kind: 'var', name: 'd' },
          right: { kind: 'var', name: 'e' },
        },
        thenRate: 1,
        elseRate: 0,
      },
    },
    expected: {
      Java: [
        'int a = 10;',
        'int b = 4;',
        'int c = 2;',
        'int d = (a - b) * c;',
        'int e = a - (b - c);',
        'int rate;',
        'if (d > e) { rate = 1; }',
        'else { rate = 0; }',
      ],
      JS: [
        'let a = 10;',
        'let b = 4;',
        'let c = 2;',
        'let d = (a - b) * c;',
        'let e = a - (b - c);',
        'let rate;',
        'if (d > e) { rate = 1; }',
        'else { rate = 0; }',
      ],
      TS: [
        'let a: number = 10;',
        'let b: number = 4;',
        'let c: number = 2;',
        'let d: number = (a - b) * c;',
        'let e: number = a - (b - c);',
        'let rate: number;',
        'if (d > e) { rate = 1; }',
        'else { rate = 0; }',
      ],
    },
  },
];

/** 정적 분석이 경고를 내야 하는 경우 (삭제 대상이 아니라 QA 경고 검출 테스트) */
export type Chk06IssueCase = {
  id: string;
  title: string;
  code: NeutralCodeV2;
  /** issues 중 이 문구를 포함하는 항목이 있어야 한다 */
  expectIssueIncludes: string[];
  expectNeedsReview?: boolean;
  expectDefinedOnAllPaths?: boolean | null;
};

export const CHK06_ISSUE_CASES: readonly Chk06IssueCase[] = [
  {
    id: 'issue-string-compare',
    title: 'N1 문자열 == 비교 (Java .equals() 경계, 승인 전 미지원)',
    code: {
      vars: [{ name: 'time', type: 'string', value: 'NIGHT' }],
      body: {
        kind: 'if',
        condition: {
          kind: 'compare',
          op: '==',
          left: { kind: 'var', name: 'time' },
          right: { kind: 'literal', value: 'NIGHT' },
        },
        thenRate: 50,
        elseRate: 50,
      },
    },
    expectIssueIncludes: ['문자열'],
  },
  {
    id: 'issue-adventure-comment',
    title: 'N2 모험 카드 주석 금지',
    code: {
      vars: [{ name: 'hp', type: 'number', value: 45, comment: 'answer: 56' }],
      body: {
        kind: 'if',
        condition: {
          kind: 'compare',
          op: '>',
          left: { kind: 'var', name: 'hp' },
          right: { kind: 'literal', value: 30 },
        },
        thenRate: 56,
        elseRate: 10,
      },
    },
    expectIssueIncludes: ['주석 금지'],
  },
  {
    id: 'issue-no-else',
    title: 'N3 else 없음 → 결과변수 미정의 경로 (기존 샘플 A와 같은 형태)',
    code: {
      vars: [{ name: 'hp', type: 'number', value: 45 }],
      body: {
        kind: 'if',
        condition: {
          kind: 'compare',
          op: '>',
          left: { kind: 'var', name: 'hp' },
          right: { kind: 'literal', value: 30 },
        },
        thenRate: 56,
      },
    },
    expectIssueIncludes: ['else 없음'],
    expectDefinedOnAllPaths: false,
  },
  {
    id: 'issue-too-many-ops',
    title: 'N4 논리 연산자 4개 → QA 검토 대상(needsReview)',
    code: {
      vars: [
        { name: 'a', type: 'boolean', value: true },
        { name: 'b', type: 'boolean', value: false },
        { name: 'c', type: 'boolean', value: true },
        { name: 'd', type: 'boolean', value: false },
      ],
      body: {
        kind: 'if',
        condition: {
          kind: 'logical',
          op: '||',
          left: {
            kind: 'logical',
            op: '&&',
            left: { kind: 'var', name: 'a' },
            right: { kind: 'var', name: 'b' },
          },
          right: {
            kind: 'logical',
            op: '&&',
            left: { kind: 'var', name: 'c' },
            right: { kind: 'not', operand: { kind: 'var', name: 'd' } },
          },
        },
        thenRate: 1,
        elseRate: 0,
      },
    },
    expectIssueIncludes: [],
    expectNeedsReview: true,
    expectDefinedOnAllPaths: true,
  },
  {
    id: 'issue-switch-uncovered',
    title: 'N5 switch 현재 값이 두 case 밖 (default 없음 규칙 위반)',
    code: {
      vars: [{ name: 'time', type: 'string', value: 'DUSK' }],
      body: {
        kind: 'switch',
        subject: 'time',
        cases: [
          { match: 'DAY', rate: 70 },
          { match: 'NIGHT', rate: 40 },
        ],
      },
    },
    expectIssueIncludes: ['case에 없음'],
    expectDefinedOnAllPaths: false,
  },
  {
    id: 'issue-boolean-literal-compare',
    title: 'N7 boolean을 true 리터럴과 비교 (tsc --strict TS2367 실측: narrowing)',
    code: {
      vars: [{ name: 'rotten', type: 'boolean', value: false }],
      body: {
        kind: 'if',
        condition: {
          kind: 'compare',
          op: '!=',
          left: { kind: 'var', name: 'rotten' },
          right: { kind: 'literal', value: true },
        },
        thenRate: 70,
        elseRate: 30,
      },
    },
    expectIssueIncludes: ['narrowing'],
    expectDefinedOnAllPaths: true,
  },
  {
    id: 'issue-battle-comment-korean',
    title: 'N6 배틀 주석에 한글 (영어만 허용)',
    code: {
      cardKind: 'battle',
      vars: [{ name: 'heroHp', type: 'number', value: 820, comment: '명중률' }],
    },
    expectIssueIncludes: ['영어'],
    expectDefinedOnAllPaths: null,
  },
];

/** 판정 평가 기대값: 같은 코드 데이터로 표시값과 분기값이 대응하는지 */
export type Chk06EvalCase = {
  id: string;
  sampleId: string;
  title: string;
  /** 주입할 난수 열 (순서대로 소비) */
  draws: number[];
  expectPath: string;
  expectResult: number | boolean | undefined;
  /** 실제로 소비된 난수 개수 (단락 평가 검증) */
  expectDrawCount?: number;
  /** 변수 기대값 (부동소수는 오차 1e-9) */
  expectVars?: Record<string, number | boolean | string>;
};

export const CHK06_EVAL_CASES: readonly Chk06EvalCase[] = [
  { id: 'eval-f1-then', sampleId: 'chk06-random-if', title: 'F1 random 0.1 → then(true)', draws: [0.1], expectPath: 'then', expectResult: true, expectDrawCount: 1 },
  { id: 'eval-f1-else', sampleId: 'chk06-random-if', title: 'F1 random 0.9 → else(false)', draws: [0.9], expectPath: 'else', expectResult: false, expectDrawCount: 1 },
  { id: 'eval-f1-edge', sampleId: 'chk06-random-if', title: 'F1 random 0.3 → else (경계 <)', draws: [0.3], expectPath: 'else', expectResult: false },
  { id: 'eval-f2', sampleId: 'chk06-strict-equals', title: 'F2 count 3 → then 60', draws: [], expectPath: 'then', expectResult: 60, expectDrawCount: 0 },
  { id: 'eval-f3', sampleId: 'chk06-not-equals', title: 'F3 hp 45 != 0 → then 70', draws: [], expectPath: 'then', expectResult: 70 },
  { id: 'eval-f4', sampleId: 'chk06-double-result', title: 'F4 luck 7 >= 5 → then 0.75', draws: [], expectPath: 'then', expectResult: 0.75 },
  {
    id: 'eval-f5',
    sampleId: 'chk06-battle-hit-rate',
    title: 'F5 명중률 변수 = 820/1460, 640/1460 (주석 56%/44%와 일치)',
    draws: [],
    expectPath: 'no-body',
    expectResult: undefined,
    expectVars: { heroHit: 820 / 1460, monsterHit: 640 / 1460, monsterCharged: true },
  },
  { id: 'eval-f6-both', sampleId: 'chk06-random-twice', title: 'F6 [0.2, 0.1] → side true, 두 번째 random 소비, then 1', draws: [0.2, 0.1], expectPath: 'then', expectResult: 1, expectDrawCount: 2, expectVars: { side: true } },
  { id: 'eval-f6-short', sampleId: 'chk06-random-twice', title: 'F6 [0.7] → side false, 단락 평가로 random 1회만, else 0', draws: [0.7, 0.1], expectPath: 'else', expectResult: 0, expectDrawCount: 1, expectVars: { side: false } },
  { id: 'eval-f6-second-fail', sampleId: 'chk06-random-twice', title: 'F6 [0.2, 0.9] → side true, 두 번째 실패, else 0', draws: [0.2, 0.9], expectPath: 'else', expectResult: 0, expectDrawCount: 2 },
  { id: 'eval-f7', sampleId: 'chk06-arith-parens', title: 'F7 d=(10-4)*2=12, e=10-(4-2)=8 → then 1', draws: [], expectPath: 'then', expectResult: 1, expectVars: { d: 12, e: 8 } },
];
