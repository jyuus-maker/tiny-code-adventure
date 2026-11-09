import { getAsset } from '../render/assets';
import { CLIENTS } from './clients';
import { EVENTS } from './events';
import { ITEMS } from './items';
import { MISSIONS } from './missions';
import { MOBS } from './mobs';

export type ValidationCheckItem = {
  id: string;
  label: string;
  pass: boolean;
  detail: string;
};

export function validateContentData(): ValidationCheckItem[] {
  const results: ValidationCheckItem[] = [];
  const mobMap = new Map(MOBS.map((m) => [m.id, m]));
  const itemMap = new Map(ITEMS.map((i) => [i.id, i]));
  const clientMap = new Map(CLIENTS.map((c) => [c.id, c]));

  // 1. 에셋 존재 검사 (assetId, sceneAssetId, missionSceneAssetId, iconAssetIds)
  const missingAssets: string[] = [];
  for (const mob of MOBS) {
    if (!getAsset(mob.assetId)) {
      missingAssets.push(`Mob(${mob.id}).assetId=${mob.assetId}`);
    }
  }
  for (const item of ITEMS) {
    if (!getAsset(item.assetId)) {
      missingAssets.push(`Item(${item.id}).assetId=${item.assetId}`);
    }
    if (!getAsset(item.missionSceneAssetId)) {
      missingAssets.push(
        `Item(${item.id}).missionSceneAssetId=${item.missionSceneAssetId}`,
      );
    }
  }
  for (const ev of EVENTS) {
    if (!getAsset(ev.sceneAssetId)) {
      missingAssets.push(`Event(${ev.id}).sceneAssetId=${ev.sceneAssetId}`);
    }
    for (const iconId of ev.iconAssetIds ?? []) {
      if (!getAsset(iconId)) {
        missingAssets.push(`Event(${ev.id}).iconAssetIds=${iconId}`);
      }
    }
  }
  results.push({
    id: 'assets-exist',
    label:
      '모든 assetId·sceneAssetId·missionSceneAssetId·iconAssetIds가 getAsset으로 존재하는가',
    pass: missingAssets.length === 0,
    detail:
      missingAssets.length === 0
        ? `몹 ${MOBS.length}종, 아이템 ${ITEMS.length}종(아이템·미션장면), 이벤트 ${EVENTS.length}종(장면·아이콘) 모두 존재`
        : `누락: ${missingAssets.join(', ')}`,
  });

  // 2. 몹 <-> 전용템 양방향 참조 검사
  const linkErrors: string[] = [];
  for (const mob of MOBS) {
    const item = itemMap.get(mob.exclusiveItemId);
    if (!item) {
      linkErrors.push(
        `Mob(${mob.id})의 exclusiveItemId(${mob.exclusiveItemId})가 아이템 목록에 없음`,
      );
    } else if (item.sourceMobId !== mob.id) {
      linkErrors.push(
        `Item(${item.id}).sourceMobId(${item.sourceMobId}) !== Mob(${mob.id})`,
      );
    }
  }
  results.push({
    id: 'mob-item-link',
    label:
      '몹의 exclusiveItemId가 아이템 목록에 있고, 그 아이템의 sourceMobId가 그 몹을 가리키는가',
    pass: linkErrors.length === 0,
    detail:
      linkErrors.length === 0
        ? `몹 ${MOBS.length}종 ↔ 전용템 ${ITEMS.length}종 양방향 일치`
        : linkErrors.join('; '),
  });

  // 3. 아이템 reward와 원천 몹 타입 일치 검사 (미믹 아이템은 'score')
  const rewardErrors: string[] = [];
  for (const item of ITEMS) {
    const sourceMob = mobMap.get(item.sourceMobId);
    if (!sourceMob) {
      rewardErrors.push(
        `Item(${item.id})의 sourceMobId(${item.sourceMobId})가 몹 목록에 없음`,
      );
      continue;
    }
    const expectedReward =
      sourceMob.id === 'mimic' || sourceMob.type === 'special'
        ? 'score'
        : sourceMob.type;
    if (item.reward !== expectedReward) {
      rewardErrors.push(
        `Item(${item.id}).reward(${item.reward}) !== 기대값(${expectedReward})`,
      );
    }
  }
  results.push({
    id: 'item-reward-match',
    label: "아이템 reward가 원천 몹의 타입과 일치하는가(미믹 아이템은 'score')",
    pass: rewardErrors.length === 0,
    detail:
      rewardErrors.length === 0
        ? `아이템 ${ITEMS.length}종 모두 원천 몹 타입과 일치 (미믹 자물쇠 = score)`
        : rewardErrors.join('; '),
  });

  // 4. 의뢰자: itemId가 아이템 목록에 있고, sceneAssetId가 에셋에 있는가
  const clientErrors: string[] = [];
  for (const client of CLIENTS) {
    if (!itemMap.has(client.itemId)) {
      clientErrors.push(
        `Client(${client.id}).itemId(${client.itemId})가 아이템 목록에 없음`,
      );
    }
    if (!getAsset(client.sceneAssetId)) {
      clientErrors.push(
        `Client(${client.id}).sceneAssetId(${client.sceneAssetId})가 에셋에 없음`,
      );
    }
  }
  results.push({
    id: 'client-links',
    label: '의뢰자: itemId가 아이템 목록에 있고, sceneAssetId가 에셋에 있는가',
    pass: clientErrors.length === 0,
    detail:
      clientErrors.length === 0
        ? `의뢰자 ${CLIENTS.length}명 모두 itemId·sceneAssetId 존재`
        : clientErrors.join('; '),
  });

  // 5. 미션: clientId가 의뢰자 목록에 있는가, count가 1 이상인가
  const missionBaseErrors: string[] = [];
  for (const mission of MISSIONS) {
    if (!clientMap.has(mission.clientId)) {
      missionBaseErrors.push(
        `Mission(${mission.id}).clientId(${mission.clientId})가 의뢰자 목록에 없음`,
      );
    }
    if (mission.count < 1) {
      missionBaseErrors.push(
        `Mission(${mission.id}).count(${mission.count})가 1 미만임`,
      );
    }
  }
  results.push({
    id: 'mission-client-count',
    label: '미션: clientId가 의뢰자 목록에 있는가, count가 1 이상인가',
    pass: missionBaseErrors.length === 0,
    detail:
      missionBaseErrors.length === 0
        ? `미션 ${MISSIONS.length}개 모두 유효한 clientId 및 count >= 1 확인`
        : missionBaseErrors.join('; '),
  });

  // 6. 배틀 미션: targetMobId가 몹 목록에 있고, 그 몹의 exclusiveItemId가 의뢰자의 itemId와 같은가
  const battleTargetErrors: string[] = [];
  const battleMissions = MISSIONS.filter((m) => m.kind === 'battle');
  for (const mission of battleMissions) {
    const client = clientMap.get(mission.clientId);
    const targetMob = mission.targetMobId
      ? mobMap.get(mission.targetMobId)
      : undefined;
    if (!targetMob) {
      battleTargetErrors.push(
        `Mission(${mission.id}).targetMobId(${mission.targetMobId ?? '없음'})가 몹 목록에 없음`,
      );
    } else if (client && targetMob.exclusiveItemId !== client.itemId) {
      battleTargetErrors.push(
        `Mission(${mission.id}): Mob(${targetMob.id}).exclusiveItemId(${targetMob.exclusiveItemId}) !== Client(${client.id}).itemId(${client.itemId})`,
      );
    }
  }
  results.push({
    id: 'battle-mission-target',
    label:
      '배틀 미션: targetMobId가 몹 목록에 있고, 그 몹의 exclusiveItemId가 의뢰자의 itemId와 같은가',
    pass: battleTargetErrors.length === 0,
    detail:
      battleTargetErrors.length === 0
        ? `배틀 미션 ${battleMissions.length}개 모두 원천 몹 및 의뢰 물건 일치`
        : battleTargetErrors.join('; '),
  });

  // 7. 배틀 미션: 대상 몹의 time이 'night'이면 count가 3 이하인가
  const battleNightErrors: string[] = [];
  let nightBattleCount = 0;
  for (const mission of battleMissions) {
    const targetMob = mission.targetMobId
      ? mobMap.get(mission.targetMobId)
      : undefined;
    if (targetMob && targetMob.time === 'night') {
      nightBattleCount++;
      if (mission.count > 3) {
        battleNightErrors.push(
          `Mission(${mission.id}): 밤 몹(${targetMob.id}) 대상 미션 count(${mission.count})가 3을 초과함`,
        );
      }
    }
  }
  results.push({
    id: 'battle-mission-night-count',
    label: "배틀 미션: 대상 몹의 time이 'night'이면 count가 3 이하인가",
    pass: battleNightErrors.length === 0,
    detail:
      battleNightErrors.length === 0
        ? `밤 몹 대상 배틀 미션 ${nightBattleCount}개 모두 count <= 3 충족`
        : battleNightErrors.join('; '),
  });

  // 8. 탐색 미션: targetItemId가 의뢰자의 itemId와 같고, 'mimic-lock'이 아닌가
  const exploreErrors: string[] = [];
  const exploreMissions = MISSIONS.filter((m) => m.kind === 'explore');
  for (const mission of exploreMissions) {
    const client = clientMap.get(mission.clientId);
    if (!mission.targetItemId) {
      exploreErrors.push(`Mission(${mission.id}).targetItemId가 없음`);
    } else {
      if (client && mission.targetItemId !== client.itemId) {
        exploreErrors.push(
          `Mission(${mission.id}).targetItemId(${mission.targetItemId}) !== Client(${client.id}).itemId(${client.itemId})`,
        );
      }
      if (mission.targetItemId === 'mimic-lock') {
        exploreErrors.push(
          `Mission(${mission.id}).targetItemId가 금지된 'mimic-lock'임`,
        );
      }
    }
  }
  results.push({
    id: 'explore-mission-target',
    label:
      "탐색 미션: targetItemId가 의뢰자의 itemId와 같고, 'mimic-lock'이 아닌가",
    pass: exploreErrors.length === 0,
    detail:
      exploreErrors.length === 0
        ? `탐색 미션 ${exploreMissions.length}개 모두 의뢰자의 itemId와 일치하며 'mimic-lock' 제외 확인`
        : exploreErrors.join('; '),
  });

  // 9. 미션 id가 겹치지 않는가
  const seenMissionIds = new Set<string>();
  const duplicateMissionIds: string[] = [];
  for (const mission of MISSIONS) {
    if (seenMissionIds.has(mission.id)) {
      duplicateMissionIds.push(mission.id);
    } else {
      seenMissionIds.add(mission.id);
    }
  }
  results.push({
    id: 'mission-unique-ids',
    label: '미션 id가 겹치지 않는가',
    pass: duplicateMissionIds.length === 0,
    detail:
      duplicateMissionIds.length === 0
        ? `미션 ${MISSIONS.length}개 모두 고유 id 확인`
        : `중복 id: ${duplicateMissionIds.join(', ')}`,
  });

  return results;
}
