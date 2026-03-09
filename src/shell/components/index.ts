/**
 * Shell components barrel export.
 *
 * @module shell/components
 * @layer L6
 */

export { Modal } from './Modal';
export type { ModalProps } from './Modal';

export { StickerSettingsModal } from './StickerSettingsModal';
export type {
  StickerSettingsModalProps,
  StickerSettings,
  HoverEffectType,
} from './StickerSettingsModal';

// Docker components
export {
  DockerContainer,
  DockerHeader,
  DockerTabBar,
  DockerContent,
  DockerWidgetSlot,
  DockerResizeHandle,
  DockerResizeHandles,
  DockerLayer,
} from './docker';
export type {
  DockerContainerProps,
  DockerHeaderProps,
  DockerTabBarProps,
  DockerContentProps,
  DockerWidgetSlotProps,
  DockerResizeHandleProps,
  DockerResizeHandlesProps,
  DockerLayerProps,
  ResizeDirection,
} from './docker';

// Auth components
export * from './auth';

// Design system components
export { CommandPalette } from './CommandPalette';
export type { CommandPaletteProps } from './CommandPalette';
export { PanelSlide, PanelSlideItem } from './PanelSlide';
export type { PanelSlideProps, PanelSlideItemProps } from './PanelSlide';
