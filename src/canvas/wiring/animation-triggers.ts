/**
 * Animation Triggers — detects interaction events and dispatches entity animations
 *
 * @module canvas/wiring/animation-triggers
 * @layer L4A-3
 *
 * @remarks
 * Subscribes to bus events (pointer, viewport, lifecycle) and matches them
 * against entity animation bindings. When a trigger matches, dispatches
 * to the EntityAnimationOrchestrator.
 *
 * Mode gating: triggers only fire in preview/play mode. In edit mode,
 * automatic triggers are suppressed (the animation panel's preview
 * button bypasses this check by calling orchestrator.triggerClip directly).
 */

import { CanvasEvents, InputEvents, InteractionModeEvents } from '@sn/types';
import type { AnimationTriggerType, EntityAnimationConfig, AnimationBinding } from '@sn/types';

import { bus } from '../../kernel/bus';
import type { IEntityAnimationOrchestrator } from '../../kernel/systems/entity-animation-orchestrator';

// =============================================================================
// Types
// =============================================================================

export interface AnimationTriggersContext {
  /** Tear down all subscriptions */
  destroy(): void;
}

interface EntityTriggerEntry {
  entityId: string;
  bindings: AnimationBinding[];
  config: EntityAnimationConfig;
}

// =============================================================================
// Implementation
// =============================================================================

export function createAnimationTriggers(
  orchestrator: IEntityAnimationOrchestrator,
): AnimationTriggersContext {
  const unsubscribers: Array<() => void> = [];
  const entityRegistry = new Map<string, EntityTriggerEntry>();
  const hoveredEntityId: { current: string | null } = { current: null };
  const scrollTriggered = new Set<string>();
  const timerHandles = new Map<string, ReturnType<typeof setTimeout>[]>();
  let isPlayMode = false;

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  function getBindingsForTrigger(
    entityId: string,
    triggerType: AnimationTriggerType,
  ): AnimationBinding[] {
    const entry = entityRegistry.get(entityId);
    if (!entry || !entry.config.enabled) return [];
    return entry.bindings
      .filter((b: AnimationBinding) => b.enabled && b.trigger.type === triggerType)
      .sort((a: AnimationBinding, b: AnimationBinding) => b.priority - a.priority);
  }

  function fireBindings(entityId: string, triggerType: AnimationTriggerType): void {
    if (!isPlayMode) return;
    const bindings = getBindingsForTrigger(entityId, triggerType);
    for (const binding of bindings) {
      orchestrator.triggerAnimation(entityId, binding.id);
    }
  }

  // -------------------------------------------------------------------------
  // Entity registration via bus
  // -------------------------------------------------------------------------

  unsubscribers.push(
    bus.subscribe(CanvasEvents.ENTITY_CREATED, (event) => {
      const p = event.payload as { entity?: { id?: string; animations?: EntityAnimationConfig } };
      if (p.entity?.id && p.entity.animations) {
        registerEntity(p.entity.id, p.entity.animations);
      }
    }),
  );

  unsubscribers.push(
    bus.subscribe(CanvasEvents.ENTITY_DELETED, (event) => {
      const p = event.payload as { entityId?: string };
      if (p.entityId) {
        unregisterEntity(p.entityId);
      }
    }),
  );

  unsubscribers.push(
    bus.subscribe(CanvasEvents.ENTITY_UPDATED, (event) => {
      const p = event.payload as { entityId?: string; entity?: { animations?: EntityAnimationConfig } };
      if (p.entityId && p.entity?.animations) {
        unregisterEntity(p.entityId);
        registerEntity(p.entityId, p.entity.animations);
      }
    }),
  );

  // -------------------------------------------------------------------------
  // Mode tracking
  // -------------------------------------------------------------------------

  unsubscribers.push(
    bus.subscribe(InteractionModeEvents.MODE_CHANGED, (event) => {
      const p = event.payload as { mode?: string };
      isPlayMode = p.mode === 'play' || p.mode === 'preview';

      if (isPlayMode) {
        // Fire page-load triggers for all registered entities
        for (const [entityId] of entityRegistry) {
          fireBindings(entityId, 'page-load');
        }
      }
    }),
  );

  // -------------------------------------------------------------------------
  // Click trigger
  // -------------------------------------------------------------------------

  unsubscribers.push(
    bus.subscribe(InputEvents.POINTER_UP, (event) => {
      const p = event.payload as { entityId?: string };
      if (p.entityId) {
        fireBindings(p.entityId, 'click');
      }
    }),
  );

  // -------------------------------------------------------------------------
  // Double-click trigger
  // -------------------------------------------------------------------------

  unsubscribers.push(
    bus.subscribe(InputEvents.GESTURE_DOUBLE_TAP, (event) => {
      const p = event.payload as { entityId?: string };
      if (p.entityId) {
        fireBindings(p.entityId, 'double-click');
      }
    }),
  );

  // -------------------------------------------------------------------------
  // Hover triggers
  // -------------------------------------------------------------------------

  unsubscribers.push(
    bus.subscribe(InputEvents.POINTER_MOVE, (event) => {
      const p = event.payload as { entityId?: string | null };
      const newHoveredId = p.entityId ?? null;

      if (newHoveredId !== hoveredEntityId.current) {
        // Fire hover-leave on old entity
        if (hoveredEntityId.current) {
          fireBindings(hoveredEntityId.current, 'hover-leave');
        }
        // Fire hover-enter on new entity
        if (newHoveredId) {
          fireBindings(newHoveredId, 'hover-enter');
        }
        hoveredEntityId.current = newHoveredId;
      }
    }),
  );

  // -------------------------------------------------------------------------
  // Bus-event triggers
  // -------------------------------------------------------------------------

  // Collect all unique eventTypes from bus-event bindings and subscribe
  function setupBusEventSubscriptions(): void {
    const eventTypes = new Set<string>();
    for (const entry of entityRegistry.values()) {
      for (const binding of entry.bindings) {
        if (binding.trigger.type === 'bus-event' && binding.trigger.eventType) {
          eventTypes.add(binding.trigger.eventType);
        }
      }
    }

    for (const eventType of eventTypes) {
      const unsub = bus.subscribe(eventType, (event) => {
        if (!isPlayMode) return;
        const payload = event.payload;
        for (const [entityId, entry] of entityRegistry) {
          const bindings = entry.bindings.filter(
            (b: AnimationBinding) =>
              b.enabled &&
              b.trigger.type === 'bus-event' &&
              b.trigger.eventType === eventType,
          );

          for (const binding of bindings) {
            // Check filter if specified
            if (binding.trigger.eventFilter && payload && typeof payload === 'object') {
              const matches = Object.entries(binding.trigger.eventFilter).every(
                ([key, value]) => (payload as Record<string, unknown>)[key] === value,
              );
              if (!matches) continue;
            }
            orchestrator.triggerAnimation(entityId, binding.id);
          }
        }
      });
      unsubscribers.push(unsub);
    }
  }

  // -------------------------------------------------------------------------
  // State-change triggers
  // -------------------------------------------------------------------------

  unsubscribers.push(
    bus.subscribe(CanvasEvents.ENTITY_STATE_CHANGED, (event) => {
      const p = event.payload as { entityId?: string; toState?: string };
      if (!p.entityId || !p.toState || !isPlayMode) return;

      const bindings = getBindingsForTrigger(p.entityId, 'state-change');
      for (const binding of bindings) {
        if (binding.trigger.stateName === p.toState) {
          orchestrator.triggerAnimation(p.entityId, binding.id);
        }
      }
    }),
  );

  // -------------------------------------------------------------------------
  // Entity registration helpers
  // -------------------------------------------------------------------------

  function registerEntity(entityId: string, config: EntityAnimationConfig): void {
    if (!config.enabled || config.bindings.length === 0) return;

    entityRegistry.set(entityId, {
      entityId,
      bindings: config.bindings,
      config,
    });

    orchestrator.registerEntity(entityId, config);

    // Set up timer triggers
    const timerBindings = config.bindings.filter(
      (b: AnimationBinding) => b.enabled && b.trigger.type === 'timer' && b.trigger.timerDelay,
    );
    if (timerBindings.length > 0) {
      const handles: ReturnType<typeof setTimeout>[] = [];
      for (const binding of timerBindings) {
        const handle = setTimeout(() => {
          if (isPlayMode) {
            orchestrator.triggerAnimation(entityId, binding.id);
          }
        }, (binding.trigger.timerDelay ?? 1) * 1000);
        handles.push(handle);
      }
      timerHandles.set(entityId, handles);
    }

    // Rebuild bus-event subscriptions when entities change
    setupBusEventSubscriptions();
  }

  function unregisterEntity(entityId: string): void {
    entityRegistry.delete(entityId);
    orchestrator.unregisterEntity(entityId);
    scrollTriggered.delete(entityId);

    // Clear timer handles
    const handles = timerHandles.get(entityId);
    if (handles) {
      for (const h of handles) clearTimeout(h);
      timerHandles.delete(entityId);
    }
  }

  // -------------------------------------------------------------------------
  // Destroy
  // -------------------------------------------------------------------------

  return {
    destroy(): void {
      for (const unsub of unsubscribers) unsub();
      unsubscribers.length = 0;
      for (const handles of timerHandles.values()) {
        for (const h of handles) clearTimeout(h);
      }
      timerHandles.clear();
      entityRegistry.clear();
      scrollTriggered.clear();
      hoveredEntityId.current = null;
    },
  };
}
