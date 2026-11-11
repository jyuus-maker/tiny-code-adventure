/**
 * CHK 06 검증 실행기. RenderCheck 코드 탭과 독립 스크립트가 같은 로직을 쓴다.
 */
import type { CodeLanguage } from '../config';
import {
  ALTAR_SYNTAX_INSCRIPTIONS,
  classifyInscriptionChoice,
  type AltarSyntaxVerdict,
} from '../data/altarSyntax';
import { getCodeQaStats, renderCode } from '../data/codeRender';
import { evaluateCode } from '../data/codeSyntax';
import { createSeededRng, type Rng } from '../logic/rng';
import { CHK06_EVAL_CASES, CHK06_ISSUE_CASES, CHK06_SAMPLES } from './codeChk06Samples';
import { CODE_SAMPLES } from './codeSamples';

export const CHECK_LANGUAGES: readonly CodeLanguage[] = ['Java', 'JS', 'TS'];

export type CheckResult = {
  id: string;
  label: string;
  pass: boolean;
  detail: string;
};

function linesEqual(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((l, i) => l === b[i]);
}

/** 기존 샘플 A~E + CHK06 샘플 F1~F7의 언어별 기대 출력 일치 */
export function runRenderChecks(): CheckResult[] {
  const out: CheckResult[] = [];
  for (const s of [...CODE_SAMPLES, ...CHK06_SAMPLES]) {
    for (const lang of CHECK_LANGUAGES) {
      const rendered = renderCode(s.code, lang);
      const pass = linesEqual(rendered, s.expected[lang]);
      out.push({
        id: `${s.id}:${lang}`,
        label: `${s.id} ${lang}`,
        pass,
        detail: pass
          ? `${rendered.length}줄 일치`
          : `기대:\n${s.expected[lang].join('\n')}\n실제:\n${rendered.join('\n')}`,
      });
    }
  }
  return out;
}

/** 정적 분석 경고 검출 */
export function runIssueChecks(): CheckResult[] {
  return CHK06_ISSUE_CASES.map((c) => {
    const qa = getCodeQaStats(c.code);
    const missing = c.expectIssueIncludes.filter(
      (needle) => !qa.issues.some((i) => i.includes(needle)),
    );
    const reviewOk = c.expectNeedsReview === undefined || qa.needsReview === c.expectNeedsReview;
    const definedOk =
      c.expectDefinedOnAllPaths === undefined ||
      qa.resultDefinedOnAllPaths === c.expectDefinedOnAllPaths;
    const pass = missing.length === 0 && reviewOk && definedOk;
    return {
      id: c.id,
      label: c.title,
      pass,
      detail: pass
        ? `issues=[${qa.issues.join(' | ')}] needsReview=${qa.needsReview} defined=${qa.resultDefinedOnAllPaths}`
        : `누락 문구=[${missing.join(', ')}] needsReview=${qa.needsReview}(기대 ${c.expectNeedsReview}) defined=${qa.resultDefinedOnAllPaths}(기대 ${c.expectDefinedOnAllPaths}) issues=[${qa.issues.join(' | ')}]`,
    };
  });
}

/** 기존 5개 샘플은 경고 없이 통과해야 한다 (A는 else 없음 경고만 허용) */
export function runLegacySampleQaChecks(): CheckResult[] {
  return CODE_SAMPLES.map((s) => {
    const qa = getCodeQaStats(s.code);
    const allowed = qa.issues.filter((i) => !i.startsWith('else 없음'));
    const pass = allowed.length === 0 && !qa.needsReview;
    return {
      id: `legacy-qa:${s.id}`,
      label: `${s.id} QA 경고 없음(else 없음 제외)`,
      pass,
      detail: `issues=[${qa.issues.join(' | ')}] maxLines=${qa.maxLines} ops=${qa.logicalOpCount} resultType=${qa.resultType}`,
    };
  });
}

function sequenceRng(draws: number[]): Rng {
  let i = 0;
  return () => {
    if (i >= draws.length) throw new Error(`난수 열 소진 (${draws.length}개)`);
    return draws[i++];
  };
}

function nearlyEqual(a: unknown, b: unknown): boolean {
  if (typeof a === 'number' && typeof b === 'number') return Math.abs(a - b) < 1e-9;
  return a === b;
}

/** 표시 코드와 같은 데이터로 분기값을 계산 (eval 없이) */
export function runEvalChecks(): CheckResult[] {
  return CHK06_EVAL_CASES.map((c) => {
    const sample = CHK06_SAMPLES.find((s) => s.id === c.sampleId);
    if (!sample) return { id: c.id, label: c.title, pass: false, detail: `샘플 ${c.sampleId} 없음` };
    try {
      const ev = evaluateCode(sample.code, sequenceRng(c.draws));
      const problems: string[] = [];
      if (ev.path !== c.expectPath) problems.push(`path ${ev.path} ≠ ${c.expectPath}`);
      if (!nearlyEqual(ev.result, c.expectResult)) problems.push(`result ${String(ev.result)} ≠ ${String(c.expectResult)}`);
      if (c.expectDrawCount !== undefined && ev.randomDraws.length !== c.expectDrawCount) {
        problems.push(`random 소비 ${ev.randomDraws.length} ≠ ${c.expectDrawCount}`);
      }
      for (const [k, v] of Object.entries(c.expectVars ?? {})) {
        if (!nearlyEqual(ev.vars[k], v)) problems.push(`${k}=${String(ev.vars[k])} ≠ ${String(v)}`);
      }
      return {
        id: c.id,
        label: c.title,
        pass: problems.length === 0,
        detail: problems.length === 0
          ? `path=${ev.path} result=${String(ev.result)} draws=${ev.randomDraws.length}`
          : problems.join('; '),
      };
    } catch (e) {
      return { id: c.id, label: c.title, pass: false, detail: `예외: ${(e as Error).message}` };
    }
  });
}

export type ProbabilityCheck = CheckResult & {
  displayed: number;
  measured: number;
  trials: number;
  seed: number;
};

// TEMP: 통계 검증 허용 오차 (0.3, 20000회 기준 3σ ≈ 0.0097)
export const PROBABILITY_TOLERANCE = 0.015;
export const PROBABILITY_TRIALS = 20_000;
export const PROBABILITY_SEED = 20261111;

/** F1의 표시 확률(0.3)과 시드 난수로 실측한 then 비율이 일치하는가 + 시드 재현성 */
export function runProbabilityChecks(): ProbabilityCheck[] {
  const sample = CHK06_SAMPLES.find((s) => s.id === 'chk06-random-if');
  if (!sample || !sample.code.body || sample.code.body.kind !== 'if') return [];
  const cond = sample.code.body.condition;
  const displayed =
    cond.kind === 'compare' && cond.right.kind === 'literal' && typeof cond.right.value === 'number'
      ? cond.right.value
      : NaN;

  const run = (seed: number) => {
    const rng = createSeededRng(seed);
    let hits = 0;
    const firstPaths: string[] = [];
    for (let i = 0; i < PROBABILITY_TRIALS; i++) {
      const ev = evaluateCode(sample.code, rng);
      if (ev.path === 'then') hits++;
      if (i < 50) firstPaths.push(ev.path);
    }
    return { fraction: hits / PROBABILITY_TRIALS, firstPaths };
  };
  const a = run(PROBABILITY_SEED);
  const b = run(PROBABILITY_SEED);
  const c = run(PROBABILITY_SEED + 1);

  const diff = Math.abs(a.fraction - displayed);
  const reproducible = a.firstPaths.join(',') === b.firstPaths.join(',') && a.fraction === b.fraction;
  const differsAcrossSeeds = a.firstPaths.join(',') !== c.firstPaths.join(',');

  return [
    {
      id: 'prob-match',
      label: `표시 확률 ${displayed} vs 실측 then 비율 (${PROBABILITY_TRIALS}회, 시드 ${PROBABILITY_SEED})`,
      pass: diff <= PROBABILITY_TOLERANCE,
      detail: `실측 ${a.fraction.toFixed(4)}, 차이 ${diff.toFixed(4)} (허용 ${PROBABILITY_TOLERANCE})`,
      displayed,
      measured: a.fraction,
      trials: PROBABILITY_TRIALS,
      seed: PROBABILITY_SEED,
    },
    {
      id: 'prob-reproducible',
      label: '같은 시드 → 같은 분기 열·같은 비율 (재현성)',
      pass: reproducible,
      detail: `첫 50장 분기 열 동일=${reproducible}, 비율 ${a.fraction.toFixed(4)} = ${b.fraction.toFixed(4)}`,
      displayed,
      measured: b.fraction,
      trials: PROBABILITY_TRIALS,
      seed: PROBABILITY_SEED,
    },
    {
      id: 'prob-seed-differs',
      label: '다른 시드 → 다른 분기 열 (난수 주입이 실제로 반영됨)',
      pass: differsAcrossSeeds,
      detail: `시드 ${PROBABILITY_SEED + 1} 실측 ${c.fraction.toFixed(4)}`,
      displayed,
      measured: c.fraction,
      trials: PROBABILITY_TRIALS,
      seed: PROBABILITY_SEED + 1,
    },
  ];
}

export type AltarVerdictRow = {
  inscriptionId: string;
  regionLang: CodeLanguage;
  verdicts: Record<CodeLanguage, AltarSyntaxVerdict>;
};

export function buildAltarVerdictTable(): AltarVerdictRow[] {
  const rows: AltarVerdictRow[] = [];
  for (const ins of ALTAR_SYNTAX_INSCRIPTIONS) {
    for (const regionLang of CHECK_LANGUAGES) {
      rows.push({
        inscriptionId: ins.id,
        regionLang,
        verdicts: {
          Java: classifyInscriptionChoice(ins, 'Java', regionLang),
          JS: classifyInscriptionChoice(ins, 'JS', regionLang),
          TS: classifyInscriptionChoice(ins, 'TS', regionLang),
        },
      });
    }
  }
  return rows;
}

/** 술식 분류 경계: 정답은 항상 correct, JS→TS만 술식별로 compatible/wrong, 그 외 전부 wrong */
export function runAltarChecks(): CheckResult[] {
  const out: CheckResult[] = [];
  let compatibleCount = 0;
  let wrongJsInTs = 0;
  for (const ins of ALTAR_SYNTAX_INSCRIPTIONS) {
    const problems: string[] = [];
    for (const regionLang of CHECK_LANGUAGES) {
      for (const chosen of CHECK_LANGUAGES) {
        const v = classifyInscriptionChoice(ins, chosen, regionLang);
        if (chosen === regionLang && v !== 'correct') problems.push(`${chosen}@${regionLang} ${v}`);
        if (chosen !== regionLang) {
          const expected: AltarSyntaxVerdict =
            chosen === 'JS' && regionLang === 'TS' && ins.validUnder.JS.TS ? 'compatible' : 'wrong';
          if (v !== expected) problems.push(`${chosen}@${regionLang} ${v} ≠ ${expected}`);
        }
      }
    }
    if (ins.validUnder.JS.TS) compatibleCount++;
    else wrongJsInTs++;
    const distinct = new Set(CHECK_LANGUAGES.map((l) => ins.snippets[l].join('\n'))).size === 3;
    if (!distinct) problems.push('세 언어 술식 표현이 서로 같음');
    out.push({
      id: `altar:${ins.id}`,
      label: `${ins.id} (${ins.concept})`,
      pass: problems.length === 0,
      detail: problems.length === 0
        ? `JS→TS ${ins.validUnder.JS.TS ? 'compatible(부분 축복 경로)' : 'wrong(저주 경로)'} · ${ins.jsInTsNote}`
        : problems.join('; '),
    });
  }
  out.push({
    id: 'altar:no-blanket-compat',
    label: 'JS→TS 호환이 술식별로 갈린다 (언어 ID 일괄 호환 아님)',
    pass: compatibleCount > 0 && wrongJsInTs > 0,
    detail: `compatible ${compatibleCount}개, wrong ${wrongJsInTs}개`,
  });
  return out;
}

export type Chk06Report = {
  render: CheckResult[];
  legacyQa: CheckResult[];
  issues: CheckResult[];
  evals: CheckResult[];
  probability: ProbabilityCheck[];
  altar: CheckResult[];
};

export function runChk06Checks(): Chk06Report {
  return {
    render: runRenderChecks(),
    legacyQa: runLegacySampleQaChecks(),
    issues: runIssueChecks(),
    evals: runEvalChecks(),
    probability: runProbabilityChecks(),
    altar: runAltarChecks(),
  };
}

export function summarize(report: Chk06Report): { pass: number; total: number } {
  const all: CheckResult[] = [
    ...report.render,
    ...report.legacyQa,
    ...report.issues,
    ...report.evals,
    ...report.probability,
    ...report.altar,
  ];
  return { pass: all.filter((r) => r.pass).length, total: all.length };
}
