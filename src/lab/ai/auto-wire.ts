/**
 * Auto-Wire — Connects a newly generated widget to selected widgets in the
 * pipeline graph by matching event port names.
 *
 * Called silently after AI generation when the user selected widgets to
 * connect to in the PromptRefinement overlay. Mismatches are skipped
 * without error — auto-wiring is best-effort.
 *
 * @module lab/ai
 * @layer L2
 */

import type { WidgetManifest } from '@sn/types';

import type { WidgetRegistryEntry } from '../../kernel/stores/widget/widget.store';
import { portsFromManifest } from '../graph/scene-types';

import type { CompatibleWidget } from './prompt-questions';

// ─── Types ───────────────────────────────────────────────────────────

/** Minimal graph API surface needed for auto-wiring */
export interface AutoWireGraphAPI {
  getSceneNodes: () => Array<{ id: string; label: string; widgetId?: string }>;
  addWidgetFromLibrary: (entry: WidgetRegistryEntry) => void;
  addSceneEdge: (
    sourceNodeId: string,
    sourcePortId: string,
    targetNodeId: string,
    targetPortId: string,
  ) => void;
}

// ─── Auto-Wire Logic ─────────────────────────────────────────────────

/**
 * Wires a newly generated widget to selected widgets in the pipeline graph.
 *
 * For each selected widget:
 * 1. Finds (or adds) the widget in the graph
 * 2. Derives ports from both the new widget's manifest and the selected widget's contracts
 * 3. Connects matching ports by event name (exact, case-sensitive)
 *
 * All failures are swallowed — auto-wiring is non-blocking.
 */
export function autoWireWidget(
  _newWidgetId: string,
  newManifest: WidgetManifest,
  selectedWidgets: CompatibleWidget[],
  graphAPI: AutoWireGraphAPI,
  installedWidgets: WidgetRegistryEntry[],
): void {
  const sceneNodes = graphAPI.getSceneNodes();
  const newPorts = portsFromManifest(newManifest);

  // Find the newly added node (last node with matching label)
  const newNode = [...sceneNodes].reverse().find(
    (n) => n.label === newManifest.name,
  );
  if (!newNode) return;

  for (const selected of selectedWidgets) {
    // Find the selected widget's node in the graph
    let targetNode = sceneNodes.find(
      (n) => n.widgetId === selected.widgetId || n.label === selected.name,
    );

    // If not in graph, add it from the installed widgets registry
    if (!targetNode && selected.widgetId) {
      const registryEntry = installedWidgets.find(
        (w) => w.widgetId === selected.widgetId,
      );
      if (registryEntry) {
        graphAPI.addWidgetFromLibrary(registryEntry);
        // Re-fetch scene nodes to find the newly added node
        const updatedNodes = graphAPI.getSceneNodes();
        targetNode = [...updatedNodes].reverse().find(
          (n) => n.label === selected.name,
        );
      }
    }

    if (!targetNode) continue;

    // Derive target ports from the selected widget's contracts
    const targetPorts = portsFromManifest({
      events: {
        emits: selected.portContracts.emits,
        subscribes: selected.portContracts.subscribes,
      },
    });

    // Match new widget's outputs → selected widget's inputs
    for (const outPort of newPorts.outputPorts) {
      for (const inPort of targetPorts.inputPorts) {
        if (outPort.eventType === inPort.eventType) {
          graphAPI.addSceneEdge(
            newNode.id,
            outPort.id,
            targetNode.id,
            inPort.id,
          );
        }
      }
    }

    // Match selected widget's outputs → new widget's inputs
    for (const outPort of targetPorts.outputPorts) {
      for (const inPort of newPorts.inputPorts) {
        if (outPort.eventType === inPort.eventType) {
          graphAPI.addSceneEdge(
            targetNode.id,
            outPort.id,
            newNode.id,
            inPort.id,
          );
        }
      }
    }
  }
}
