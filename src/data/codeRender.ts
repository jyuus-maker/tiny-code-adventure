import type { CodeLanguage } from '../config';
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

  for (const v of code.vars) {
    lines.push(renderVarDecl(v, lang));
  }

  const { body } = code;
  if (body.kind === 'if') {
    lines.push(`if (${renderExpr(body.condition)}) {`);
    if (body.thenComment !== undefined) {
      lines.push(`  // ${body.thenComment}`);
    }
    if (body.elseComment !== undefined) {
      lines.push('} else {');
      lines.push(`  // ${body.elseComment}`);
      lines.push('}');
    } else {
      lines.push('}');
    }
  } else {
    lines.push(`switch (${body.subject}) {`);
    for (const c of body.cases) {
      lines.push(`  case "${c.match}":`);
      if (c.comment !== undefined) {
        lines.push(`    // ${c.comment}`);
      }
      lines.push('    break;');
    }
    lines.push('}');
  }

  return lines;
}
