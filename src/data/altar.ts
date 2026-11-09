import {
  ALTAR_BLESSING_AMOUNT,
  ALTAR_CURSE_RATIO,
  type CodeLanguage,
} from '../config';
import type { AltarInscription, AltarOutcome, ScrollKind } from './types';

// TEMP: 문구 초안
export const ALTAR_SITUATION_TEXT =
  '제단에 술식 세 개가 새겨져 있다. 이 지역의 술식을 골라야만 축복이 내려진다는 것 같다.';

// TEMP: 문구 초안
export const ALTAR_BLESSING_TEXT = '술식이 빛나며 주문서가 떠올랐다.';

// TEMP: 문구 초안
export const ALTAR_CURSE_TEXT =
  '술식이 검게 물들며 저주의 주문서가 떠올랐다.';

export const ALTAR_INSCRIPTIONS: readonly AltarInscription[] = [
  {
    id: 'sample-word-open',
    snippets: {
      Java: ['String word = "open";'],
      JS: ['let word = "open";'],
      TS: ['let word: string = "open";'],
    },
  },
];

export function resolveAltarChoice(
  chosenLang: CodeLanguage,
  regionLang: CodeLanguage,
  stat: ScrollKind,
  currentStatValue: number,
): AltarOutcome {
  if (chosenLang === regionLang) {
    return {
      kind: 'blessing',
      stat,
      amount: ALTAR_BLESSING_AMOUNT,
    };
  }

  const curseMagnitude = Math.floor(ALTAR_BLESSING_AMOUNT * ALTAR_CURSE_RATIO);
  if (curseMagnitude <= 0) {
    return { kind: 'none' };
  }

  const curseAmount = -curseMagnitude;
  if (currentStatValue + curseAmount < 0) {
    return { kind: 'none' };
  }

  return {
    kind: 'curse',
    stat,
    amount: curseAmount,
  };
}
