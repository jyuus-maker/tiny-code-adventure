import { useMemo } from 'react';
import { REGION_TO_LANGUAGE, type CodeLanguage, type Region } from '../../config';
import { ALTAR_SYNTAX_INSCRIPTIONS } from '../../data/altarSyntax';
import { getCodeQaStats, renderCode, type CodeQaStats } from '../../data/codeRender';
import type { NeutralCodeV2 } from '../../data/codeSyntax';
import {
  buildAltarVerdictTable,
  runChk06Checks,
  summarize,
  type CheckResult,
} from '../chk06Checks';
import { CHK06_ISSUE_CASES, CHK06_SAMPLES } from '../codeChk06Samples';
import { CODE_SAMPLES } from '../codeSamples';

const CODE_LANGUAGES: readonly CodeLanguage[] = ['Java', 'JS', 'TS'] as const;

function isExactLinesMatch(actual: string[], expected: string[]): boolean {
  if (actual.length !== expected.length) {
    return false;
  }
  for (let i = 0; i < actual.length; i++) {
    if (actual[i] !== expected[i]) {
      return false;
    }
  }
  return true;
}

type Props = {
  region: Region;
};

const PRE_STYLE = {
  margin: 0,
  fontSize: '12px',
  lineHeight: '1.45',
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  whiteSpace: 'pre',
  overflowX: 'auto',
  background: '#f1f5f9',
  padding: '8px',
  borderRadius: '4px',
} as const;

const BADGE = (bg: string, color: string) => ({
  padding: '2px 8px',
  borderRadius: '4px',
  background: bg,
  color,
  fontSize: '12px',
});

function QaBadges({ qa }: { qa: CodeQaStats }) {
  return (
    <div style={{ display: 'flex', gap: '8px', fontSize: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
      <span style={BADGE('#e2e8f0', '#334155')}>
        최대 줄 수: <strong>{qa.maxLines}</strong> / 6
      </span>
      <span style={BADGE('#e2e8f0', '#334155')}>
        논리 연산자: <strong>{qa.logicalOpCount}</strong> / 3
      </span>
      <span style={BADGE('#e2e8f0', '#334155')}>
        결과변수: <strong>{qa.resultType ?? '없음'}</strong>
        {qa.resultDefinedOnAllPaths !== null && (
          <> · 모든 경로 대입 {qa.resultDefinedOnAllPaths ? 'O' : 'X'}</>
        )}
      </span>
      <span
        style={{
          ...BADGE(qa.needsReview ? '#fef3c7' : '#dcfce7', qa.needsReview ? '#92400e' : '#166534'),
          fontWeight: 'bold',
        }}
      >
        {qa.needsReview ? '검수 대상' : '검수 대상 아님'}
      </span>
      {qa.hasIssues && (
        <span style={{ ...BADGE('#fee2e2', '#991b1b'), fontWeight: 'bold' }}>
          QA 경고 {qa.issues.length}
        </span>
      )}
    </div>
  );
}

/** 샘플 한 개: 3언어 렌더 결과와 기대 출력 대조 (기존 샘플 A~E와 CHK06 샘플 공용) */
function SampleBlock({
  id,
  title,
  code,
  expected,
  region,
}: {
  id: string;
  title: string;
  code: NeutralCodeV2;
  expected: Record<CodeLanguage, string[]>;
  region: Region;
}) {
  const activeLang = REGION_TO_LANGUAGE[region];
  const qa = getCodeQaStats(code);
  return (
    <div
      style={{
        border: '1px solid #cbd5e1',
        borderRadius: '8px',
        padding: '16px',
        background: '#f8fafc',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <h3 style={{ fontSize: '16px', margin: 0 }}>
          {title} (<code>{id}</code>)
        </h3>
        <QaBadges qa={qa} />
      </div>
      {qa.issues.length > 0 && (
        <ul style={{ margin: '0 0 12px', paddingLeft: '20px', fontSize: '12px', color: '#991b1b' }}>
          {qa.issues.map((i) => (
            <li key={i}>{i}</li>
          ))}
        </ul>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: '12px',
        }}
      >
        {CODE_LANGUAGES.map((lang) => {
          const rendered = renderCode(code, lang);
          const pass = isExactLinesMatch(rendered, expected[lang]);
          const isActive = lang === activeLang;

          return (
            <div
              key={lang}
              style={{
                border: isActive ? '2px solid #2563eb' : '1px solid #cbd5e1',
                borderRadius: '6px',
                background: '#ffffff',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '8px',
                  borderBottom: '1px solid #e2e8f0',
                  paddingBottom: '4px',
                }}
              >
                <strong style={{ fontSize: '13px' }}>
                  {lang}
                  {isActive && (
                    <span
                      style={{
                        marginLeft: '6px',
                        fontSize: '11px',
                        color: '#2563eb',
                        fontWeight: 'normal',
                      }}
                    >
                      (선택 지역 {region})
                    </span>
                  )}
                </strong>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 'bold',
                    color: pass ? '#16a34a' : '#dc2626',
                  }}
                >
                  {pass ? 'PASS' : 'FAIL'} ({rendered.length}줄)
                </span>
              </div>
              <pre style={PRE_STYLE}>{rendered.join('\n')}</pre>
              {!pass && (
                <>
                  <div style={{ fontSize: '11px', color: '#dc2626', margin: '6px 0 2px' }}>기대 출력</div>
                  <pre style={PRE_STYLE}>{expected[lang].join('\n')}</pre>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CheckList({ title, results }: { title: string; results: CheckResult[] }) {
  const pass = results.filter((r) => r.pass).length;
  return (
    <div style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '12px 16px', background: '#ffffff' }}>
      <h3 style={{ fontSize: '15px', margin: '0 0 8px' }}>
        {title}{' '}
        <span style={{ color: pass === results.length ? '#16a34a' : '#dc2626' }}>
          {pass}/{results.length} PASS
        </span>
      </h3>
      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '12px' }}>
        <tbody>
          {results.map((r) => (
            <tr key={r.id}>
              <td style={{ border: '1px solid #e2e8f0', padding: '4px 6px', fontWeight: 'bold', color: r.pass ? '#16a34a' : '#dc2626', whiteSpace: 'nowrap' }}>
                {r.pass ? 'PASS' : 'FAIL'}
              </td>
              <td style={{ border: '1px solid #e2e8f0', padding: '4px 6px', whiteSpace: 'nowrap' }}>{r.label}</td>
              <td style={{ border: '1px solid #e2e8f0', padding: '4px 6px', whiteSpace: 'pre-wrap', fontFamily: 'ui-monospace, Consolas, monospace' }}>{r.detail}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const VERDICT_LABEL = {
  correct: '정답(정상 축복 경로)',
  compatible: '호환(부분 축복 경로)',
  wrong: '오답(저주 경로)',
} as const;

const VERDICT_COLOR = { correct: '#16a34a', compatible: '#d97706', wrong: '#dc2626' } as const;

export function CodeRendererSection({ region }: Props) {
  const report = useMemo(() => runChk06Checks(), []);
  const total = summarize(report);
  const altarRows = useMemo(() => buildAltarVerdictTable(), []);
  const activeLang = REGION_TO_LANGUAGE[region];

  return (
    <section style={{ marginBottom: '32px' }}>
      <h2 style={{ fontSize: '20px', marginBottom: '12px' }}>
        코드 렌더러 (src/data/codeRender.ts — 현재 지역 언어:{' '}
        {REGION_TO_LANGUAGE[region]})
      </h2>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          maxWidth: '960px',
        }}
      >
        <div style={{ fontSize: '14px', padding: '8px 12px', background: total.pass === total.total ? '#dcfce7' : '#fee2e2', borderRadius: '6px' }}>
          <strong>CHK 06 검증 합계: {total.pass} / {total.total} PASS</strong>
          <span style={{ marginLeft: 8, fontSize: 12, color: '#475569' }}>
            (렌더 {report.render.filter((r) => r.pass).length}/{report.render.length} · 기존 샘플 QA{' '}
            {report.legacyQa.filter((r) => r.pass).length}/{report.legacyQa.length} · 경고 검출{' '}
            {report.issues.filter((r) => r.pass).length}/{report.issues.length} · 판정{' '}
            {report.evals.filter((r) => r.pass).length}/{report.evals.length} · 확률{' '}
            {report.probability.filter((r) => r.pass).length}/{report.probability.length} · 술식{' '}
            {report.altar.filter((r) => r.pass).length}/{report.altar.length})
          </span>
        </div>

        <h3 style={{ fontSize: '17px', margin: '8px 0 0' }}>A. 기존 샘플 5종 (보존)</h3>
        {CODE_SAMPLES.map((sample) => (
          <SampleBlock
            key={sample.id}
            id={sample.id}
            title={sample.title}
            code={sample.code}
            expected={sample.expected}
            region={region}
          />
        ))}

        <h3 style={{ fontSize: '17px', margin: '8px 0 0' }}>
          B. CHK 06 문법 샘플 (실제 확률·===·결과변수 타입·형변환·주석·괄호)
        </h3>
        <p style={{ fontSize: '12px', color: '#475569', margin: 0 }}>
          0.3·0.5 등 확률은 문법 검증용 예시이며 운영 성공률이 아니다. 모험 카드에는 주석이 없고,
          배틀 코드(F5)에만 짧은 영어 명중률 주석을 둔다.
        </p>
        {CHK06_SAMPLES.map((sample) => (
          <SampleBlock
            key={sample.id}
            id={sample.id}
            title={sample.title}
            code={sample.code}
            expected={sample.expected}
            region={region}
          />
        ))}

        <h3 style={{ fontSize: '17px', margin: '8px 0 0' }}>C. 정적 분석 경고 검출 (QA 경고는 삭제 조건이 아니다)</h3>
        <p style={{ fontSize: '12px', color: '#475569', margin: 0 }}>
          javac 21 · tsc --strict 실측: else 없는 if(샘플 A·D)와 default 없는 switch(샘플 B)는 선언·분기 자체는 유효하지만,
          결과변수를 뒤에서 사용하면 "초기화되지 않았을 수 있음" 오류가 난다. 게임 규칙(2케이스 전체 포괄)과 컴파일러의
          확정 대입 판정이 다른 지점이며, 처리 방침은 사용자 결정 사항이다(보고서 참조).
        </p>
        <CheckList title="경고 검출 테스트" results={report.issues} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px' }}>
          {CHK06_ISSUE_CASES.map((c) => (
            <div key={c.id} style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '8px 10px', background: '#fff' }}>
              <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: 4 }}>{c.title}</div>
              <pre style={PRE_STYLE}>{renderCode(c.code, activeLang).join('\n')}</pre>
            </div>
          ))}
        </div>
        <CheckList title="기존 샘플 A~E QA 경고 없음 (A의 else 없음 경고만 허용)" results={report.legacyQa} />

        <h3 style={{ fontSize: '17px', margin: '8px 0 0' }}>D. 표시 코드와 판정 데이터 공유 (evaluateCode, eval 없음)</h3>
        <CheckList title="난수 주입 판정 테스트" results={report.evals} />
        <CheckList title="표시 확률 vs 실측 (시드 재현성)" results={report.probability} />

        <h3 style={{ fontSize: '17px', margin: '8px 0 0' }}>E. 고대 제단 술식 문법 유효성 (src/data/altarSyntax.ts — 기존 altar.ts 미변경)</h3>
        <p style={{ fontSize: '12px', color: '#475569', margin: 0 }}>
          validUnder[고른 언어][지역 언어]는 javac 21 · tsc 7(--strict) · node 24로 실제 검사한 결과를 적은 자료다.
          TS 지역에서 JS 술식은 <strong>술식별로</strong> 유효할 때만 부분 축복 경로로 분류한다.
        </p>
        <CheckList title="술식 분류 경계 테스트" results={report.altar} />
        {ALTAR_SYNTAX_INSCRIPTIONS.map((ins) => (
          <div key={ins.id} style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '12px 16px', background: '#f8fafc' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
              <strong style={{ fontSize: 14 }}>
                {ins.title} (<code>{ins.id}</code>)
              </strong>
              <span style={{ fontSize: 12, color: '#475569' }}>{ins.concept}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '12px' }}>
              {CODE_LANGUAGES.map((lang) => (
                <div key={lang} style={{ border: lang === activeLang ? '2px solid #2563eb' : '1px solid #cbd5e1', borderRadius: 6, background: '#fff', padding: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 'bold', marginBottom: 6 }}>
                    {lang}
                    <span style={{ fontWeight: 'normal', color: '#475569', marginLeft: 6 }}>
                      유효: Java {ins.validUnder[lang].Java ? 'O' : 'X'} · JS {ins.validUnder[lang].JS ? 'O' : 'X'} · TS{' '}
                      {ins.validUnder[lang].TS ? 'O' : 'X'}
                    </span>
                  </div>
                  <pre style={PRE_STYLE}>{ins.snippets[lang].join('\n')}</pre>
                </div>
              ))}
            </div>
            <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12, marginTop: 10, background: '#fff' }}>
              <thead>
                <tr style={{ background: '#f1f5f9', textAlign: 'left' }}>
                  <th style={{ border: '1px solid #cbd5e1', padding: 4 }}>지역 언어</th>
                  {CODE_LANGUAGES.map((l) => (
                    <th key={l} style={{ border: '1px solid #cbd5e1', padding: 4 }}>
                      고른 술식: {l}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {altarRows
                  .filter((r) => r.inscriptionId === ins.id)
                  .map((r) => (
                    <tr key={r.regionLang}>
                      <td style={{ border: '1px solid #cbd5e1', padding: 4, fontWeight: 'bold' }}>{r.regionLang}</td>
                      {CODE_LANGUAGES.map((l) => (
                        <td key={l} style={{ border: '1px solid #cbd5e1', padding: 4, color: VERDICT_COLOR[r.verdicts[l]] }}>
                          {VERDICT_LABEL[r.verdicts[l]]}
                        </td>
                      ))}
                    </tr>
                  ))}
              </tbody>
            </table>
            <div style={{ fontSize: 12, color: '#475569', marginTop: 6 }}>JS→TS: {ins.jsInTsNote}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
