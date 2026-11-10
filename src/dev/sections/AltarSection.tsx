import { REGION_TO_LANGUAGE, type CodeLanguage, type Region } from '../../config';
import {
  ALTAR_BLESSING_TEXT,
  ALTAR_CURSE_TEXT,
  ALTAR_INSCRIPTIONS,
  ALTAR_SITUATION_TEXT,
  resolveAltarChoice,
} from '../../data/altar';
import type { AltarOutcome } from '../../data/types';

const CODE_LANGUAGES: readonly CodeLanguage[] = ['Java', 'JS', 'TS'] as const;

function formatAltarOutcome(outcome: AltarOutcome): string {
  if (outcome.kind === 'blessing') {
    return `축복 +${outcome.amount}`;
  }
  if (outcome.kind === 'curse') {
    return `저주 −${Math.abs(outcome.amount)}`;
  }
  return 'none';
}

type Props = {
  region: Region;
};

export function AltarSection({ region }: Props) {
  return (
    <section style={{ marginBottom: '32px' }}>
      <h2 style={{ fontSize: '20px', marginBottom: '12px' }}>
        고대 제단 (src/data/altar.ts — 현재 선택 지역: {region})
      </h2>
      <div
        style={{
          border: '1px solid #cbd5e1',
          borderRadius: '8px',
          padding: '16px',
          background: '#f8fafc',
          maxWidth: '960px',
        }}
      >
        <div style={{ fontSize: '14px', marginBottom: '12px' }}>
          <div>
            <strong>지문:</strong> {ALTAR_SITUATION_TEXT}
          </div>
          <div>
            <strong>축복 문구:</strong> {ALTAR_BLESSING_TEXT} /{' '}
            <strong>저주 문구:</strong> {ALTAR_CURSE_TEXT}
          </div>
        </div>

        {ALTAR_INSCRIPTIONS.map((inscription) => {
          const activeLang = REGION_TO_LANGUAGE[region];
          return (
            <div key={inscription.id} style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '16px', margin: '0 0 8px 0' }}>
                샘플 술식 3개 (<code>{inscription.id}</code> — 언어 이름 미표시)
              </h3>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                  gap: '12px',
                }}
              >
                {CODE_LANGUAGES.map((lang, idx) => {
                  const snippets = inscription.snippets[lang];
                  const isCorrect = lang === activeLang;
                  return (
                    <div
                      key={lang}
                      style={{
                        border: isCorrect
                          ? '2px solid #16a34a'
                          : '1px solid #cbd5e1',
                        borderRadius: '6px',
                        background: '#ffffff',
                        padding: '12px',
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
                          술식 #{idx + 1}
                        </strong>
                        {isCorrect && (
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 'bold',
                              color: '#16a34a',
                              background: '#dcfce7',
                              padding: '2px 6px',
                              borderRadius: '4px',
                            }}
                          >
                            현재 지역({region}) 정답 술식
                          </span>
                        )}
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
                        {snippets.join('\n')}
                      </pre>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        <div style={{ marginTop: '16px' }}>
          <h3 style={{ fontSize: '15px', marginBottom: '8px' }}>
            판정 표 (지역 3 × 고른 언어 3 = 9칸, currentStatValue = 5)
          </h3>
          <table
            style={{
              borderCollapse: 'collapse',
              width: '100%',
              fontSize: '13px',
              background: '#ffffff',
            }}
          >
            <thead>
              <tr style={{ background: '#f1f5f9', textAlign: 'left' }}>
                <th style={{ border: '1px solid #cbd5e1', padding: '6px' }}>
                  지역 (지역 언어)
                </th>
                <th style={{ border: '1px solid #cbd5e1', padding: '6px' }}>
                  고른 언어: Java
                </th>
                <th style={{ border: '1px solid #cbd5e1', padding: '6px' }}>
                  고른 언어: JS
                </th>
                <th style={{ border: '1px solid #cbd5e1', padding: '6px' }}>
                  고른 언어: TS
                </th>
              </tr>
            </thead>
            <tbody>
              {(['warm', 'desert', 'cold'] as const).map((r) => {
                const regLang = REGION_TO_LANGUAGE[r];
                return (
                  <tr key={r}>
                    <td
                      style={{
                        border: '1px solid #cbd5e1',
                        padding: '6px',
                        fontWeight: 'bold',
                      }}
                    >
                      {r} ({regLang})
                    </td>
                    {CODE_LANGUAGES.map((chosen) => {
                      const res = resolveAltarChoice(
                        chosen,
                        regLang,
                        'attack',
                        5,
                      );
                      const isBlessing = res.kind === 'blessing';
                      return (
                        <td
                          key={chosen}
                          style={{
                            border: '1px solid #cbd5e1',
                            padding: '6px',
                            color: isBlessing ? '#16a34a' : '#dc2626',
                            fontWeight: isBlessing ? 'bold' : 'normal',
                          }}
                        >
                          {formatAltarOutcome(res)}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {(() => {
          const zeroCurseOutcome = resolveAltarChoice(
            'Java',
            'TS',
            'attack',
            0,
          );
          const zeroCursePass = zeroCurseOutcome.kind === 'none';
          return (
            <div
              style={{
                marginTop: '12px',
                fontSize: '13px',
                display: 'flex',
                gap: '8px',
                alignItems: 'center',
              }}
            >
              <strong>
                하한 확인 (currentStatValue = 0에서 저주를 고른 경우):
              </strong>
              <code>{formatAltarOutcome(zeroCurseOutcome)}</code>
              <span
                style={{
                  fontWeight: 'bold',
                  color: zeroCursePass ? '#16a34a' : '#dc2626',
                }}
              >
                {zeroCursePass ? 'PASS' : 'FAIL'}
              </span>
            </div>
          );
        })()}
      </div>
    </section>
  );
}
