/**
 * LabManifest — Manifest editor GUI for the Widget Lab.
 *
 * Form-based editor for widget manifest with:
 * - Name, version, description fields
 * - Permissions checkboxes
 * - Event contract editor (emit/subscribe)
 * - Config schema editor
 * - Breaking change warning (ember glow)
 * - Toggle between form view and raw JSON
 *
 * @module lab/components
 * @layer L2
 */

import React, { useCallback, useState } from 'react';

import type { ManifestEditor } from '../manifest/manifest-editor';

import { labPalette, SPRING } from './shared/palette';

// ═══════════════════════════════════════════════════════════════════
// Breaking Change Banner
// ═══════════════════════════════════════════════════════════════════

const BreakingChangeBanner: React.FC<{ changes: string[] }> = ({ changes }) => (
  <div
    role="alert"
    style={{
      padding: '10px 14px', borderRadius: 8, marginBottom: 12,
      background: 'rgba(232,128,108,0.06)',
      border: '1px solid rgba(232,128,108,0.2)',
      boxShadow: '0 0 12px rgba(232,128,108,0.08)',
    }}
  >
    <div style={{
      fontSize: 11, fontWeight: 700, color: labPalette.ember, marginBottom: 6,
      fontFamily: 'var(--sn-font-family)',
    }}>
      Breaking changes detected — requires semver major bump
    </div>
    {changes.map((c, i) => (
      <div key={i} style={{
        fontSize: 10, color: labPalette.textSoft, paddingLeft: 8,
        fontFamily: 'var(--sn-font-mono, "DM Mono", monospace)',
        lineHeight: 1.6,
      }}>
        - {c}
      </div>
    ))}
  </div>
);

// ═══════════════════════════════════════════════════════════════════
// Form Field
// ═══════════════════════════════════════════════════════════════════

const FieldLabel: React.FC<{ children: string }> = ({ children }) => (
  <div style={{
    fontSize: 9, fontWeight: 700, color: labPalette.textMuted,
    textTransform: 'uppercase', letterSpacing: '0.14em',
    marginBottom: 6,
  }}>
    {children}
  </div>
);

const FieldInput: React.FC<{
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  mono?: boolean;
}> = ({ value, onChange, placeholder, mono }) => (
  <input
    type="text"
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    aria-label={placeholder}
    style={{
      width: '100%', padding: '8px 12px', fontSize: 12,
      fontFamily: mono ? 'var(--sn-font-mono, "DM Mono", monospace)' : 'var(--sn-font-family)',
      color: labPalette.text, background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8,
      outline: 'none', transition: `border-color 300ms ${SPRING}`,
      boxSizing: 'border-box',
    }}
    onFocus={(e) => { e.target.style.borderColor = 'rgba(78,123,142,0.3)'; }}
    onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.06)'; }}
  />
);

// ═══════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════

const PERMISSIONS = [
  'cross-canvas', 'integrations', 'storage', 'media',
  'clipboard', 'notifications', 'geolocation', 'user-state',
  'ai', 'checkout', 'auth',
] as const;

export interface LabManifestProps {
  manifest: ManifestEditor;
}

export const LabManifestComponent: React.FC<LabManifestProps> = ({ manifest }) => {
  const [jsonView, setJsonView] = useState(false);
  const [breakingChanges, setBreakingChanges] = useState<string[]>([]);
  const [, rerender] = useState(0);

  const current = manifest.getManifest();

  const updateField = useCallback((path: string, value: unknown) => {
    const prev = manifest.getManifest();
    manifest.updateField(path, value);
    const next = manifest.getManifest();

    // Check for breaking changes
    if (prev && next) {
      const changes = manifest.getBreakingChanges(prev, next);
      setBreakingChanges(changes.map((c) =>
        `${c.type === 'removed_emit' ? 'Removed emit' : 'Removed subscribe'}: ${c.portName}`
      ));
    }
    rerender((n) => n + 1);
  }, [manifest]);

  // Validation status
  const validation = manifest.validate();

  if (jsonView) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.04)',
          background: 'rgba(0,0,0,0.15)',
        }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: labPalette.textMuted, textTransform: 'uppercase', letterSpacing: '0.14em' }}>
            JSON View
          </span>
          <button
            onClick={() => setJsonView(false)}
            style={{
              padding: '3px 10px', fontSize: 10, fontWeight: 500,
              fontFamily: 'var(--sn-font-family)', color: labPalette.storm,
              background: 'rgba(78,123,142,0.08)', border: '1px solid rgba(78,123,142,0.15)',
              borderRadius: 6, cursor: 'pointer',
            }}
          >
            Form View
          </button>
        </div>
        <pre style={{
          flex: 1, margin: 0, padding: 12, overflow: 'auto',
          fontSize: 11, color: labPalette.textSoft, lineHeight: 1.6,
          fontFamily: 'var(--sn-font-mono, "DM Mono", monospace)',
        }}>
          {JSON.stringify(current, null, 2) ?? '{}'}
        </pre>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.04)',
        background: 'rgba(0,0,0,0.15)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: labPalette.textMuted, textTransform: 'uppercase', letterSpacing: '0.14em' }}>
            Manifest
          </span>
          {!validation.valid && (
            <span style={{
              fontSize: 9, color: labPalette.ember, fontWeight: 600,
              padding: '1px 6px', borderRadius: 4,
              background: 'rgba(232,128,108,0.1)',
            }}>
              {validation.errors.length} error{validation.errors.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <button
          onClick={() => setJsonView(true)}
          style={{
            padding: '3px 10px', fontSize: 10, fontWeight: 500,
            fontFamily: 'var(--sn-font-family)', color: labPalette.storm,
            background: 'rgba(78,123,142,0.08)', border: '1px solid rgba(78,123,142,0.15)',
            borderRadius: 6, cursor: 'pointer',
          }}
        >
          JSON
        </button>
      </div>

      {/* Form */}
      <div style={{ flex: 1, overflow: 'auto', padding: 12 }}>
        {breakingChanges.length > 0 && <BreakingChangeBanner changes={breakingChanges} />}

        {/* Identity */}
        <div style={{ marginBottom: 16 }}>
          <FieldLabel>Name</FieldLabel>
          <FieldInput
            value={current?.name ?? ''}
            onChange={(v) => updateField('name', v)}
            placeholder="my-widget"
            mono
          />
        </div>

        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          <div style={{ flex: 1 }}>
            <FieldLabel>Version</FieldLabel>
            <FieldInput
              value={current?.version ?? ''}
              onChange={(v) => updateField('version', v)}
              placeholder="1.0.0"
              mono
            />
          </div>
          <div style={{ flex: 1 }}>
            <FieldLabel>License</FieldLabel>
            <FieldInput
              value={current?.license ?? ''}
              onChange={(v) => updateField('license', v)}
              placeholder="MIT"
              mono
            />
          </div>
        </div>

        {/* Permissions */}
        <div style={{ marginBottom: 16 }}>
          <FieldLabel>Permissions</FieldLabel>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {PERMISSIONS.map((perm) => {
              const checked = current?.permissions?.includes(perm) ?? false;
              return (
                <label
                  key={perm}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    cursor: 'pointer', fontSize: 11, color: labPalette.textSoft,
                    fontFamily: 'var(--sn-font-family)',
                  }}
                >
                  <div
                    role="checkbox"
                    aria-checked={checked}
                    tabIndex={0}
                    onClick={() => {
                      const perms = [...(current?.permissions ?? [])];
                      if (checked) {
                        const idx = perms.indexOf(perm);
                        if (idx >= 0) perms.splice(idx, 1);
                      } else {
                        perms.push(perm);
                      }
                      updateField('permissions', perms);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        const perms = [...(current?.permissions ?? [])];
                        if (checked) {
                          const idx = perms.indexOf(perm);
                          if (idx >= 0) perms.splice(idx, 1);
                        } else {
                          perms.push(perm);
                        }
                        updateField('permissions', perms);
                      }
                    }}
                    style={{
                      width: 16, height: 16, borderRadius: 4,
                      background: checked ? 'rgba(78,123,142,0.3)' : 'rgba(255,255,255,0.04)',
                      border: `1.5px solid ${checked ? 'rgba(78,123,142,0.5)' : 'rgba(255,255,255,0.1)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: `all 300ms ${SPRING}`, outline: 'none', flexShrink: 0,
                    }}
                  >
                    {checked && <span style={{ color: '#fff', fontSize: 10, lineHeight: 1 }}>✓</span>}
                  </div>
                  {perm}
                </label>
              );
            })}
          </div>
        </div>

        {/* Validation errors */}
        {!validation.valid && (
          <div style={{ marginTop: 8 }}>
            <FieldLabel>Validation Errors</FieldLabel>
            {validation.errors.map((err, i) => (
              <div key={i} style={{
                fontSize: 10, color: labPalette.ember, lineHeight: 1.6,
                fontFamily: 'var(--sn-font-mono, "DM Mono", monospace)',
                paddingLeft: 8,
              }}>
                {err}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
