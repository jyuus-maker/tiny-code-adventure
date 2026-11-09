import {
  CODE_QA_MAX_LINES,
  CODE_QA_MAX_LOGICAL_OPS,
  type CodeLanguage,
} from '../config';
import type { CodeExpr, CodeVar, NeutralCode } from './types';

function renderLiteral(value: number | boolean | string): string {
  if (typeof value === 'string') {
    return `"${value}"`;
  }
  return String(value);
}

function renderVarDecl(v: CodeVar, lang: CodeLanguage): string {
  const valStr = renderLiteral(v.value);

  if (lang === 'JS') {
    return `let ${v.name} = ${valStr};`;
  }

  if (lang === 'TS') {
    return `let ${v.name}: ${v.type} = ${valStr};`;
  }

  // Java
  if (v.type === 'number') {
    const javaNumType = Number.isInteger(v.value) ? 'int' : 'double';
    return `${javaNumType} ${v.name} = ${valStr};`;
  }
  if (v.type === 'boolean') {
    return `boolean ${v.name} = ${valStr};`;
  }
  return `String ${v.name} = ${valStr};`;
}

function renderResultVarDecl(resultVar: string, lang: CodeLanguage): string {
  if (lang === 'JS') {
    return `let ${resultVar};`;
  }
  if (lang === 'TS') {
    return `let ${resultVar}: number;`;
  }
  return `int ${resultVar};`;
}

export function renderExpr(expr: CodeExpr): string {
  switch (expr.kind) {
    case 'var':
      return expr.name;
    case 'literal':
      return renderLiteral(expr.value);
    case 'compare':
      return `${renderExpr(expr.left)} ${expr.op} ${renderExpr(expr.right)}`;
    case 'not': {
      const inner = renderExpr(expr.operand);
      const needsParens =
        expr.operand.kind !== 'var' && expr.operand.kind !== 'literal';
      return needsParens ? `!(${inner})` : `!${inner}`;
    }
    case 'logical': {
      const formatSide = (side: CodeExpr): string => {
        const rendered = renderExpr(side);
        if (side.kind === 'logical' && side.op !== expr.op) {
          return `(${rendered})`;
        }
        return rendered;
      };
      return `${formatSide(expr.left)} ${expr.op} ${formatSide(expr.right)}`;
    }
  }
}

export function renderCode(code: NeutralCode, lang: CodeLanguage): string[] {
  const lines: string[] = [];
  const resultVar = code.resultVar ?? 'rate';

  for (const v of code.vars) {
    lines.push(renderVarDecl(v, lang));
  }

  lines.push(renderResultVarDecl(resultVar, lang));

  const { body } = code;
  if (body.kind === 'if') {
    lines.push(
      `if (${renderExpr(body.condition)}) { ${resultVar} = ${body.thenRate}; }`,
    );
    if (body.elseRate !== undefined) {
      lines.push(`else { ${resultVar} = ${body.elseRate}; }`);
    }
  } else {
    lines.push(`switch (${body.subject}) {`);
    const prefixes = body.cases.map((c) => `  case "${c.match}":`);
    const maxPrefixLen = Math.max(...prefixes.map((p) => p.length));

    body.cases.forEach((c, idx) => {
      const prefix = prefixes[idx];
      const pad = ' '.repeat(maxPrefixLen - prefix.length + 1);
      lines.push(`${prefix}${pad}${resultVar} = ${c.rate}; break;`);
    });
    lines.push('}');
  }

  return lines;
}

export function countLogicalOps(expr: CodeExpr): number {
  switch (expr.kind) {
    case 'var':
    case 'literal':
      return 0;
    case 'compare':
      return countLogicalOps(expr.left) + countLogicalOps(expr.right);
    case 'not':
      return 1 + countLogicalOps(expr.operand);
    case 'logical':
      return 1 + countLogicalOps(expr.left) + countLogicalOps(expr.right);
  }
}

export type CodeQaStats = {
  maxLines: number;
  logicalOpCount: number;
  needsReview: boolean;
};

export function getCodeQaStats(code: NeutralCode): CodeQaStats {
  const langs: readonly CodeLanguage[] = ['Java', 'JS', 'TS'];
  const maxLines = Math.max(
    ...langs.map((lang) => renderCode(code, lang).length),
  );
  const logicalOpCount =
    code.body.kind === 'if' ? countLogicalOps(code.body.condition) : 0;
  const needsReview =
    maxLines > CODE_QA_MAX_LINES || logicalOpCount > CODE_QA_MAX_LOGICAL_OPS;

  return {
    maxLines,
    logicalOpCount,
    needsReview,
  };
}
