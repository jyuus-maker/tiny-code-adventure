import { PixelSprite } from '../../render/PixelSprite';
import type { MissionContext } from '../gameState';

const MISSION_SCENE_SCALE = 2;

const KIND_LABEL = { battle: '배틀', explore: '탐색' } as const;
const DIFFICULTY_LABEL = { normal: '노멀', hard: '하드' } as const;

export type MissionScreenProps = {
  context: MissionContext;
  onDepart: () => void;
};

export function MissionScreen({ context, onDepart }: MissionScreenProps) {
  const { mission, client, item } = context;

  return (
    <div className="game-screen">
      <div className="game-screen-header">
        <h2>의뢰</h2>
        <span className="game-screen-note">
          {KIND_LABEL[mission.kind]} · {DIFFICULTY_LABEL[mission.difficulty]}
        </span>
      </div>

      <div className="game-row">
        <div className="game-sprite-box">
          <PixelSprite id={client.sceneAssetId} scale={MISSION_SCENE_SCALE} />
        </div>
        <div className="game-panel" style={{ flex: 1 }}>
          <h3>{client.name}</h3>
          <p style={{ marginTop: 8 }}>{mission.dialogue}</p>
          <p className="game-screen-note" style={{ marginTop: 12 }}>
            의뢰품: {item.name} × {mission.count}
          </p>
        </div>
      </div>

      <div className="game-screen-footer">
        <button type="button" className="game-button-primary" onClick={onDepart}>
          출발
        </button>
      </div>
    </div>
  );
}
