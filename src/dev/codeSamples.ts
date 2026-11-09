import type { CodeLanguage } from '../config';
import type { NeutralCode } from '../data/types';

export type CodeRenderSample = {
  id: string;
  title: string;
  code: NeutralCode;
  expected: Record<CodeLanguage, string[]>;
};

export const CODE_SAMPLES: readonly CodeRenderSample[] = [
  {
    id: 'sample-a-if',
    title: '샘플 A (if, else 없음)',
    code: {
      vars: [
        { name: 'hp', type: 'number', value: 45 },
        { name: 'rotten', type: 'boolean', value: true },
      ],
      body: {
        kind: 'if',
        condition: {
          kind: 'logical',
          op: '&&',
          left: {
            kind: 'compare',
            op: '>',
            left: { kind: 'var', name: 'hp' },
            right: { kind: 'literal', value: 30 },
          },
          right: {
            kind: 'not',
            operand: { kind: 'var', name: 'rotten' },
          },
        },
        thenRate: 56,
      },
    },
    expected: {
      Java: [
        'int hp = 45;',
        'boolean rotten = true;',
        'int rate;',
        'if (hp > 30 && !rotten) { rate = 56; }',
      ],
      JS: [
        'let hp = 45;',
        'let rotten = true;',
        'let rate;',
        'if (hp > 30 && !rotten) { rate = 56; }',
      ],
      TS: [
        'let hp: number = 45;',
        'let rotten: boolean = true;',
        'let rate: number;',
        'if (hp > 30 && !rotten) { rate = 56; }',
      ],
    },
  },
  {
    id: 'sample-b-switch',
    title: '샘플 B (switch)',
    code: {
      vars: [{ name: 'time', type: 'string', value: 'NIGHT' }],
      body: {
        kind: 'switch',
        subject: 'time',
        cases: [
          { match: 'DAY', rate: 70 },
          { match: 'NIGHT', rate: 40 },
        ],
      },
    },
    expected: {
      Java: [
        'String time = "NIGHT";',
        'int rate;',
        'switch (time) {',
        '  case "DAY":   rate = 70; break;',
        '  case "NIGHT": rate = 40; break;',
        '}',
      ],
      JS: [
        'let time = "NIGHT";',
        'let rate;',
        'switch (time) {',
        '  case "DAY":   rate = 70; break;',
        '  case "NIGHT": rate = 40; break;',
        '}',
      ],
      TS: [
        'let time: string = "NIGHT";',
        'let rate: number;',
        'switch (time) {',
        '  case "DAY":   rate = 70; break;',
        '  case "NIGHT": rate = 40; break;',
        '}',
      ],
    },
  },
  {
    id: 'sample-c-if-else-parens',
    title: '샘플 C (if·else, 괄호 규칙)',
    code: {
      vars: [
        { name: 'a', type: 'boolean', value: true },
        { name: 'b', type: 'boolean', value: false },
        { name: 'c', type: 'boolean', value: true },
      ],
      body: {
        kind: 'if',
        condition: {
          kind: 'logical',
          op: '&&',
          left: { kind: 'var', name: 'a' },
          right: {
            kind: 'logical',
            op: '||',
            left: { kind: 'var', name: 'b' },
            right: { kind: 'var', name: 'c' },
          },
        },
        thenRate: 80,
        elseRate: 20,
      },
    },
    expected: {
      Java: [
        'boolean a = true;',
        'boolean b = false;',
        'boolean c = true;',
        'int rate;',
        'if (a && (b || c)) { rate = 80; }',
        'else { rate = 20; }',
      ],
      JS: [
        'let a = true;',
        'let b = false;',
        'let c = true;',
        'let rate;',
        'if (a && (b || c)) { rate = 80; }',
        'else { rate = 20; }',
      ],
      TS: [
        'let a: boolean = true;',
        'let b: boolean = false;',
        'let c: boolean = true;',
        'let rate: number;',
        'if (a && (b || c)) { rate = 80; }',
        'else { rate = 20; }',
      ],
    },
  },
  {
    id: 'sample-d-not-parens',
    title: '샘플 D (not 괄호)',
    code: {
      vars: [{ name: 'x', type: 'number', value: 5 }],
      body: {
        kind: 'if',
        condition: {
          kind: 'not',
          operand: {
            kind: 'compare',
            op: '>',
            left: { kind: 'var', name: 'x' },
            right: { kind: 'literal', value: 3 },
          },
        },
        thenRate: 60,
      },
    },
    expected: {
      Java: ['int x = 5;', 'int rate;', 'if (!(x > 3)) { rate = 60; }'],
      JS: ['let x = 5;', 'let rate;', 'if (!(x > 3)) { rate = 60; }'],
      TS: ['let x: number = 5;', 'let rate: number;', 'if (!(x > 3)) { rate = 60; }'],
    },
  },
  {
    id: 'sample-e-double',
    title: '샘플 E (소수 → Java double)',
    code: {
      vars: [{ name: 'luck', type: 'number', value: 0.5 }],
      body: {
        kind: 'if',
        condition: {
          kind: 'compare',
          op: '>=',
          left: { kind: 'var', name: 'luck' },
          right: { kind: 'literal', value: 0.5 },
        },
        thenRate: 70,
        elseRate: 30,
      },
    },
    expected: {
      Java: [
        'double luck = 0.5;',
        'int rate;',
        'if (luck >= 0.5) { rate = 70; }',
        'else { rate = 30; }',
      ],
      JS: [
        'let luck = 0.5;',
        'let rate;',
        'if (luck >= 0.5) { rate = 70; }',
        'else { rate = 30; }',
      ],
      TS: [
        'let luck: number = 0.5;',
        'let rate: number;',
        'if (luck >= 0.5) { rate = 70; }',
        'else { rate = 30; }',
      ],
    },
  },
];
