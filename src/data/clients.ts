import type { MissionClient } from './types';

export const CLIENTS: readonly MissionClient[] = [
  {
    id: 'apothecary',
    name: '약사',
    itemId: 'wolf-fang',
    sceneAssetId: 'mission-wolf-fang-128',
    endings: {
      glad: '이 정도 품질이면 해열제가 금방 듣겠어요! 마을 사람들이 살았어요.',
      calm: '고마워요, 덕분에 해열제를 만들 수 있겠어요.',
      sad: '음… 쓸 수는 있겠네요. 효과가 좀 늦게 나타나겠지만요.',
    },
    failText: '송곳니가 모자라요… 다른 방법을 찾아봐야겠네요.',
  },
  {
    id: 'blacksmith',
    name: '대장장이',
    itemId: 'shell-shard',
    sceneAssetId: 'mission-shell-shard-128',
    endings: {
      glad: '이 결 좀 봐! 쇠로 만든 것보다 더 튼튼한 방패가 나오겠어.',
      calm: '좋아, 이거면 주문 넣은 사람들한테 체면은 서겠어.',
      sad: '금이 좀 갔네… 덧대서 써 보지. 그래도 고맙다.',
    },
    failText: '모자라군. 이번 주문은 사과부터 해야겠어.',
  },
  {
    id: 'rich-villager',
    name: '마을 부자',
    itemId: 'jelly',
    sceneAssetId: 'mission-jelly-128',
    endings: {
      glad: '탱글탱글하구먼! 이 푸딩 탑이면 영주님도 입이 떡 벌어지시겠어.',
      calm: '그래, 이 정도면 탑은 세울 수 있겠어. 수고했네.',
      sad: '흐물흐물하군… 탑이 좀 기울겠지만, 없는 것보단 낫지.',
    },
    failText: '탑을 쌓기엔 턱없이 모자라네. 이번 잔치는 조촐하게 해야겠어.',
  },
  {
    id: 'innkeeper',
    name: '주막 주인',
    itemId: 'stone-griddle',
    sceneAssetId: 'mission-stone-griddle-128',
    endings: {
      glad: '매끈하고 평평하네! 고기가 아주 골고루 익겠어.',
      calm: '딱 쓸 만하네. 오늘 잔치는 걱정 없겠어.',
      sad: '좀 울퉁불퉁하군… 고기가 한쪽만 타겠지만 써 볼게.',
    },
    failText: '한 장으론 모자라. 잔치 손님들 줄 서게 생겼네.',
  },
  {
    id: 'hunter',
    name: '사냥꾼',
    itemId: 'boar-tusk',
    sceneAssetId: 'mission-boar-tusk-128',
    endings: {
      glad: '이건 상등품이군. 손에 착 감기는 손잡이가 나오겠어.',
      calm: '괜찮아, 이 정도면 칼 손잡이로 손색없어.',
      sad: '갈라진 데가 있네… 천으로 감아서 써야겠어.',
    },
    failText: '엄니가 모자라. 당분간은 낡은 칼로 버텨야겠군.',
  },
  {
    id: 'alchemist',
    name: '연금술사',
    itemId: 'bat-wing',
    sceneAssetId: 'mission-bat-wing-128',
    endings: {
      glad: '빛깔이 살아 있네요! 이 잉크로 쓴 글씨는 백 년이 가도 안 바래겠어요.',
      calm: '고마워요, 이 정도면 잉크 한 병은 넉넉히 만들겠어요.',
      sad: '색이 좀 탁하네요… 그래도 장부 정도는 쓸 수 있겠어요.',
    },
    failText: '날개가 모자라요… 당분간은 검은 잉크로 버텨야겠네요.',
  },
  {
    id: 'carpenter',
    name: '목수',
    itemId: 'bone-fragment',
    sceneAssetId: 'mission-bone-fragment-128',
    endings: {
      glad: '단단하고 곧군! 이걸로 핀을 깎으면 평생 쓰겠어.',
      calm: '좋아, 핀 세 개는 넉넉히 나오겠어. 고맙네.',
      sad: '좀 푸석하네… 금방 갈아 끼워야겠지만 우선은 쓰지.',
    },
    failText: '뼈가 모자라. 공방 문을 며칠 닫아야겠군.',
  },
  {
    id: 'cartographer',
    name: '지도 제작자',
    itemId: 'fox-tail-fur',
    sceneAssetId: 'mission-fox-tail-fur-128',
    endings: {
      glad: '털이 결 따라 곱게 모이네요! 이 붓이면 개울 하나까지 그릴 수 있겠어요.',
      calm: '좋아요, 이 정도면 쓸 만한 붓이 되겠어요.',
      sad: '털이 좀 엉켰네요… 선이 가끔 번지겠지만 써 볼게요.',
    },
    failText: '털이 모자라요… 이번 지도는 큰길만 그려야겠네요.',
  },
  {
    id: 'locksmith',
    name: '자물쇠공',
    itemId: 'mimic-lock',
    sceneAssetId: 'mission-mimic-lock-128',
    endings: {
      glad: '이 정교함이라니! 평생 연구해도 모자라겠어.',
      calm: '좋아, 이 정도면 구조는 뜯어볼 수 있겠어.',
      sad: '찌그러졌군… 그래도 원리는 알 수 있겠지.',
    },
    failText: '결국 못 구했나. 그 괴물은 전설로 남겨 둬야겠군.',
  },
];
