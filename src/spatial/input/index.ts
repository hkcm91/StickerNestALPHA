/**
 * Input module -- barrel export
 *
 * Bridges VR controller and hand tracking events to the event bus.
 *
 * @module spatial/input
 * @layer L4B
 */

export { ControllerBridge } from './ControllerBridge';
export {
  processControllerButtons,
  buildSpatialContextFromInputSource,
  type ControllerEventPayload,
} from './ControllerBridge';

export { HandBridge } from './HandBridge';
export {
  processHandState,
  buildPinchSpatialContext,
  type HandEventPayload,
} from './HandBridge';

export { Pointer, type PointerProps } from './Pointer';
