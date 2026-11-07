import { getAsset } from '../render/assets';
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

  // 4. 미션 검사 (targetMobId 존재 여부, 밤 몹 대상 미션 count <= 3)
  const missionErrors: string[] = [];
  for (const mission of MISSIONS) {
    if (mission.kind === 'battle' || mission.targetMobId !== undefined) {
      const targetMob = mission.targetMobId
        ? mobMap.get(mission.targetMobId)
        : undefined;
      if (!targetMob) {
        missionErrors.push(
          `Mission(${mission.id})의 targetMobId(${mission.targetMobId ?? '없음'})가 몹 목록에 없음`,
        );
      } else if (
        targetMob.time === 'night' &&
        mission.count !== undefined &&
        mission.count > 3
      ) {
        missionErrors.push(
          `Mission(${mission.id}): 밤 몹(${targetMob.id}) 대상 미션 count(${mission.count})가 3을 초과함`,
        );
      }
    }
  }
  results.push({
    id: 'mission-rules',
    label:
      '미션: targetMobId가 몹 목록에 있는가, 밤 몹 대상 미션의 count가 3 이하인가',
    pass: missionErrors.length === 0,
    detail:
      missionErrors.length === 0
        ? `등록된 미션 ${MISSIONS.length}개 검사 통과`
        : missionErrors.join('; '),
  });

  return results;
}
