import type { Mission } from './types';

export const MISSIONS: readonly Mission[] = [
  // 배틀 미션 9개
  {
    id: 'battle-apothecary',
    clientId: 'apothecary',
    kind: 'battle',
    targetMobId: 'nightshade-wolf',
    difficulty: 'hard',
    count: 3,
    dialogue:
      '마을에 열병이 돌고 있어요. 늑대 송곳니를 갈아 넣어야 해열제가 완성돼요. 밤에만 나오는 녀석들이라 위험하지만… 3개만요.',
  },
  {
    id: 'battle-blacksmith',
    clientId: 'blacksmith',
    kind: 'battle',
    targetMobId: 'stone-shell-turtle',
    difficulty: 'normal',
    count: 2,
    dialogue:
      '쇠가 똑 떨어졌는데 방패 주문이 밀려 있어. 돌껍질 거북 등껍질이 쇠만큼 단단하다더군. 두 개면 급한 불은 끌 수 있어.',
  },
  {
    id: 'battle-rich-villager',
    clientId: 'rich-villager',
    kind: 'battle',
    targetMobId: 'grass-slime',
    difficulty: 'hard',
    count: 4,
    dialogue:
      '이웃 영주님이 오신다네. 우리 마을 명물 젤리 푸딩으로 탑을 쌓아 보여 드리고 싶어. 탑이라면 적어도 네 개는 있어야겠지?',
  },
  {
    id: 'battle-innkeeper',
    clientId: 'innkeeper',
    kind: 'battle',
    targetMobId: 'golem',
    difficulty: 'normal',
    count: 2,
    dialogue:
      '추수 잔치에 고기를 굽기로 했는데 쇠판이 다 휘어 버렸어. 골렘 몸에서 떨어진 납작한 돌판이 불판으로 그만이라더라고. 두 장만 부탁해.',
  },
  {
    id: 'battle-hunter',
    clientId: 'hunter',
    kind: 'battle',
    targetMobId: 'field-boar',
    difficulty: 'normal',
    count: 2,
    dialogue:
      '새 사냥칼 손잡이를 깎으려는데, 멧돼지 엄니만 한 재료가 없어. 미끄럽지도 않고 단단하거든. 두 개면 충분해.',
  },
  {
    id: 'battle-alchemist',
    clientId: 'alchemist',
    kind: 'battle',
    targetMobId: 'blood-bat-swarm',
    difficulty: 'normal',
    count: 2,
    dialogue:
      '붉은 잉크가 다 떨어졌어요. 핏빛 박쥐 날개를 우려내면 아주 선명한 붉은색이 나오거든요. 밤에만 날아다니니 조심해서… 두 장이면 돼요.',
  },
  {
    id: 'battle-carpenter',
    clientId: 'carpenter',
    kind: 'battle',
    targetMobId: 'wandering-skeleton',
    difficulty: 'hard',
    count: 3,
    dialogue:
      '톱 손잡이 고정핀이 부러졌는데, 해골병사 뼛조각만큼 단단한 게 없더라고. 밤에 떠도는 놈들이라 무섭긴 하지만… 세 개만 구해 주게.',
  },
  {
    id: 'battle-cartographer',
    clientId: 'cartographer',
    kind: 'battle',
    targetMobId: 'mist-fox',
    difficulty: 'normal',
    count: 2,
    dialogue:
      '산길 지도를 그리는데 붓이 너무 굵어서 오솔길이 다 뭉개져요. 안개 여우 꼬리털로 만든 붓이면 머리카락보다 가는 선이 나온대요. 두 묶음만요.',
  },
  {
    id: 'battle-locksmith',
    clientId: 'locksmith',
    kind: 'battle',
    targetMobId: 'mimic',
    difficulty: 'hard',
    count: 1,
    dialogue:
      '상자로 둔갑하는 괴물 얘기 들어 봤나? 그놈 몸에 박힌 금빛 자물쇠는 어떤 열쇠로도 안 열린다더군. 하나만 구해 주면 그 비밀을 파헤쳐 보겠네. 수상한 상자를 보면… 일부러 서툴게 열어 보게.',
  },

  // 탐색 미션 8개
  {
    id: 'explore-apothecary',
    clientId: 'apothecary',
    kind: 'explore',
    targetItemId: 'wolf-fang',
    difficulty: 'hard',
    count: 4,
    dialogue:
      '열병이 번지고 있어요. 늑대 송곳니를 넣은 약재 꾸러미가 수상한 상자에 들어 있다는 소문을 들었어요. 4개만 찾아 주세요.',
  },
  {
    id: 'explore-blacksmith',
    clientId: 'blacksmith',
    kind: 'explore',
    targetItemId: 'shell-shard',
    difficulty: 'normal',
    count: 2,
    dialogue:
      '쇠가 똑 떨어졌어. 길가 수상한 상자에 등껍질 조각이 굴러다닌다더군. 두 개면 돼.',
  },
  {
    id: 'explore-rich-villager',
    clientId: 'rich-villager',
    kind: 'explore',
    targetItemId: 'jelly',
    difficulty: 'hard',
    count: 4,
    dialogue:
      '영주님 오시기 전에 푸딩 탑을 쌓아야 하는데, 수상한 상자에 젤리가 담겨 있다더군. 네 개는 있어야 탑이 서겠지?',
  },
  {
    id: 'explore-innkeeper',
    clientId: 'innkeeper',
    kind: 'explore',
    targetItemId: 'stone-griddle',
    difficulty: 'normal',
    count: 2,
    dialogue:
      '잔치용 불판이 필요해. 수상한 상자 안에 납작한 돌판이 들어 있다는 얘길 들었어. 두 장만 부탁해.',
  },
  {
    id: 'explore-hunter',
    clientId: 'hunter',
    kind: 'explore',
    targetItemId: 'boar-tusk',
    difficulty: 'normal',
    count: 2,
    dialogue:
      '칼 손잡이 재료가 필요해. 누가 수상한 상자에 멧돼지 엄니를 넣어 뒀다더군. 두 개면 충분해.',
  },
  {
    id: 'explore-alchemist',
    clientId: 'alchemist',
    kind: 'explore',
    targetItemId: 'bat-wing',
    difficulty: 'normal',
    count: 2,
    dialogue:
      '잉크 재료가 떨어졌어요. 수상한 상자에 말린 박쥐 날개가 들어 있다고 들었거든요. 두 장이면 돼요.',
  },
  {
    id: 'explore-carpenter',
    clientId: 'carpenter',
    kind: 'explore',
    targetItemId: 'bone-fragment',
    difficulty: 'hard',
    count: 4,
    dialogue:
      '핀 깎을 뼈가 필요하네. 수상한 상자에 뼛조각이 잔뜩 들어 있다는 소문이 있어. 네 개만 구해 주게.',
  },
  {
    id: 'explore-cartographer',
    clientId: 'cartographer',
    kind: 'explore',
    targetItemId: 'fox-tail-fur',
    difficulty: 'hard',
    count: 4,
    dialogue:
      '가는 붓이 필요해요. 수상한 상자 안에 여우 꼬리털 묶음이 있다고 들었어요. 네 묶음만요.',
  },
];
