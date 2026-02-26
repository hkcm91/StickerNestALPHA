/**
 * StickerSettingsModal — configuration dialog for creating/editing stickers.
 *
 * @remarks
 * Displayed when:
 * - Creating a new sticker from the asset panel
 * - Editing an existing sticker's settings
 *
 * Allows configuration of:
 * - Alt text (accessibility)
 * - Hover effect (none, scale, glow, opacity)
 * - Click action (none, open URL, launch widget, emit event)
 * - Aspect ratio lock
 *
 * @module shell/components
 * @layer L6
 */

import React, { useCallback, useState } from 'react';

import type { StickerClickActionType, StickerEntity } from '@sn/types';

import { useWidgetStore } from '../../kernel/stores/widget';

import { Modal } from './Modal';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type HoverEffectType = 'none' | 'scale' | 'glow' | 'opacity';

export interface StickerSettings {
  altText: string;
  hoverEffect: HoverEffectType;
  aspectLocked: boolean;
  // Click action settings
  clickActionType: StickerClickActionType;
  clickUrl: string;
  clickUrlNewTab: boolean;
  clickWidgetId: string;
  clickEventType: string;
  clickEventPayload: string; // JSON string
}

export interface StickerSettingsModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Called when the modal is closed without saving */
  onClose: () => void;
  /** Called when settings are confirmed */
  onConfirm: (settings: StickerSettings) => void;
  /** Initial settings (for editing existing sticker) */
  initialSettings?: Partial<StickerSettings>;
  /** Asset preview URL */
  assetUrl?: string;
  /** Asset type for preview */
  assetType?: StickerEntity['assetType'];
}

// ---------------------------------------------------------------------------
// Subcomponents
// ---------------------------------------------------------------------------

interface FormFieldProps {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
  hint?: string;
}

const FormField: React.FC<FormFieldProps> = ({ label, htmlFor, children, hint }) => (
  <div style={{ marginBottom: '16px' }}>
    <label
      htmlFor={htmlFor}
      style={{
        display: 'block',
        marginBottom: '6px',
        fontSize: '14px',
        fontWeight: 500,
        color: 'var(--sn-text, #111827)',
      }}
    >
      {label}
    </label>
    {children}
    {hint && (
      <p
        style={{
          margin: '4px 0 0',
          fontSize: '12px',
          color: 'var(--sn-text-muted, #6b7280)',
        }}
      >
        {hint}
      </p>
    )}
  </div>
);

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid var(--sn-border, #e5e7eb)',
  borderRadius: 'var(--sn-radius, 6px)',
  fontSize: '14px',
  fontFamily: 'inherit',
  color: 'var(--sn-text, #111827)',
  background: 'var(--sn-bg, #ffffff)',
  boxSizing: 'border-box' as const,
  outline: 'none',
  transition: 'border-color 0.15s',
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: 'pointer',
};

const buttonBaseStyle: React.CSSProperties = {
  padding: '10px 20px',
  fontSize: '14px',
  fontWeight: 500,
  fontFamily: 'inherit',
  borderRadius: 'var(--sn-radius, 6px)',
  cursor: 'pointer',
  transition: 'background 0.15s, border-color 0.15s',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Modal dialog for configuring sticker settings.
 */
export const StickerSettingsModal: React.FC<StickerSettingsModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  initialSettings,
  assetUrl,
  assetType = 'image',
}) => {
  // Get available widgets from registry for the widget picker
  const widgetRegistry = useWidgetStore((state) => state.registry);
  const availableWidgets = Object.values(widgetRegistry);

  const [settings, setSettings] = useState<StickerSettings>({
    altText: initialSettings?.altText ?? '',
    hoverEffect: initialSettings?.hoverEffect ?? 'none',
    aspectLocked: initialSettings?.aspectLocked ?? true,
    // Click action settings
    clickActionType: initialSettings?.clickActionType ?? 'none',
    clickUrl: initialSettings?.clickUrl ?? '',
    clickUrlNewTab: initialSettings?.clickUrlNewTab ?? true,
    clickWidgetId: initialSettings?.clickWidgetId ?? '',
    clickEventType: initialSettings?.clickEventType ?? '',
    clickEventPayload: initialSettings?.clickEventPayload ?? '{}',
  });

  const [payloadError, setPayloadError] = useState<string | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);

  const handleChange = useCallback(
    <K extends keyof StickerSettings>(field: K, value: StickerSettings[K]) => {
      setSettings((prev) => ({ ...prev, [field]: value }));

      // Validate JSON payload when it changes
      if (field === 'clickEventPayload') {
        try {
          JSON.parse(value as string);
          setPayloadError(null);
        } catch {
          setPayloadError('Invalid JSON format');
        }
      }

      // Validate URL when it changes
      if (field === 'clickUrl') {
        const urlStr = value as string;
        if (urlStr && urlStr.length > 0) {
          try {
            new URL(urlStr);
            setUrlError(null);
          } catch {
            setUrlError('Please enter a valid URL');
          }
        } else {
          setUrlError(null);
        }
      }
    },
    [],
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      // Validate based on action type
      if (settings.clickActionType === 'open-url') {
        if (!settings.clickUrl) {
          setUrlError('URL is required for Open URL action');
          return;
        }
        try {
          new URL(settings.clickUrl);
        } catch {
          setUrlError('Please enter a valid URL');
          return;
        }
      }

      if (settings.clickActionType === 'launch-widget') {
        if (!settings.clickWidgetId) {
          // Widget selection is optional but we should let them know
        }
      }

      if (settings.clickActionType === 'emit-event') {
        // Validate JSON payload before submitting
        try {
          JSON.parse(settings.clickEventPayload);
        } catch {
          setPayloadError('Invalid JSON format');
          return;
        }
      }

      onConfirm(settings);
    },
    [settings, onConfirm],
  );

  const footer = (
    <>
      <button
        type="button"
        onClick={onClose}
        style={{
          ...buttonBaseStyle,
          background: 'transparent',
          border: '1px solid var(--sn-border, #e5e7eb)',
          color: 'var(--sn-text, #111827)',
        }}
      >
        Cancel
      </button>
      <button
        type="submit"
        form="sticker-settings-form"
        style={{
          ...buttonBaseStyle,
          background: 'var(--sn-accent, #3b82f6)',
          border: '1px solid var(--sn-accent, #3b82f6)',
          color: '#ffffff',
        }}
      >
        Create Sticker
      </button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Sticker Settings"
      footer={footer}
      maxWidth={520}
    >
      <form id="sticker-settings-form" onSubmit={handleSubmit}>
        {/* Asset Preview */}
        {assetUrl && (
          <div
            style={{
              marginBottom: '20px',
              padding: '16px',
              background: 'var(--sn-bg, #f9fafb)',
              borderRadius: 'var(--sn-radius, 8px)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            {assetType === 'video' ? (
              <video
                src={assetUrl}
                autoPlay
                loop
                muted
                playsInline
                style={{
                  maxWidth: '100%',
                  maxHeight: '150px',
                  objectFit: 'contain',
                  borderRadius: '4px',
                }}
              />
            ) : (
              <img
                src={assetUrl}
                alt="Sticker preview"
                style={{
                  maxWidth: '100%',
                  maxHeight: '150px',
                  objectFit: 'contain',
                  borderRadius: '4px',
                }}
              />
            )}
          </div>
        )}

        {/* Alt Text */}
        <FormField
          label="Alt Text"
          htmlFor="sticker-alt-text"
          hint="Describes the sticker for screen readers and accessibility"
        >
          <input
            id="sticker-alt-text"
            type="text"
            value={settings.altText}
            onChange={(e) => handleChange('altText', e.target.value)}
            placeholder="Describe this sticker..."
            style={inputStyle}
          />
        </FormField>

        {/* Hover Effect */}
        <FormField
          label="Hover Effect"
          htmlFor="sticker-hover-effect"
          hint="Visual feedback when users hover over the sticker"
        >
          <select
            id="sticker-hover-effect"
            value={settings.hoverEffect}
            onChange={(e) => handleChange('hoverEffect', e.target.value as HoverEffectType)}
            style={selectStyle}
          >
            <option value="none">None</option>
            <option value="scale">Scale (grow slightly)</option>
            <option value="glow">Glow (shadow effect)</option>
            <option value="opacity">Opacity (fade slightly)</option>
          </select>
        </FormField>

        {/* Aspect Ratio Lock */}
        <FormField label="Aspect Ratio" htmlFor="sticker-aspect-locked">
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
            }}
          >
            <input
              id="sticker-aspect-locked"
              type="checkbox"
              checked={settings.aspectLocked}
              onChange={(e) => handleChange('aspectLocked', e.target.checked)}
              style={{
                width: '18px',
                height: '18px',
                accentColor: 'var(--sn-accent, #3b82f6)',
              }}
            />
            <span style={{ fontSize: '14px', color: 'var(--sn-text, #111827)' }}>
              Lock aspect ratio when resizing
            </span>
          </label>
        </FormField>

        {/* Click Action Section */}
        <div
          style={{
            marginTop: '24px',
            borderTop: '1px solid var(--sn-border, #e5e7eb)',
            paddingTop: '16px',
          }}
        >
          <h3
            style={{
              fontSize: '14px',
              fontWeight: 600,
              color: 'var(--sn-text, #111827)',
              marginBottom: '12px',
              marginTop: 0,
            }}
          >
            Click Action
          </h3>

          <p
            style={{
              fontSize: '13px',
              color: 'var(--sn-text-muted, #6b7280)',
              marginBottom: '16px',
            }}
          >
            Configure what happens when this sticker is clicked.
          </p>

          {/* Action Type Selector */}
          <FormField
            label="Action Type"
            htmlFor="sticker-action-type"
          >
            <select
              id="sticker-action-type"
              value={settings.clickActionType}
              onChange={(e) => handleChange('clickActionType', e.target.value as StickerClickActionType)}
              style={selectStyle}
            >
              <option value="none">None (decorative only)</option>
              <option value="open-url">Open URL</option>
              <option value="launch-widget">Launch Widget</option>
              <option value="emit-event">Emit Event</option>
            </select>
          </FormField>

          {/* URL Fields (shown for 'open-url' action) */}
          {settings.clickActionType === 'open-url' && (
            <>
              <FormField
                label="URL"
                htmlFor="sticker-click-url"
                hint="The URL to open when this sticker is clicked"
              >
                <input
                  id="sticker-click-url"
                  type="url"
                  value={settings.clickUrl}
                  onChange={(e) => handleChange('clickUrl', e.target.value)}
                  placeholder="https://example.com"
                  style={{
                    ...inputStyle,
                    borderColor: urlError ? '#dc2626' : undefined,
                  }}
                />
                {urlError && (
                  <p
                    style={{
                      margin: '4px 0 0',
                      fontSize: '12px',
                      color: '#dc2626',
                    }}
                  >
                    {urlError}
                  </p>
                )}
              </FormField>

              <FormField label="Open in" htmlFor="sticker-url-new-tab">
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    id="sticker-url-new-tab"
                    type="checkbox"
                    checked={settings.clickUrlNewTab}
                    onChange={(e) => handleChange('clickUrlNewTab', e.target.checked)}
                    style={{
                      width: '18px',
                      height: '18px',
                      accentColor: 'var(--sn-accent, #3b82f6)',
                    }}
                  />
                  <span style={{ fontSize: '14px', color: 'var(--sn-text, #111827)' }}>
                    Open in new tab
                  </span>
                </label>
              </FormField>
            </>
          )}

          {/* Widget Picker (shown for 'launch-widget' action) */}
          {settings.clickActionType === 'launch-widget' && (
            <FormField
              label="Widget to Launch"
              htmlFor="sticker-widget-picker"
              hint={
                availableWidgets.length === 0
                  ? 'No widgets installed. Install widgets from the Marketplace.'
                  : 'Select a widget to place on the canvas when clicked'
              }
            >
              <select
                id="sticker-widget-picker"
                value={settings.clickWidgetId}
                onChange={(e) => handleChange('clickWidgetId', e.target.value)}
                style={selectStyle}
                disabled={availableWidgets.length === 0}
              >
                <option value="">Select a widget...</option>
                {availableWidgets.map((widget) => (
                  <option key={widget.widgetId} value={widget.widgetId}>
                    {widget.manifest.name} {widget.isBuiltIn ? '(Built-in)' : ''}
                  </option>
                ))}
              </select>
            </FormField>
          )}

          {/* Event Fields (shown for 'emit-event' action) */}
          {settings.clickActionType === 'emit-event' && (
            <>
              <FormField
                label="Event Type"
                htmlFor="sticker-click-event-type"
                hint="The event name to emit (e.g., 'sticker.action.triggered')"
              >
                <input
                  id="sticker-click-event-type"
                  type="text"
                  value={settings.clickEventType}
                  onChange={(e) => handleChange('clickEventType', e.target.value)}
                  placeholder="sticker.action.triggered"
                  style={inputStyle}
                />
              </FormField>

              <FormField
                label="Event Payload"
                htmlFor="sticker-click-event-payload"
                hint="JSON data to include with the event"
              >
                <textarea
                  id="sticker-click-event-payload"
                  value={settings.clickEventPayload}
                  onChange={(e) => handleChange('clickEventPayload', e.target.value)}
                  placeholder='{"action": "custom", "data": {}}'
                  rows={3}
                  style={{
                    ...inputStyle,
                    resize: 'vertical',
                    fontFamily: 'monospace',
                    fontSize: '13px',
                    borderColor: payloadError ? '#dc2626' : undefined,
                  }}
                />
                {payloadError && (
                  <p
                    style={{
                      margin: '4px 0 0',
                      fontSize: '12px',
                      color: '#dc2626',
                    }}
                  >
                    {payloadError}
                  </p>
                )}
              </FormField>
            </>
          )}
        </div>
      </form>
    </Modal>
  );
};
