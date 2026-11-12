/**
 * CHK 06 — 중립 코드 확장 타입, 타입 추론, 판정 평가기, 정적 분석.
 *
 * `src/data/types.ts`의 v1 타입(NeutralCode/CodeExpr/CodeIf/CodeSwitch)은 손대지 않고,
 * 구조적으로 v1을 포함하는 v2 타입을 이 모듈에 둔다. v1 값은 그대로 v2 함수에 넘길 수 있다.
 *
 * v2에서 추가된 것
 * - 식: `random`(Math.random(), 3언어 동일 문법), `arith`(+ − × ÷, Java 정수 나눗셈은 렌더러가 (double) 형변환)
 * - 변수: 리터럴 대신 식으로 초기화(`expr`)하고, 줄 끝 주석(`comment`)을 둘 수 있다
 * - 결과값: 숫자 외 boolean 허용. 결과변수 타입은 값에서 추론하거나 `resultType`으로 지정
 * - 카드 종류: `cardKind` adventure(주석 금지) / battle(짧은 영어 명중률 주석만 허용)
 *
 * 표시(렌더러)와 판정(evaluateCode)은 같은 NeutralCodeV2 한 벌을 원천으로 쓴다. 코드 문자열을 eval하지 않는다.
 */
import type { Rng } from '../logic/rng';
import type {
  CodeCompareOp,
  CodeLogicalBinaryOp,
  CodeVar,
} from './types';

export type CodeValueType = 'int' | 'double' | 'boolean' | 'string';
export type CodeResultType = 'int' | 'double' | 'boolean';
export type CodeArithOp = '+' | '-' | '*' | '/';
export type CodeCardKind = 'adventure' | 'battle';

export type CodeExprV2 =
  | { kind: 'var'; name: string }
  | { kind: 'literal'; value: number | boolean | string }
  | { kind: 'compare'; op: CodeCompareOp; left: CodeExprV2; right: CodeExprV2 }
  | { kind: 'logical'; op: CodeLogicalBinaryOp; left: CodeExprV2; right: CodeExprV2 }
  | { kind: 'not'; operand: CodeExprV2 }
  /** Math.random() — 0 이상 1 미만. 판정 시 주입된 Rng에서 뽑는다 */
  | { kind: 'random' }
  | { kind: 'arith'; op: CodeArithOp; left: CodeExprV2; right: CodeExprV2 };

export type CodeVarType = 'number' | 'boolean' | 'string';

/** v1 리터럴 변수 + 선택적 주석 */
export type CodeVarLiteralV2 = CodeVar & { comment?: string };

/** 식으로 초기화하는 변수 (예: `let heroHit = heroHp / (heroHp + monsterHp);`) */
export type CodeVarExprV2 = {
  name: string;
  type: CodeVarType;
  expr: CodeExprV2;
  comment?: string;
};

export type CodeVarV2 = CodeVarLiteralV2 | CodeVarExprV2;

export function isExprVar(v: CodeVarV2): v is CodeVarExprV2 {
  return 'expr' in v;
}

export type CodeResultValue = number | boolean;

export type CodeIfV2 = {
  kind: 'if';
  condition: CodeExprV2;
  /** 조건이 참일 때 결과변수에 대입할 값 (v1 이름 유지. boolean도 허용) */
  thenRate: CodeResultValue;
  elseRate?: CodeResultValue;
};

export type CodeSwitchCaseV2 = { match: string; rate: CodeResultValue };

export type CodeSwitchV2 = {
  kind: 'switch';
  subject: string;
  /** 정확히 2케이스. 전체 경우를 포괄한다고 보고 default를 두지 않는다 */
  cases: [CodeSwitchCaseV2, CodeSwitchCaseV2];
};

export type NeutralCodeV2 = {
  vars: CodeVarV2[];
  /** 분기 본문. 배틀 명중률 표시처럼 변수 선언만 있는 코드는 생략 가능 */
  body?: CodeIfV2 | CodeSwitchV2;
  /** 결과변수 이름. 기본 'rate' */
  resultVar?: string;
  /** 결과변수 타입. 생략 시 대입값에서 추론 */
  resultType?: CodeResultType;
  /** 기본 adventure */
  cardKind?: CodeCardKind;
};

export const DEFAULT_RESULT_VAR = 'rate';

// ---------------------------------------------------------------------------
// 타입 추론
// ---------------------------------------------------------------------------

export function literalType(value: number | boolean | string): CodeValueType {
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'string') return 'string';
  return Number.isInteger(value) ? 'int' : 'double';
}

export type TypeEnv = ReadonlyMap<string, CodeValueType>;

/**
 * 식의 정적 타입. 나눗셈은 항상 double(Java는 렌더러가 (double) 형변환으로 맞춘다).
 * 알 수 없는 변수는 double로 보고, 문제는 analyzeCode의 issues에서 보고한다.
 */
export function inferExprType(expr: CodeExprV2, env: TypeEnv): CodeValueType {
  switch (expr.kind) {
    case 'var':
      return env.get(expr.name) ?? 'double';
    case 'literal':
      return literalType(expr.value);
    case 'compare':
    case 'logical':
    case 'not':
      return 'boolean';
    case 'random':
      return 'double';
    case 'arith': {
      const l = inferExprType(expr.left, env);
      const r = inferExprType(expr.right, env);
      if (expr.op === '/') return 'double';
      return l === 'int' && r === 'int' ? 'int' : 'double';
    }
  }
}

/** 변수 선언 순서대로 타입 환경을 만든다 (뒤 변수는 앞 변수를 참조할 수 있다) */
export function buildTypeEnv(vars: readonly CodeVarV2[]): Map<string, CodeValueType> {
  const env = new Map<string, CodeValueType>();
  for (const v of vars) {
    if (isExprVar(v)) {
      const inferred = inferExprType(v.expr, env);
      // 선언 타입이 number면 식 타입(int/double)을 따르고, boolean/string은 선언을 따른다
      env.set(v.name, v.type === 'number' ? (inferred === 'int' ? 'int' : 'double') : v.type);
    } else {
      env.set(v.name, literalType(v.value));
    }
  }
  return env;
}

export function resultValuesOf(body: CodeIfV2 | CodeSwitchV2): CodeResultValue[] {
  if (body.kind === 'if') {
    return body.elseRate === undefined ? [body.thenRate] : [body.thenRate, body.elseRate];
  }
  return body.cases.map((c) => c.rate);
}

/** 결과변수 타입: 지정값 우선, 없으면 대입값에서 추론. 본문이 없으면 null */
export function inferResultType(code: NeutralCodeV2): CodeResultType | null {
  if (!code.body) return null;
  if (code.resultType) return code.resultType;
  const values = resultValuesOf(code.body);
  if (values.every((v) => typeof v === 'boolean')) return 'boolean';
  if (values.some((v) => typeof v === 'number' && !Number.isInteger(v))) return 'double';
  return 'int';
}

// ---------------------------------------------------------------------------
// 판정 평가기 — 표시 코드와 같은 데이터로 실제 분기값을 계산한다
// ---------------------------------------------------------------------------

export type CodeValue = number | boolean | string;

export type CodeEvaluation = {
  /** 선언 순서대로 계산된 변수 값 */
  vars: Record<string, CodeValue>;
  /** if 조건의 실제 값 (switch·본문 없음이면 null) */
  conditionValue: boolean | null;
  /** 'then' | 'else' | 'case:<match>' | 'none'(결과 미정의 경로) | 'no-body' */
  path: string;
  result: CodeResultValue | undefined;
  /** Math.random()으로 뽑은 값들 (단락 평가로 건너뛴 random은 뽑지 않는다) */
  randomDraws: number[];
};

export class CodeEvalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CodeEvalError';
  }
}

function asNumber(v: CodeValue, where: string): number {
  if (typeof v !== 'number') throw new CodeEvalError(`${where}: 숫자가 아님 (${String(v)})`);
  return v;
}

function asBoolean(v: CodeValue, where: string): boolean {
  if (typeof v !== 'boolean') throw new CodeEvalError(`${where}: boolean이 아님 (${String(v)})`);
  return v;
}

export function evaluateExpr(
  expr: CodeExprV2,
  vars: Readonly<Record<string, CodeValue>>,
  rng: Rng,
  draws: number[],
): CodeValue {
  switch (expr.kind) {
    case 'var': {
      if (!(expr.name in vars)) throw new CodeEvalError(`선언되지 않은 변수 ${expr.name}`);
      return vars[expr.name];
    }
    case 'literal':
      return expr.value;
    case 'random': {
      const r = rng();
      draws.push(r);
      return r;
    }
    case 'not':
      return !asBoolean(evaluateExpr(expr.operand, vars, rng, draws), '!');
    case 'logical': {
      // 세 언어 모두 단락 평가: 왼쪽으로 결과가 정해지면 오른쪽(random 포함)을 평가하지 않는다
      const l = asBoolean(evaluateExpr(expr.left, vars, rng, draws), expr.op);
      if (expr.op === '&&' && !l) return false;
      if (expr.op === '||' && l) return true;
      return asBoolean(evaluateExpr(expr.right, vars, rng, draws), expr.op);
    }
    case 'compare': {
      const l = evaluateExpr(expr.left, vars, rng, draws);
      const r = evaluateExpr(expr.right, vars, rng, draws);
      switch (expr.op) {
        case '==':
          return l === r;
        case '!=':
          return l !== r;
        case '>':
          return asNumber(l, '>') > asNumber(r, '>');
        case '<':
          return asNumber(l, '<') < asNumber(r, '<');
        case '>=':
          return asNumber(l, '>=') >= asNumber(r, '>=');
        case '<=':
          return asNumber(l, '<=') <= asNumber(r, '<=');
      }
      break;
    }
    case 'arith': {
      const l = asNumber(evaluateExpr(expr.left, vars, rng, draws), expr.op);
      const r = asNumber(evaluateExpr(expr.right, vars, rng, draws), expr.op);
      switch (expr.op) {
        case '+':
          return l + r;
        case '-':
          return l - r;
        case '*':
          return l * r;
        case '/':
          // 실수 나눗셈. Java 렌더링도 (double) 형변환으로 같은 값을 만든다
          return l / r;
      }
    }
  }
  throw new CodeEvalError('알 수 없는 식');
}

/**
 * 코드 한 벌을 실제로 평가한다. rng를 주입하므로 시드로 재현할 수 있다.
 * 표시용 렌더링과 같은 NeutralCodeV2를 쓰는 것이 "판정 데이터 공유"의 계약이다.
 */
export function evaluateCode(code: NeutralCodeV2, rng: Rng): CodeEvaluation {
  const vars: Record<string, CodeValue> = {};
  const draws: number[] = [];
  for (const v of code.vars) {
    vars[v.name] = isExprVar(v) ? evaluateExpr(v.expr, vars, rng, draws) : v.value;
  }

  const body = code.body;
  if (!body) {
    return { vars, conditionValue: null, path: 'no-body', result: undefined, randomDraws: draws };
  }

  if (body.kind === 'if') {
    const cond = asBoolean(evaluateExpr(body.condition, vars, rng, draws), 'if');
    if (cond) {
      return { vars, conditionValue: cond, path: 'then', result: body.thenRate, randomDraws: draws };
    }
    if (body.elseRate !== undefined) {
      return { vars, conditionValue: cond, path: 'else', result: body.elseRate, randomDraws: draws };
    }
    return { vars, conditionValue: cond, path: 'none', result: undefined, randomDraws: draws };
  }

  const subject = vars[body.subject];
  if (subject === undefined) throw new CodeEvalError(`switch 대상 변수 ${body.subject} 없음`);
  const hit = body.cases.find((c) => c.match === subject);
  if (!hit) {
    return { vars, conditionValue: null, path: 'none', result: undefined, randomDraws: draws };
  }
  return { vars, conditionValue: null, path: `case:${hit.match}`, result: hit.rate, randomDraws: draws };
}

// ---------------------------------------------------------------------------
// 정적 분석 — 결과변수 정의 보장, 타입 정합, 주석 규칙, 문자열 비교 경계
// ---------------------------------------------------------------------------

export type CodeAnalysis = {
  resultType: CodeResultType | null;
  /** if/else·switch 모든 경로에서 결과변수가 대입되는가. 본문 없음은 null */
  resultDefinedOnAllPaths: boolean | null;
  /** QA 경고. 비어 있으면 문제 없음. 강제 FAIL이 아니라 검토 항목 */
  issues: string[];
};

// TEMP: 배틀 주석 허용 길이 초안 (짧은 영어 명중률 주석)
export const BATTLE_COMMENT_MAX_LENGTH = 40;

function collectCompares(expr: CodeExprV2, out: Extract<CodeExprV2, { kind: 'compare' }>[]): void {
  switch (expr.kind) {
    case 'compare':
      out.push(expr);
      collectCompares(expr.left, out);
      collectCompares(expr.right, out);
      return;
    case 'logical':
    case 'arith':
      collectCompares(expr.left, out);
      collectCompares(expr.right, out);
      return;
    case 'not':
      collectCompares(expr.operand, out);
      return;
    default:
      return;
  }
}

function collectVarRefs(expr: CodeExprV2, out: string[]): void {
  switch (expr.kind) {
    case 'var':
      out.push(expr.name);
      return;
    case 'compare':
    case 'logical':
    case 'arith':
      collectVarRefs(expr.left, out);
      collectVarRefs(expr.right, out);
      return;
    case 'not':
      collectVarRefs(expr.operand, out);
      return;
    default:
      return;
  }
}

export function analyzeCode(code: NeutralCodeV2): CodeAnalysis {
  const issues: string[] = [];
  const cardKind = code.cardKind ?? 'adventure';
  const env = buildTypeEnv(code.vars);
  const resultVar = code.resultVar ?? DEFAULT_RESULT_VAR;

  // 변수 참조·중복
  const seen = new Set<string>();
  const declaredSoFar = new Set<string>();
  for (const v of code.vars) {
    if (seen.has(v.name)) issues.push(`변수 ${v.name} 중복 선언`);
    seen.add(v.name);
    if (isExprVar(v)) {
      const refs: string[] = [];
      collectVarRefs(v.expr, refs);
      for (const r of refs) {
        if (!declaredSoFar.has(r)) issues.push(`변수 ${v.name}의 식이 선언 전 변수 ${r}를 참조`);
      }
      const t = inferExprType(v.expr, env);
      if (v.type === 'boolean' && t !== 'boolean') issues.push(`변수 ${v.name}: boolean 선언에 ${t} 식`);
      if (v.type === 'number' && (t === 'boolean' || t === 'string')) issues.push(`변수 ${v.name}: number 선언에 ${t} 식`);
    }
    declaredSoFar.add(v.name);
    if (v.name === resultVar) issues.push(`결과변수 ${resultVar}와 같은 이름의 변수 선언`);

    // 주석 규칙 (§5-4): 모험 카드 주석 금지, 배틀은 짧은 영어만
    if (v.comment !== undefined) {
      if (cardKind === 'adventure') {
        issues.push(`모험 카드 주석 금지: ${v.name} // ${v.comment}`);
      } else {
        if (!/^[\x20-\x7E]*$/.test(v.comment)) issues.push(`배틀 주석은 영어(ASCII)만: ${v.name}`);
        if (v.comment.length > BATTLE_COMMENT_MAX_LENGTH) issues.push(`배틀 주석이 너무 김(${v.comment.length}자): ${v.name}`);
      }
    }
  }

  const body = code.body;
  let resultDefinedOnAllPaths: boolean | null = null;
  const resultType = inferResultType(code);

  if (body) {
    const values = resultValuesOf(body);
    const kinds = new Set(values.map((v) => typeof v));
    if (kinds.size > 1) issues.push('결과값 타입이 섞임 (숫자와 boolean)');
    if (resultType === 'int' && values.some((v) => typeof v === 'number' && !Number.isInteger(v))) {
      issues.push('resultType int인데 실수 대입값 존재');
    }
    if (resultType === 'boolean' && values.some((v) => typeof v !== 'boolean')) {
      issues.push('resultType boolean인데 숫자 대입값 존재');
    }

    if (body.kind === 'if') {
      resultDefinedOnAllPaths = body.elseRate !== undefined;
      if (!resultDefinedOnAllPaths) {
        issues.push('else 없음: 결과변수가 대입되지 않는 경로 존재 (Java에서는 이후 사용 시 미초기화 오류)');
      }
      const refs: string[] = [];
      collectVarRefs(body.condition, refs);
      for (const r of refs) if (!env.has(r)) issues.push(`조건식이 선언되지 않은 변수 ${r} 참조`);

      if (inferExprType(body.condition, env) !== 'boolean') issues.push('if 조건식이 boolean이 아님');

      const compares: Extract<CodeExprV2, { kind: 'compare' }>[] = [];
      collectCompares(body.condition, compares);
      for (const c of compares) {
        const lt = inferExprType(c.left, env);
        const rt = inferExprType(c.right, env);
        const numeric = (t: CodeValueType) => t === 'int' || t === 'double';
        if ((c.op === '==' || c.op === '!=') && (lt === 'string' || rt === 'string')) {
          issues.push(`문자열 ${c.op} 비교: Java는 .equals()가 필요. 승인 전 미지원 (문자열은 switch 사용)`);
        }
        if (c.op !== '==' && c.op !== '!=' && !(numeric(lt) && numeric(rt))) {
          issues.push(`${c.op} 비교의 피연산자가 숫자가 아님 (${lt}, ${rt})`);
        }
        if ((c.op === '==' || c.op === '!=') && numeric(lt) !== numeric(rt) && lt !== rt) {
          issues.push(`${c.op} 비교의 타입 불일치 (${lt}, ${rt})`);
        }
        // tsc --strict 실측: `let x: boolean = false; if (x !== true)`는 초기값 narrowing(false)으로 TS2367 오류.
        // boolean은 !x / x 로 표현한다 (기존 샘플 A의 !rotten 방식)
        const isBoolLiteral = (e: CodeExprV2) => e.kind === 'literal' && typeof e.value === 'boolean';
        if ((c.op === '==' || c.op === '!=') && (isBoolLiteral(c.left) || isBoolLiteral(c.right))) {
          issues.push(`boolean을 true/false 리터럴과 ${c.op} 비교: TS는 초기값 narrowing으로 타입 오류(TS2367). !x 또는 x로 표현`);
        }
      }
    } else {
      const subjectType = env.get(body.subject);
      if (subjectType === undefined) issues.push(`switch 대상 변수 ${body.subject} 미선언`);
      else if (subjectType !== 'string') issues.push(`switch 대상 ${body.subject}가 문자열이 아님 (${subjectType})`);
      if (body.cases[0].match === body.cases[1].match) issues.push('switch 두 case의 match가 같음');
      // 전체 경우 포괄 가정: 현재 값이 두 case 중 하나여야 한다
      const subjectVar = code.vars.find((v) => v.name === body.subject);
      const current = subjectVar && !isExprVar(subjectVar) ? subjectVar.value : undefined;
      const covered = current === undefined || body.cases.some((c) => c.match === current);
      resultDefinedOnAllPaths = covered;
      if (!covered) issues.push(`switch 대상 현재 값 "${String(current)}"이 두 case에 없음 (default 없음 규칙 위반)`);
    }
  }

  return { resultType, resultDefinedOnAllPaths, issues };
}
