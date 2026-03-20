/**
 * useDeviceFrame — Device frame size state management hook.
 *
 * Manages the selected device frame for the preview pane:
 * - phone (375x812)
 * - tablet (768x1024)
 * - desktop (1280x800)
 *
 * @module lab/hooks
 * @layer L2
 */

import { useCallback, useState } from 'react';

export type DeviceType = 'phone' | 'tablet' | 'desktop';

export interface DeviceSize {
  width: number;
  height: number;
}

export const DEVICE_SIZES: Record<DeviceType, DeviceSize> = {
  phone: { width: 375, height: 812 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1280, height: 800 },
} as const;

export const DEVICE_LABELS: Record<DeviceType, string> = {
  phone: 'Phone',
  tablet: 'Tablet',
  desktop: 'Desktop',
} as const;

export interface DeviceFrameState {
  /** Currently selected device type */
  device: DeviceType;
  /** Current device dimensions */
  size: DeviceSize;
  /** Set the active device type */
  setDevice: (device: DeviceType) => void;
}

export function useDeviceFrame(initialDevice: DeviceType = 'phone'): DeviceFrameState {
  const [device, setDeviceState] = useState<DeviceType>(initialDevice);

  const setDevice = useCallback((newDevice: DeviceType) => {
    setDeviceState(newDevice);
  }, []);

  return {
    device,
    size: DEVICE_SIZES[device],
    setDevice,
  };
}
