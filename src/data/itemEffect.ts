import {
  BROKEN_ITEM_BUFF_BATTLES,
  NORMAL_ITEM_BUFF_BATTLES,
} from '../config';
import type { ItemGrade } from '../render/types';
import type { Item, ItemEffect } from './types';

export function getItemEffect(item: Item, grade: ItemGrade): ItemEffect {
  if (item.reward === 'score') {
    return { kind: 'score' };
  }

  if (grade === 'shining') {
    return { kind: 'permanent', stat: item.reward };
  }

  return {
    kind: 'temporary',
    stat: item.reward,
    battles:
      grade === 'normal' ? NORMAL_ITEM_BUFF_BATTLES : BROKEN_ITEM_BUFF_BATTLES,
  };
}
