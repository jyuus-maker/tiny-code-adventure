import type { AdventureState } from '../adventure';
import { TOTAL_PARTICIPATION_CARDS } from '../adventure';

export type RunEndScreenProps = {
  participationCount: number;
  adventure: AdventureState;
};

/**
 * 30장 참여 완료 뒤의 개발 확인용 종료 경계.
 * 엔딩·귀가·점수 제출(run-end 후속 연결 지점)은 구현하지 않았고 엔딩 화면으로 표시하지 않는다.
 */
export function RunEndScreen({ participationCount, adventure }: RunEndScreenProps) {
  return (
    <div className="game-screen">
      <div className="game-ready-banner">
        [개발 확인용 종료 경계] 참여 {participationCount} /{' '}
        {TOTAL_PARTICIPATION_CARDS} 완료. 신규 카드를 추첨하지 않는다. 엔딩·귀가·점수
        제출은 후속 작업(run-end 연결 지점).
      </div>
      <div className="game-panel" style={{ overflow: 'auto', maxHeight: 380 }}>
        <h3>카드 기록 ({adventure.log.length}장 처리)</h3>
        <table className="game-stat-table" style={{ marginTop: 8, fontSize: 13 }}>
          <thead>
            <tr>
              <th>#</th>
              <th>카드</th>
              <th>환경</th>
              <th>결과</th>
              <th style={{ textAlign: 'right' }}>참여</th>
            </tr>
          </thead>
          <tbody>
            {adventure.log.map((e) => (
              <tr key={e.instanceId}>
                <td>{e.instanceId}</td>
                <td>{e.baseId}</td>
                <td>
                  {e.env.day}일차 {e.env.timeOfDay === 'day' ? '낮' : '밤'} ·{' '}
                  {e.env.region}
                </td>
                <td>{e.outcome}</td>
                <td className="game-num">
                  +{e.delta} → {e.participationAfter}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
