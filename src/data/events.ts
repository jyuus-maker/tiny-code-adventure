import type { EventCard } from './types';

export const EVENTS: readonly EventCard[] = [
  {
    id: 'rest-tree',
    name: '나무 아래 휴식',
    sceneAssetId: 'event-herb-tree-128',
    iconAssetIds: ['ui-buff-life-64'],
    passable: true,
    branch: false,
  },
  {
    id: 'suspicious-chest',
    name: '수상한 상자',
    sceneAssetId: 'event-suspicious-chest-128',
    passable: true,
    branch: false,
  },
  {
    id: 'merchant',
    name: '떠돌이 상인',
    sceneAssetId: 'event-merchant-cart-128',
    passable: true,
    branch: false,
  },
  {
    id: 'altar',
    name: '고대 제단',
    sceneAssetId: 'event-altar-scene-128',
    passable: true,
    branch: false,
  },
  {
    id: 'scroll',
    name: '고대 주문서',
    sceneAssetId: 'event-altar-scene-128',
    iconAssetIds: ['ui-scroll-64'],
    passable: true,
    branch: false,
  },
  {
    id: 'rope-bridge',
    name: '출렁다리',
    sceneAssetId: 'event-rope-bridge-128',
    passable: false,
    branch: true,
  },
  {
    id: 'foggy-crossroads',
    name: '안개 낀 갈림길',
    sceneAssetId: 'event-foggy-crossroads-128',
    passable: false,
    branch: true,
  },
];
