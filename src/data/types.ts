import type { Region } from '../config';

export type TimeOfDay = 'day' | 'night';

export type MobType = 'attack' | 'defense' | 'hp';

export type BuffStat = 'attack' | 'defense' | 'hp';

export type StatRange = {
  min: number;
  max: number;
};

export type MobBaseStats = {
  hp: StatRange;
  attack: StatRange;
  defense: StatRange;
};

export type MobStatBonus = {
  hp?: number;
  attack?: number;
  defense?: number;
};

export type MobRegionVariant = {
  name?: string;
  statBonus?: MobStatBonus;
};

export type Mob = {
  id: string;
  name: string;
  time: TimeOfDay | 'both';
  type: MobType | 'special';
  assetId: string;
  exclusiveItemId: string;
  baseStats?: MobBaseStats;
  regionVariants?: Partial<Record<Region, MobRegionVariant>>;
};

export type Item = {
  id: string;
  name: string;
  assetId: string;
  missionSceneAssetId: string;
  sourceMobId: string;
  reward: BuffStat | 'score';
};

export type ItemEffect =
  | { kind: 'permanent'; stat: BuffStat }
  | { kind: 'temporary'; stat: BuffStat; battles: number }
  | { kind: 'score' };

export type CodeVar =
  | { name: string; type: 'number'; value: number }
  | { name: string; type: 'boolean'; value: boolean }
  | { name: string; type: 'string'; value: string };

export type CodeCompareOp = '>' | '<' | '>=' | '<=' | '==' | '!=';

export type CodeLogicalBinaryOp = '&&' | '||';

export type CodeExpr =
  | { kind: 'var'; name: string }
  | { kind: 'literal'; value: number | boolean | string }
  | { kind: 'compare'; op: CodeCompareOp; left: CodeExpr; right: CodeExpr }
  | {
      kind: 'logical';
      op: CodeLogicalBinaryOp;
      left: CodeExpr;
      right: CodeExpr;
    }
  | { kind: 'not'; operand: CodeExpr };

export type CodeIf = {
  kind: 'if';
  condition: CodeExpr;
  thenComment?: string;
  elseComment?: string;
};

export type CodeSwitchCase = {
  match: string;
  comment?: string;
};

export type CodeSwitch = {
  kind: 'switch';
  subject: string;
  cases: [CodeSwitchCase, CodeSwitchCase];
};

export type NeutralCode = {
  vars: CodeVar[];
  body: CodeIf | CodeSwitch;
};

export type EventOutcome = {
  weight: number;
  text?: string;
  effects?: unknown[];
};

export type EventChoice = {
  label: string;
  code?: NeutralCode;
  showProbability: boolean;
  outcomes: EventOutcome[];
};

export type EventCard = {
  id: string;
  name: string;
  sceneAssetId: string;
  iconAssetIds?: string[];
  passable: boolean;
  branch: boolean;
  situation?: string;
  choices?: EventChoice[];
};

export type MissionKind = 'battle' | 'explore';

export type MissionDifficulty = 'normal' | 'hard';

export type MissionEndings = {
  glad: string;
  calm: string;
  sad: string;
};

export type Mission = {
  id: string;
  kind: MissionKind;
  difficulty: MissionDifficulty;
  targetMobId?: string;
  targetItemId?: string;
  count?: number;
  client?: string;
  dialogue?: string;
  endings?: MissionEndings;
  failText?: string;
};
