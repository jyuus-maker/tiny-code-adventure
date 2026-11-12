import type { HeroEffectState } from '../effects/types';
import {
  applyCombatSlotEffect,
  applyPermanentEffect,
  applyVitalEffect,
} from '../effects/slotManager';
import type { EventEffectPayload } from './types';

/**
 * 이벤트 결과로 발생한 여러 효과들을 순차적으로 적용 (§4-7, §4-8)
 * - 영구 효과, 공방 슬롯 효과, 피 슬롯 효과를 한 번에 처리
 * - HP가 0 이하로 떨어지면 사망(isDead: true) 상태 플래그 확정
 */
export function applyEventEffects(
  initialState: HeroEffectState,
  payloads: readonly EventEffectPayload[],
): { nextState: HeroEffectState; descriptions: string[] } {
  let state = { ...initialState };
  const descriptions: string[] = [];

  for (const p of payloads) {
    if (state.isDead && p.type === 'vital' && p.kind === 'instant-heal') {
      // 사망 상태에서는 회복으로 부활 금지 (§4-7)
      continue;
    }

    if (p.type === 'permanent') {
      state = applyPermanentEffect(state, {
        stat: p.stat,
        value: p.value,
      });
      const statLabel =
        p.stat === 'attack' ? '공격력' : p.stat === 'defense' ? '방어력' : '최대 HP';
      const sign = p.value >= 0 ? `+${p.value}` : `${p.value}`;
      descriptions.push(`${statLabel} ${sign} (영구)`);
    } else if (p.type === 'combat') {
      const effectId = `combat-evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      state = applyCombatSlotEffect(state, {
        id: effectId,
        name: p.name,
        kind: p.kind,
        grade: p.grade,
        value: p.value,
        remainingTurns: p.duration,
        maxTurns: p.duration,
      });
      const statLabel = p.kind.startsWith('atk') ? '공격력' : '방어력';
      const sign = p.value >= 0 ? `+${p.value}` : `${p.value}`;
      descriptions.push(`${statLabel} ${sign} (${p.duration}T)`);
    } else if (p.type === 'vital') {
      state = applyVitalEffect(state, p);
      if (p.kind === 'instant-heal') {
        descriptions.push(`HP +${p.value} 회복`);
      } else if (p.kind === 'instant-damage') {
        descriptions.push(`HP -${p.value} 피해`);
      } else if (p.kind === 'dot-heal') {
        descriptions.push(`매 행동 HP +${p.value} 회복 (${p.duration ?? 20}T)`);
      } else if (p.kind === 'dot-damage') {
        descriptions.push(`매 행동 HP -${p.value} 피해 (${p.duration ?? 20}T)`);
      } else if (p.kind === 'temp-max-hp-up') {
        descriptions.push(`최대 HP +${p.value} (${p.duration ?? 20}T)`);
      } else if (p.kind === 'temp-max-hp-down') {
        descriptions.push(`최대 HP -${p.value} (${p.duration ?? 20}T)`);
      }
    }
  }

  return { nextState: state, descriptions };
}
