import { REGION_TO_LANGUAGE, type CodeLanguage, type Region } from '../../config';
import { getCodeQaStats, renderCode } from '../../data/codeRender';
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

export function CodeRendererSection({ region }: Props) {
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
        {CODE_SAMPLES.map((sample) => {
          const activeLang = REGION_TO_LANGUAGE[region];
          const qaStats = getCodeQaStats(sample.code);
          return (
            <div
              key={sample.id}
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
                  {sample.title} (<code>{sample.id}</code>)
                </h3>
                <div
                  style={{
                    display: 'flex',
                    gap: '8px',
                    fontSize: '12px',
                    alignItems: 'center',
                  }}
                >
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: '#e2e8f0',
                      color: '#334155',
                    }}
                  >
                    최대 줄 수: <strong>{qaStats.maxLines}</strong> / 6
                  </span>
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: '#e2e8f0',
                      color: '#334155',
                    }}
                  >
                    논리 연산자: <strong>{qaStats.logicalOpCount}</strong> / 3
                  </span>
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontWeight: 'bold',
                      background: qaStats.needsReview ? '#fef3c7' : '#dcfce7',
                      color: qaStats.needsReview ? '#92400e' : '#166534',
                    }}
                  >
                    {qaStats.needsReview ? '검수 대상' : '검수 대상 아님'}
                  </span>
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                  gap: '12px',
                }}
              >
                {CODE_LANGUAGES.map((lang) => {
                  const rendered = renderCode(sample.code, lang);
                  const expected = sample.expected[lang];
                  const pass = isExactLinesMatch(rendered, expected);
                  const isActive = lang === activeLang;

                  return (
                    <div
                      key={lang}
                      style={{
                        border: isActive
                          ? '2px solid #2563eb'
                          : '1px solid #cbd5e1',
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
                      <pre
                        style={{
                          margin: 0,
                          fontSize: '12px',
                          lineHeight: '1.45',
                          fontFamily:
                            'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                          whiteSpace: 'pre',
                          overflowX: 'auto',
                          background: '#f1f5f9',
                          padding: '8px',
                          borderRadius: '4px',
                        }}
                      >
                        {rendered.join('\n')}
                      </pre>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
