import type { ItemGrade } from '../../render/types';
import type { Region } from '../../config';
import type { TimeOfDay } from '../../data/types';
import type { NeutralCodeV2 } from '../../data/codeSyntax';
import type { AltarSyntaxVerdict } from '../../data/altarSyntax';
import type {
  HeroEffectState,
  InstantVitalKind,
  VitalDurationKind,
} from '../effects/types';
import type { CardOutcomeKind } from '../../game/adventure';

/** 이벤트 6종 식별자 (§5-5) */
export type EventType =
  | 'rest-tree'
  | 'suspicious-chest'
  | 'merchant'
  | 'altar'
  | 'rope-bridge'
  | 'foggy-crossroads';

/** 하나의 이벤트 결과에서 적용할 수 있는 개별 효과 */
export type EventEffectPayload =
  | {
      type: 'permanent';
      stat: 'attack' | 'defense' | 'hp';
      value: number;
    }
  | {
      type: 'combat';
      name: string;
      kind: 'atk-buff' | 'def-buff' | 'atk-debuff' | 'def-debuff';
      grade: 'normal' | 'broken';
      value: number;
      duration: number;
    }
  | {
      type: 'vital';
      name: string;
      kind: InstantVitalKind | VitalDurationKind;
      value: number;
      duration?: number;
    };

/** 선택지 정의 */
export type EventChoiceDef = {
  id: string;
  label: string;
  isPass?: boolean;
  /** 고대 제단용 술식 ID */
  inscriptionId?: string;
};

/** 이벤트 인스턴스 데이터 (UI에 노출할 상태) */
export type EventInstanceData = {
  eventId: EventType;
  name: string;
  situation: string;
  assetId: string;
  region: Region;
  timeOfDay: TimeOfDay;
  /** 중립 코드 AST */
  code?: NeutralCodeV2;
  /** 렌더링된 코드 줄 목록 (해당 지역 언어로 렌더링됨) */
  codeLines: string[];
  /** 선택지 목록 */
  choices: EventChoiceDef[];
  /** 제단인 경우 대상 스탯 */
  altarTargetStat?: 'attack' | 'defense' | 'hp';
};

/** 이벤트 선택 판정 결과 */
export type EventResolution = {
  eventId: EventType;
  choiceId: string;
  outcomeKind: CardOutcomeKind;
  /** 결과 헤드라인 및 본문 문구 (§5-5) */
  resultTitle: string;
  resultMessage: string;
  /** 화면에 표시할 효과 요약 (예: ["공격력 +2 (10T)", "HP +200 회복"]) */
  effectDescriptions: string[];
  /** 효과가 적용된 영웅 상태 */
  nextEffects: HeroEffectState;
  /** 연결 전투 정보 (상자 미믹 또는 출렁다리 강제 조우) */
  linkedBattle?: {
    mobId: string;
    isMimic: boolean;
    forced: true;
  };
  /** 미션템 수집 (상자 직접 열기 성공 시 'shining' 확정) */
  missionItemCollected?: {
    quality: ItemGrade;
  };
  /** 제단 판정 결과 (해당 시) */
  altarVerdict?: AltarSyntaxVerdict;
};
