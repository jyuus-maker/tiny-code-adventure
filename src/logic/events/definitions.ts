import type { NeutralCodeV2 } from '../../data/codeSyntax';
import type { EventType } from './types';

/** 6종 이벤트 정적 메타데이터 (§5-5) */
export const EVENT_METADATA: Record<
  EventType,
  {
    name: string;
    situation: string;
    assetId: string;
    passable: boolean;
    branch: boolean;
  }
> = {
  'rest-tree': {
    name: '나무 아래 휴식',
    situation: '잠시 쉬어 가기 좋은 나무가 보인다.',
    assetId: 'event-herb-tree-128',
    passable: true,
    branch: false,
  },
  'suspicious-chest': {
    name: '수상한 상자',
    situation: '길가에 수상한 상자가 놓여 있다.',
    assetId: 'event-suspicious-chest-128',
    passable: true,
    branch: false,
  },
  'merchant': {
    name: '떠돌이 상인',
    situation: '길목에서 짐수레를 끈 상인을 만났다.',
    assetId: 'event-merchant-cart-128',
    passable: true,
    branch: false,
  },
  'altar': {
    name: '고대 제단',
    situation: '고대 제단에 신비한 술식이 새겨져 있다.',
    assetId: 'event-altar-scene-128',
    passable: true,
    branch: false,
  },
  'rope-bridge': {
    name: '출렁다리',
    situation: '깊은 협곡 위에 위태로운 출렁다리가 걸려 있다.',
    assetId: 'event-rope-bridge-128',
    passable: false,
    branch: true,
  },
  'foggy-crossroads': {
    name: '안개 낀 갈림길',
    situation: '짙은 안개 속에 두 갈래 길이 나타났다.',
    assetId: 'event-foggy-crossroads-128',
    passable: false,
    branch: true,
  },
};

/** 휴식 이벤트 코드 생성 (CHK06 Math.random 문법) */
export function buildRestTreeCode(currentHp: number): NeutralCodeV2 {
  return {
    vars: [
      { name: 'heroHp', type: 'number', value: currentHp },
      { name: 'restSuccessRate', type: 'number', value: 0.6 }, // // TEMP: 승인된 휴식 성공률 가안 60%
    ],
    body: {
      kind: 'if',
      condition: {
        kind: 'compare',
        op: '<',
        left: { kind: 'random' },
        right: { kind: 'var', name: 'restSuccessRate' },
      },
      thenRate: 100, // 성공 경로
      elseRate: 0, // 실패(피로) 경로
    },
    resultVar: 'restResult',
    resultType: 'int',
    cardKind: 'adventure',
  };
}

/** 수상한 상자 코드 생성 */
export function buildSuspiciousChestCode(): NeutralCodeV2 {
  return {
    vars: [
      { name: 'openRate', type: 'number', value: 0.4 }, // // TEMP: 상자 직접 열기 성공률 가안 40%
    ],
    body: {
      kind: 'if',
      condition: {
        kind: 'compare',
        op: '<',
        left: { kind: 'random' },
        right: { kind: 'var', name: 'openRate' },
      },
      thenRate: 100, // 직접 열기 성공 (빛나는 미션템 확정)
      elseRate: 0, // 실패 (미믹 강제 전투 연동)
    },
    resultVar: 'chestResult',
    resultType: 'int',
    cardKind: 'adventure',
  };
}

/** 떠돌이 상인 코드 생성 */
export function buildMerchantCode(dealStat: 'ATTACK' | 'DEFENSE'): NeutralCodeV2 {
  return {
    vars: [
      { name: 'trustRate', type: 'number', value: 0.5 }, // // TEMP: 성공/사기 50:50 가안
      { name: 'dealCategory', type: 'string', value: dealStat },
    ],
    body: {
      kind: 'if',
      condition: {
        kind: 'compare',
        op: '<',
        left: { kind: 'random' },
        right: { kind: 'var', name: 'trustRate' },
      },
      thenRate: 100, // 거래 성공 (공방 + 피 버프 동시)
      elseRate: 0, // 사기 (공방 + 피 디버프 동시)
    },
    resultVar: 'tradeSuccess',
    resultType: 'int',
    cardKind: 'adventure',
  };
}

/** 출렁다리 코드 생성 */
export function buildRopeBridgeCode(): NeutralCodeV2 {
  return {
    vars: [
      { name: 'crossRate', type: 'number', value: 0.5 }, // // TEMP: 돌파 성공률 50% 가안
    ],
    body: {
      kind: 'if',
      condition: {
        kind: 'compare',
        op: '<',
        left: { kind: 'random' },
        right: { kind: 'var', name: 'crossRate' },
      },
      thenRate: 100, // 돌파 성공 (용기/단련 버프)
      elseRate: 0, // 돌파 실패 (공포/부상 디버프)
    },
    resultVar: 'bridgeResult',
    resultType: 'int',
    cardKind: 'adventure',
  };
}

/** 안개 낀 갈림길 코드 생성 */
export function buildFoggyCrossroadsCode(leftWay: 'COMBAT' | 'VITAL', rightWay: 'COMBAT' | 'VITAL'): NeutralCodeV2 {
  return {
    vars: [
      { name: 'leftWay', type: 'string', value: leftWay },
      { name: 'rightWay', type: 'string', value: rightWay },
    ],
    body: {
      kind: 'if',
      condition: {
        kind: 'compare',
        op: '==',
        left: { kind: 'var', name: 'leftWay' },
        right: { kind: 'literal', value: 'COMBAT' },
      },
      thenRate: 1,
      elseRate: 2,
    },
    resultVar: 'chosenWay',
    resultType: 'int',
    cardKind: 'adventure',
  };
}
