import { REGION_TO_LANGUAGE, type CodeLanguage, type Region } from '../../config';
import type { TimeOfDay } from '../../data/types';
import { renderCode } from '../../data/codeRender';
import { evaluateCode, type NeutralCodeV2 } from '../../data/codeSyntax';
import {
  ALTAR_SYNTAX_INSCRIPTIONS,
  classifyInscriptionChoice,
} from '../../data/altarSyntax';
import type { HeroEffectState } from '../effects/types';
import type { Rng } from '../rng';
import {
  EVENT_METADATA,
  buildFoggyCrossroadsCode,
  buildMerchantCode,
  buildRestTreeCode,
  buildRopeBridgeCode,
  buildSuspiciousChestCode,
} from './definitions';
import { applyEventEffects } from './effectsApplier';
import type {
  EventChoiceDef,
  EventEffectPayload,
  EventInstanceData,
  EventResolution,
  EventType,
} from './types';

/** 지역별 기본 몬스터 ID 매핑 (출렁다리 우회 시 강제 조우용) */
const REGION_DEFAULT_MOBS: Record<Region, { day: string; night: string }> = {
  warm: { day: 'stone-shell-turtle', night: 'nightshade-wolf' },
  desert: { day: 'golem', night: 'wandering-skeleton' },
  cold: { day: 'field-boar', night: 'mist-fox' },
};

/** 이벤트 인스턴스 데이터 생성 (화면 진입 시 호출) */
export function createEventInstance(
  eventId: EventType,
  region: Region,
  timeOfDay: TimeOfDay,
  heroEffects: HeroEffectState | null,
  rng: Rng = Math.random,
): EventInstanceData {
  const meta = EVENT_METADATA[eventId] ?? {
    name: '모험의 사건',
    situation: '길 위에서 사건이 발생했다.',
    assetId: 'event-herb-tree-128',
    passable: true,
    branch: false,
  };

  const currentHp = heroEffects ? heroEffects.currentHp : 1000;
  const lang = REGION_TO_LANGUAGE[region];

  let code: NeutralCodeV2 | undefined;
  let codeLines: string[] = [];
  const choices: EventChoiceDef[] = [];
  let altarTargetStat: 'attack' | 'defense' | 'hp' | undefined;

  switch (eventId) {
    case 'rest-tree': {
      code = buildRestTreeCode(currentHp);
      codeLines = renderCode(code, lang);
      choices.push({ id: 'rest', label: '쉬어 간다' });
      choices.push({ id: 'pass', label: '지나간다', isPass: true });
      break;
    }

    case 'suspicious-chest': {
      code = buildSuspiciousChestCode();
      codeLines = renderCode(code, lang);
      choices.push({ id: 'open', label: '열어 본다' });
      choices.push({ id: 'pass', label: '지나간다', isPass: true });
      break;
    }

    case 'merchant': {
      const dealStat = rng() < 0.5 ? 'ATTACK' : 'DEFENSE';
      code = buildMerchantCode(dealStat);
      codeLines = renderCode(code, lang);
      choices.push({ id: 'trade', label: '거래한다' });
      choices.push({ id: 'pass', label: '지나간다', isPass: true });
      break;
    }

    case 'altar': {
      // 제단 대상 스탯 무작위 선정 (§4-8)
      const stats: ('attack' | 'defense' | 'hp')[] = ['attack', 'defense', 'hp'];
      altarTargetStat = stats[Math.floor(rng() * stats.length)];

      // 6개 술식 중 1개 무작위 선정
      const inscriptionIndex = Math.floor(rng() * ALTAR_SYNTAX_INSCRIPTIONS.length);
      const inscription = ALTAR_SYNTAX_INSCRIPTIONS[inscriptionIndex];

      // 3개 언어 술식 보기를 무작위 셔플하여 선택지로 제시
      const langOptions: CodeLanguage[] = ['Java', 'JS', 'TS'];
      const shuffledLangs = [...langOptions].sort(() => rng() - 0.5);

      codeLines = [
        `// 고대 제단 — [${altarTargetStat === 'attack' ? '공격' : altarTargetStat === 'defense' ? '수호' : '생명'}의 제단]`,
        `// 의도된 언어의 술식을 골라 축복을 받으세요. (지역 언어: ${lang})`,
        '',
        ...shuffledLangs.flatMap((l, idx) => [
          `[술식 ${idx + 1}]`,
          ...inscription.snippets[l].map((line) => `  ${line}`),
          '',
        ]),
      ];

      shuffledLangs.forEach((l, idx) => {
        choices.push({
          id: `altar-${l}`,
          label: `술식 ${idx + 1}`,
          inscriptionId: inscription.id,
        });
      });
      choices.push({ id: 'pass', label: '지나간다', isPass: true });
      break;
    }

    case 'rope-bridge': {
      code = buildRopeBridgeCode();
      codeLines = renderCode(code, lang);
      choices.push({ id: 'cross', label: '돌파한다' });
      choices.push({ id: 'pass', label: '지나간다', isPass: true });
      break;
    }

    case 'foggy-crossroads': {
      const isLeftCombat = rng() < 0.5;
      const leftWay = isLeftCombat ? 'COMBAT' : 'VITAL';
      const rightWay = isLeftCombat ? 'VITAL' : 'COMBAT';
      code = buildFoggyCrossroadsCode(leftWay, rightWay);
      codeLines = renderCode(code, lang);
      choices.push({ id: 'left', label: '왼쪽 길' });
      choices.push({ id: 'right', label: '오른쪽 길' });
      break;
    }
  }

  return {
    eventId,
    name: meta.name,
    situation: meta.situation,
    assetId: meta.assetId,
    region,
    timeOfDay,
    code,
    codeLines,
    choices,
    altarTargetStat,
  };
}

/** 이벤트 선택 판정 실행 (§5-5) */
export function resolveEventChoice(
  instance: EventInstanceData,
  choiceId: string,
  heroEffects: HeroEffectState,
  rng: Rng = Math.random,
): EventResolution {
  const { eventId, region, timeOfDay, code } = instance;
  const choice = instance.choices.find((c) => c.id === choiceId);
  const isPass = choice?.isPass ?? choiceId === 'pass';

  // 1. 지나가기(패스) 처리
  if (isPass) {
    if (eventId === 'rope-bridge') {
      // 출렁다리 지나가기: 40% 확률로 돌아가는 길에 강제 전투 조우 (§4-8)
      const encounterMob = rng() < 0.4;
      if (encounterMob) {
        const defaultMob =
          timeOfDay === 'night'
            ? REGION_DEFAULT_MOBS[region].night
            : REGION_DEFAULT_MOBS[region].day;
        return {
          eventId,
          choiceId,
          outcomeKind: 'pass-forced-battle',
          resultTitle: '지나간 뒤 전투',
          resultMessage: '돌아가는 길에 몬스터를 마주쳤다!',
          effectDescriptions: [],
          nextEffects: heroEffects,
          linkedBattle: {
            mobId: defaultMob,
            isMimic: false,
            forced: true,
          },
        };
      }
      return {
        eventId,
        choiceId,
        outcomeKind: 'pass',
        resultTitle: '우회 통과',
        resultMessage: '협곡을 조심스럽게 우회하여 지나갔다.',
        effectDescriptions: [],
        nextEffects: heroEffects,
      };
    }

    return {
      eventId,
      choiceId,
      outcomeKind: 'pass',
      resultTitle: '지나가기',
      resultMessage: '사건에 개입하지 않고 지나쳤다.',
      effectDescriptions: [],
      nextEffects: heroEffects,
    };
  }

  // 2. 이벤트별 참여 판정
  const payloads: EventEffectPayload[] = [];
  let resultTitle = '';
  let resultMessage = '';
  let linkedBattle: EventResolution['linkedBattle'];
  let missionItemCollected: EventResolution['missionItemCollected'];
  let altarVerdict: EventResolution['altarVerdict'];

  switch (eventId) {
    case 'rest-tree': {
      const evalRes = code ? evaluateCode(code, rng) : { path: 'then' };
      if (evalRes.path === 'then') {
        resultTitle = '휴식 성공';
        // 약초 효과 1종 랜덤 선택 (§4-8)
        const herbType = Math.floor(rng() * 3);
        if (herbType === 0) {
          payloads.push({
            type: 'vital',
            name: '신선한 약초',
            kind: 'instant-heal',
            value: 200, // // TEMP
          });
          resultMessage = '나무 그늘 아래서 약초를 발견했다.';
        } else if (herbType === 1) {
          payloads.push({
            type: 'vital',
            name: '재생의 약초',
            kind: 'dot-heal',
            value: 40, // // TEMP
            duration: 15,
          });
          resultMessage = '나무 그늘에서 은은한 약초 향기를 맡았다.';
        } else {
          payloads.push({
            type: 'vital',
            name: '활력의 약초',
            kind: 'temp-max-hp-up',
            value: 150, // // TEMP
            duration: 15,
          });
          resultMessage = '약초 잎을 씹자 기운이 솟구친다.';
        }
      } else {
        resultTitle = '휴식 실패';
        resultMessage = '서늘한 바람에 잠을 설쳐 피로가 몰려온다.';
        payloads.push({
          type: 'vital',
          name: '피로',
          kind: 'instant-damage',
          value: 100, // // TEMP
        });
      }
      break;
    }

    case 'suspicious-chest': {
      const evalRes = code ? evaluateCode(code, rng) : { path: 'then' };
      if (evalRes.path === 'then') {
        resultTitle = '상자 열기 성공';
        resultMessage = '상자를 열었다! 안에서 반짝이는 의뢰품을 발견했다!';
        // 상자 직접 열기 성공 시 현재 의뢰의 빛나는 미션템 확정 지급 (§4-8, §12-3)
        missionItemCollected = { quality: 'shining' };
      } else {
        resultTitle = '상자 실패';
        resultMessage = '상자가 갑자기 움직이기 시작한다! 몬스터 미믹이 나타났다!';
        // 미믹 강제 전투 연동
        linkedBattle = {
          mobId: 'mimic',
          isMimic: true,
          forced: true,
        };
        return {
          eventId,
          choiceId,
          outcomeKind: 'participate-linked-battle',
          resultTitle,
          resultMessage,
          effectDescriptions: [],
          nextEffects: heroEffects,
          linkedBattle,
        };
      }
      break;
    }

    case 'merchant': {
      const evalRes = code ? evaluateCode(code, rng) : { path: 'then' };
      const dealVar = code?.vars.find((v) => v.name === 'dealCategory');
      const isAttackDeal = dealVar && 'value' in dealVar ? dealVar.value === 'ATTACK' : false;

      if (evalRes.path === 'then') {
        resultTitle = '거래 성공';
        resultMessage = '제법 괜찮은 거래였다. 몸이 한결 든든해졌다.';
        // 공방 버프 + 피 버프 동시 부여 (§4-8)
        payloads.push({
          type: 'combat',
          name: isAttackDeal ? '예리한 칼날' : '단단한 가죽',
          kind: isAttackDeal ? 'atk-buff' : 'def-buff',
          grade: 'normal',
          value: 2, // // TEMP: +2
          duration: 15,
        });
        payloads.push({
          type: 'vital',
          name: '상인의 비약',
          kind: 'instant-heal',
          value: 200, // // TEMP
        });
      } else {
        resultTitle = '사기 피해';
        resultMessage = '이런, 사기를 당했다! 물건에 독이 묻어 있었다!';
        // 공방 디버프 + 피 디버프 동시 부여 (§4-8)
        payloads.push({
          type: 'combat',
          name: isAttackDeal ? '무뎌진 칼날' : '찢어진 가죽',
          kind: isAttackDeal ? 'atk-debuff' : 'def-debuff',
          grade: 'broken',
          value: -1, // // TEMP: -1
          duration: 10,
        });
        payloads.push({
          type: 'vital',
          name: '불량 물약',
          kind: 'instant-damage',
          value: 100, // // TEMP
        });
      }
      break;
    }

    case 'altar': {
      const chosenLang = choiceId.replace('altar-', '') as CodeLanguage;
      const regionLang = REGION_TO_LANGUAGE[region];
      const inscriptionId = choice?.inscriptionId ?? 'altar-declare-string';
      const inscription =
        ALTAR_SYNTAX_INSCRIPTIONS.find((i) => i.id === inscriptionId) ??
        ALTAR_SYNTAX_INSCRIPTIONS[0];

      const verdict = classifyInscriptionChoice(inscription, chosenLang, regionLang);
      altarVerdict = verdict;

      const stat = instance.altarTargetStat ?? 'attack';
      const statLabel = stat === 'attack' ? '공격' : stat === 'defense' ? '수호' : '생명';

      if (verdict === 'correct') {
        resultTitle = '정상 축복';
        resultMessage = `술식이 밝게 빛난다. ${statLabel}의 축복이 내려왔다.`;
        // 영구 +2 (생명: +200) + 강 임시 버프 동시 적용 (§4-8)
        if (stat === 'attack' || stat === 'defense') {
          payloads.push({
            type: 'permanent',
            stat,
            value: 2,
          });
          payloads.push({
            type: 'combat',
            name: `${statLabel}의 축복`,
            kind: stat === 'attack' ? 'atk-buff' : 'def-buff',
            grade: 'normal',
            value: 4, // 일반 이벤트 2배 (4)
            duration: 20,
          });
        } else {
          payloads.push({
            type: 'permanent',
            stat: 'hp',
            value: 200,
          });
          payloads.push({
            type: 'vital',
            name: '생명의 축복',
            kind: 'dot-heal',
            value: 25,
            duration: 20,
          });
        }
      } else if (verdict === 'compatible') {
        resultTitle = '부분 축복';
        resultMessage = `술식이 희미하게 빛난다. ${statLabel}의 축복이 내려왔다.`;
        // 영구 효과 없음, 임시 효과만 50% (약 효과) (§4-8)
        if (stat === 'attack' || stat === 'defense') {
          payloads.push({
            type: 'combat',
            name: `${statLabel}의 희미한 축복`,
            kind: stat === 'attack' ? 'atk-buff' : 'def-buff',
            grade: 'broken',
            value: 2,
            duration: 10,
          });
        } else {
          payloads.push({
            type: 'vital',
            name: '생명의 기운',
            kind: 'instant-heal',
            value: 150,
          });
        }
      } else {
        resultTitle = '제단 저주';
        resultMessage = `술식이 검게 물든다. ${statLabel}의 저주에 당했다!`;
        // 영구 감소 (-1.5 또는 -1) + 임시 디버프 (§4-8)
        if (stat === 'attack' || stat === 'defense') {
          payloads.push({
            type: 'permanent',
            stat,
            value: -1.5,
          });
          payloads.push({
            type: 'combat',
            name: `${statLabel}의 저주`,
            kind: stat === 'attack' ? 'atk-debuff' : 'def-debuff',
            grade: 'broken',
            value: -1,
            duration: 10,
          });
        } else {
          payloads.push({
            type: 'permanent',
            stat: 'hp',
            value: -100,
          });
          payloads.push({
            type: 'vital',
            name: '생명의 저주',
            kind: 'instant-damage',
            value: 100,
          });
        }
      }
      break;
    }

    case 'rope-bridge': {
      const evalRes = code ? evaluateCode(code, rng) : { path: 'then' };
      const isCourage = rng() < 0.5;

      if (evalRes.path === 'then') {
        resultTitle = '돌파 성공';
        if (isCourage) {
          resultMessage = '다리를 건너며 용기를 얻었다.';
          payloads.push({
            type: 'combat',
            name: '용기',
            kind: 'atk-buff',
            grade: 'normal',
            value: 2,
            duration: 15,
          });
        } else {
          resultMessage = '다리를 건너며 몸이 단련됐다.';
          payloads.push({
            type: 'combat',
            name: '단련',
            kind: 'def-buff',
            grade: 'normal',
            value: 2,
            duration: 15,
          });
        }
      } else {
        resultTitle = '돌파 실패';
        if (isCourage) {
          resultMessage = '겁에 질려 용기를 잃었다.';
          payloads.push({
            type: 'combat',
            name: '공포',
            kind: 'atk-debuff',
            grade: 'broken',
            value: -1,
            duration: 8,
          });
        } else {
          resultMessage = '다리를 건너다 몸을 다쳤다.';
          payloads.push({
            type: 'combat',
            name: '부상',
            kind: 'def-debuff',
            grade: 'broken',
            value: -1,
            duration: 8,
          });
        }
      }
      break;
    }

    case 'foggy-crossroads': {
      // 선택한 길의 계열 확인
      const isLeft = choiceId === 'left';
      const leftVar = code?.vars.find((v) => v.name === 'leftWay');
      const rightVar = code?.vars.find((v) => v.name === 'rightWay');
      const isCombat = isLeft
        ? (leftVar && 'value' in leftVar ? leftVar.value === 'COMBAT' : false)
        : (rightVar && 'value' in rightVar ? rightVar.value === 'COMBAT' : false);

      // 70% 긍정(버프), 30% 부정(디버프) (§4-8)
      const isPositive = rng() < 0.7;

      if (isCombat) {
        if (isPositive) {
          resultTitle = '갈림길 버프';
          resultMessage = '안개를 벗어나니 몸이 한결 가벼워졌다.';
          payloads.push({
            type: 'combat',
            name: '가벼운 발걸음',
            kind: rng() < 0.5 ? 'atk-buff' : 'def-buff',
            grade: 'normal',
            value: 2,
            duration: 15,
          });
        } else {
          resultTitle = '갈림길 디버프';
          resultMessage = '안개를 벗어나니 몸이 무거워졌다.';
          payloads.push({
            type: 'combat',
            name: '무거운 발걸음',
            kind: rng() < 0.5 ? 'atk-debuff' : 'def-debuff',
            grade: 'broken',
            value: -1,
            duration: 10,
          });
        }
      } else {
        if (isPositive) {
          resultTitle = '갈림길 치유';
          resultMessage = '안개를 벗어나니 상쾌한 기운이 감돈다.';
          payloads.push({
            type: 'vital',
            name: '상쾌한 기운',
            kind: 'instant-heal',
            value: 150,
          });
        } else {
          resultTitle = '갈림길 독기';
          resultMessage = '안개 속 독기에 폐가 찔리는 듯하다.';
          payloads.push({
            type: 'vital',
            name: '안개 독기',
            kind: 'instant-damage',
            value: 100,
          });
        }
      }
      break;
    }
  }

  // 효과 적용
  const { nextState, descriptions } = applyEventEffects(heroEffects, payloads);

  return {
    eventId,
    choiceId,
    outcomeKind: 'participate',
    resultTitle,
    resultMessage,
    effectDescriptions: descriptions,
    nextEffects: nextState,
    linkedBattle,
    missionItemCollected,
    altarVerdict,
  };
}
