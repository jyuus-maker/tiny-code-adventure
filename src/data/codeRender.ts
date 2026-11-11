import {
  CODE_QA_MAX_LINES,
  CODE_QA_MAX_LOGICAL_OPS,
  type CodeLanguage,
} from '../config';
import {
  analyzeCode,
  buildTypeEnv,
  DEFAULT_RESULT_VAR,
  inferExprType,
  inferResultType,
  isExprVar,
  type CodeAnalysis,
  type CodeExprV2,
  type CodeResultType,
  type CodeResultValue,
  type CodeValueType,
  type CodeVarV2,
  type NeutralCodeV2,
  type TypeEnv,
} from './codeSyntax';
import type { CodeCompareOp } from './types';

/**
 * 중립 코드 → Java / JS / TS 소스 줄 렌더러 (CHK 06).
 * v1 NeutralCode도 그대로 받는다(구조적 상위 타입 NeutralCodeV2).
 *
 * 언어별 규칙
 * - 선언: Java `int/double/boolean/String`, JS `let`, TS `let x: number/boolean/string`
 * - 동등/비동등: Java `==`/`!=`, JS·TS `===`/`!==`
 * - 나눗셈: Java는 두 피연산자가 정수면 `(double) a / b` (정수 나눗셈 방지). 결과는 double
 * - Math.random(): 세 언어 동일 표기
 * - 결과변수 타입: 대입값에서 추론(int/double/boolean). 본문 없으면 선언하지 않음
 * - 주석: `//` 줄 끝 정렬. 허용 여부는 analyzeCode가 판정(모험 금지·배틀 영어만)
 */

const EMPTY_ENV: TypeEnv = new Map();

function renderLiteral(value: number | boolean | string): string {
  if (typeof value === 'string') {
    return `"${value}"`;
  }
  return String(value);
}

function javaTypeOf(t: CodeValueType): string {
  switch (t) {
    case 'int':
      return 'int';
    case 'double':
      return 'double';
    case 'boolean':
      return 'boolean';
    case 'string':
      return 'String';
  }
}

function tsTypeOf(t: CodeValueType): string {
  return t === 'boolean' ? 'boolean' : t === 'string' ? 'string' : 'number';
}

function renderVarDecl(v: CodeVarV2, lang: CodeLanguage, env: TypeEnv): string {
  const valueType: CodeValueType = isExprVar(v)
    ? (env.get(v.name) ?? inferExprType(v.expr, env))
    : (env.get(v.name) ?? 'double');
  const rhs = isExprVar(v) ? renderExpr(v.expr, lang, env) : renderLiteral(v.value);

  if (lang === 'JS') {
    return `let ${v.name} = ${rhs};`;
  }
  if (lang === 'TS') {
    return `let ${v.name}: ${tsTypeOf(valueType)} = ${rhs};`;
  }
  return `${javaTypeOf(valueType)} ${v.name} = ${rhs};`;
}

function renderResultVarDecl(
  resultVar: string,
  resultType: CodeResultType,
  lang: CodeLanguage,
): string {
  if (lang === 'JS') {
    return `let ${resultVar};`;
  }
  if (lang === 'TS') {
    return `let ${resultVar}: ${tsTypeOf(resultType)};`;
  }
  return `${javaTypeOf(resultType)} ${resultVar};`;
}

function renderResultValue(value: CodeResultValue): string {
  return String(value);
}

/** 연산자 우선순위 (클수록 먼저 묶인다) */
function precedence(expr: CodeExprV2): number {
  switch (expr.kind) {
    case 'logical':
      return expr.op === '||' ? 1 : 2;
    case 'compare':
      return 3;
    case 'arith':
      return expr.op === '+' || expr.op === '-' ? 4 : 5;
    default:
      return 6;
  }
}

function renderCompareOp(op: CodeCompareOp, lang: CodeLanguage): string {
  if (op === '==') return lang === 'Java' ? '==' : '===';
  if (op === '!=') return lang === 'Java' ? '!=' : '!==';
  return op;
}

export function renderExpr(
  expr: CodeExprV2,
  lang: CodeLanguage = 'JS',
  env: TypeEnv = EMPTY_ENV,
): string {
  switch (expr.kind) {
    case 'var':
      return expr.name;
    case 'literal':
      return renderLiteral(expr.value);
    case 'random':
      return 'Math.random()';
    case 'compare':
      return `${renderExpr(expr.left, lang, env)} ${renderCompareOp(expr.op, lang)} ${renderExpr(expr.right, lang, env)}`;
    case 'not': {
      const inner = renderExpr(expr.operand, lang, env);
      const needsParens =
        expr.operand.kind !== 'var' &&
        expr.operand.kind !== 'literal' &&
        expr.operand.kind !== 'random';
      return needsParens ? `!(${inner})` : `!${inner}`;
    }
    case 'logical': {
      // 기존 규칙 보존: 다른 논리 연산자가 섞이면 괄호로 묶어 학습자가 우선순위를 읽게 한다
      const formatSide = (side: CodeExprV2): string => {
        const rendered = renderExpr(side, lang, env);
        if (side.kind === 'logical' && side.op !== expr.op) {
          return `(${rendered})`;
        }
        return rendered;
      };
      return `${formatSide(expr.left)} ${expr.op} ${formatSide(expr.right)}`;
    }
    case 'arith': {
      const myPrec = precedence(expr);
      const wrap = (side: CodeExprV2, isRight: boolean): string => {
        const rendered = renderExpr(side, lang, env);
        const p = precedence(side);
        const nonAssocRight =
          isRight && (expr.op === '-' || expr.op === '/') && p === myPrec;
        return p < myPrec || nonAssocRight ? `(${rendered})` : rendered;
      };
      let left = wrap(expr.left, false);
      const right = wrap(expr.right, true);
      if (
        expr.op === '/' &&
        lang === 'Java' &&
        inferExprType(expr.left, env) === 'int' &&
        inferExprType(expr.right, env) === 'int'
      ) {
        // Java 정수 나눗셈 방지: 왼쪽 피연산자를 double로 형변환
        left = `(double) ${left}`;
      }
      return `${left} ${expr.op} ${right}`;
    }
  }
}

/** 주석이 있는 줄은 `//` 위치를 맞춘다 (주석 줄 중 가장 긴 코드 기준으로 줄 끝 정렬) */
function attachComments(lines: string[], comments: (string | undefined)[]): string[] {
  const hasAny = comments.some((c) => c !== undefined);
  if (!hasAny) return lines;
  const width = Math.max(
    ...lines.map((l, i) => (comments[i] !== undefined ? l.length : 0)),
  );
  return lines.map((l, i) =>
    comments[i] === undefined ? l : `${l.padEnd(width)} // ${comments[i]}`,
  );
}

export function renderCode(code: NeutralCodeV2, lang: CodeLanguage): string[] {
  const env = buildTypeEnv(code.vars);
  const resultVar = code.resultVar ?? DEFAULT_RESULT_VAR;

  const varLines = code.vars.map((v) => renderVarDecl(v, lang, env));
  const lines: string[] = attachComments(
    varLines,
    code.vars.map((v) => v.comment),
  );

  const { body } = code;
  if (!body) return lines;

  const resultType = inferResultType(code) ?? 'int';
  lines.push(renderResultVarDecl(resultVar, resultType, lang));

  if (body.kind === 'if') {
    lines.push(
      `if (${renderExpr(body.condition, lang, env)}) { ${resultVar} = ${renderResultValue(body.thenRate)}; }`,
    );
    if (body.elseRate !== undefined) {
      lines.push(`else { ${resultVar} = ${renderResultValue(body.elseRate)}; }`);
    }
  } else {
    lines.push(`switch (${body.subject}) {`);
    const prefixes = body.cases.map((c) => `  case "${c.match}":`);
    const maxPrefixLen = Math.max(...prefixes.map((p) => p.length));

    body.cases.forEach((c, idx) => {
      const prefix = prefixes[idx];
      const pad = ' '.repeat(maxPrefixLen - prefix.length + 1);
      lines.push(`${prefix}${pad}${resultVar} = ${renderResultValue(c.rate)}; break;`);
    });
    lines.push('}');
  }

  return lines;
}

export function countLogicalOps(expr: CodeExprV2): number {
  switch (expr.kind) {
    case 'var':
    case 'literal':
    case 'random':
      return 0;
    case 'compare':
    case 'arith':
      return countLogicalOps(expr.left) + countLogicalOps(expr.right);
    case 'not':
      return 1 + countLogicalOps(expr.operand);
    case 'logical':
      return 1 + countLogicalOps(expr.left) + countLogicalOps(expr.right);
  }
}

export type CodeQaStats = CodeAnalysis & {
  maxLines: number;
  logicalOpCount: number;
  /** 6줄/논리연산 3개 초과 — QA 검토 기준이지 강제 FAIL이 아니다 */
  needsReview: boolean;
  /** analyzeCode 경고 존재 */
  hasIssues: boolean;
};

export function getCodeQaStats(code: NeutralCodeV2): CodeQaStats {
  const langs: readonly CodeLanguage[] = ['Java', 'JS', 'TS'];
  const maxLines = Math.max(
    ...langs.map((lang) => renderCode(code, lang).length),
  );
  const logicalOpCount =
    code.body?.kind === 'if' ? countLogicalOps(code.body.condition) : 0;
  const needsReview =
    maxLines > CODE_QA_MAX_LINES || logicalOpCount > CODE_QA_MAX_LOGICAL_OPS;
  const analysis = analyzeCode(code);

  return {
    ...analysis,
    maxLines,
    logicalOpCount,
    needsReview,
    hasIssues: analysis.issues.length > 0,
  };
}
