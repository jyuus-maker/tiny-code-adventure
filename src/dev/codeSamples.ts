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
    title: '샘플 A (if)',
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
        thenComment: 'hero hit: 56%',
      },
    },
    expected: {
      Java: [
        'int hp = 45;',
        'boolean rotten = true;',
        'if (hp > 30 && !rotten) {',
        '  // hero hit: 56%',
        '}',
      ],
      JS: [
        'let hp = 45;',
        'let rotten = true;',
        'if (hp > 30 && !rotten) {',
        '  // hero hit: 56%',
        '}',
      ],
      TS: [
        'let hp: number = 45;',
        'let rotten: boolean = true;',
        'if (hp > 30 && !rotten) {',
        '  // hero hit: 56%',
        '}',
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
          { match: 'DAY', comment: 'rest: 70%' },
          { match: 'NIGHT', comment: 'rest: 40%' },
        ],
      },
    },
    expected: {
      Java: [
        'String time = "NIGHT";',
        'switch (time) {',
        '  case "DAY":',
        '    // rest: 70%',
        '    break;',
        '  case "NIGHT":',
        '    // rest: 40%',
        '    break;',
        '}',
      ],
      JS: [
        'let time = "NIGHT";',
        'switch (time) {',
        '  case "DAY":',
        '    // rest: 70%',
        '    break;',
        '  case "NIGHT":',
        '    // rest: 40%',
        '    break;',
        '}',
      ],
      TS: [
        'let time: string = "NIGHT";',
        'switch (time) {',
        '  case "DAY":',
        '    // rest: 70%',
        '    break;',
        '  case "NIGHT":',
        '    // rest: 40%',
        '    break;',
        '}',
      ],
    },
  },
  {
    id: 'sample-c-parens-logical',
    title: '샘플 C (괄호 규칙: a && (b || c))',
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
        thenComment: 'success: 80%',
        elseComment: 'success: 20%',
      },
    },
    expected: {
      Java: [
        'boolean a = true;',
        'boolean b = false;',
        'boolean c = true;',
        'if (a && (b || c)) {',
        '  // success: 80%',
        '} else {',
        '  // success: 20%',
        '}',
      ],
      JS: [
        'let a = true;',
        'let b = false;',
        'let c = true;',
        'if (a && (b || c)) {',
        '  // success: 80%',
        '} else {',
        '  // success: 20%',
        '}',
      ],
      TS: [
        'let a: boolean = true;',
        'let b: boolean = false;',
        'let c: boolean = true;',
        'if (a && (b || c)) {',
        '  // success: 80%',
        '} else {',
        '  // success: 20%',
        '}',
      ],
    },
  },
  {
    id: 'sample-d-parens-not',
    title: '샘플 D (괄호 규칙: !(x > 3))',
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
        thenComment: 'safe: 60%',
      },
    },
    expected: {
      Java: [
        'int x = 5;',
        'if (!(x > 3)) {',
        '  // safe: 60%',
        '}',
      ],
      JS: [
        'let x = 5;',
        'if (!(x > 3)) {',
        '  // safe: 60%',
        '}',
      ],
      TS: [
        'let x: number = 5;',
        'if (!(x > 3)) {',
        '  // safe: 60%',
        '}',
      ],
    },
  },
];
