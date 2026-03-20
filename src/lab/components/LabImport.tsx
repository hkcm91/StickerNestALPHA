/**
 * LabImport — Widget fork dialog.
 *
 * Modal dialog for importing marketplace widgets into Lab.
 * Shows license badge, fork button (gated by license), and
 * fork indicator after import.
 *
 * @module lab/components
 * @layer L2
 */

import React, { useCallback, useState } from 'react';

import { checkLicense, importWidget } from '../import/widget-importer';
import type { WidgetListing, ImportOutcome } from '../import/widget-importer';

import { labPalette, SPRING } from './shared/palette';

// ═══════════════════════════════════════════════════════════════════
// License Badge
// ═══════════════════════════════════════════════════════════════════

const LicenseBadge: React.FC<{ license: string }> = ({ license }) => {
  const isForkable = checkLicense(license as any);
  const color = isForkable ? labPalette.moss : labPalette.ember;
  const bgAlpha = isForkable ? '0.08' : '0.08';
  const borderAlpha = isForkable ? '0.2' : '0.2';

  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px', fontSize: 10, fontWeight: 600,
      fontFamily: 'var(--sn-font-mono, "DM Mono", monospace)',
      color,
      background: `rgba(${isForkable ? '90,168,120' : '232,128,108'},${bgAlpha})`,
      border: `1px solid rgba(${isForkable ? '90,168,120' : '232,128,108'},${borderAlpha})`,
      borderRadius: 4,
    }}>
      {license}
    </span>
  );
};

// ═══════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════

export interface LabImportProps {
  listings: WidgetListing[];
  onImport?: (result: ImportOutcome) => void;
  onClose?: () => void;
}

export const LabImportComponent: React.FC<LabImportProps> = ({
  listings,
  onImport,
  onClose,
}) => {
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [imported, setImported] = useState<string | null>(null);

  const filtered = listings.filter((l) =>
    l.manifest.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleFork = useCallback((listing: WidgetListing) => {
    setError(null);
    const result = importWidget(listing);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setImported(listing.widgetId);
    onImport?.(result);
  }, [onImport]);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)',
    }}>
      <div style={{
        width: 480, maxHeight: '70vh',
        display: 'flex', flexDirection: 'column',
        borderRadius: 14,
        background: 'var(--sn-surface-glass, rgba(20,17,24,0.75))',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.06)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        animation: `sn-unfold 300ms ${SPRING} both`,
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '12px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
          background: 'rgba(0,0,0,0.15)',
        }}>
          <span style={{
            fontSize: 13, fontWeight: 600, color: labPalette.text,
            fontFamily: 'var(--sn-font-family)',
          }}>
            Import Widget
          </span>
          <button
            onClick={onClose}
            aria-label="Close import dialog"
            style={{
              padding: '2px 6px', fontSize: 14,
              color: labPalette.textMuted, background: 'none',
              border: 'none', cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: '10px 16px' }}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search widgets..."
            aria-label="Search widgets"
            style={{
              width: '100%', padding: '8px 12px', fontSize: 12,
              fontFamily: 'var(--sn-font-family)',
              color: labPalette.text,
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 8, outline: 'none',
              boxSizing: 'border-box',
              transition: `border-color 300ms ${SPRING}`,
            }}
            onFocus={(e) => { e.target.style.borderColor = 'rgba(78,123,142,0.3)'; }}
            onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.06)'; }}
          />
        </div>

        {/* Error banner */}
        {error && (
          <div style={{
            margin: '0 16px 8px', padding: '8px 12px',
            borderRadius: 8,
            background: 'rgba(232,128,108,0.06)',
            border: '1px solid rgba(232,128,108,0.2)',
            fontSize: 11, color: labPalette.ember,
            fontFamily: 'var(--sn-font-family)',
          }}>
            {error}
          </div>
        )}

        {/* Listing */}
        <div style={{ flex: 1, overflow: 'auto', padding: '0 16px 12px' }}>
          {filtered.length === 0 ? (
            <div style={{
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              padding: '32px 0', gap: 8,
            }}>
              <div style={{
                fontSize: 28, opacity: 0.15,
                fontFamily: 'var(--sn-font-serif, Newsreader, Georgia, serif)',
              }}>
                ◇
              </div>
              <div style={{
                fontSize: 12, color: labPalette.textFaint,
                fontFamily: 'var(--sn-font-family)',
              }}>
                No widgets found
              </div>
            </div>
          ) : (
            filtered.map((listing) => {
              const canFork = checkLicense(listing.manifest.license);
              const isImported = imported === listing.widgetId;

              return (
                <div
                  key={listing.widgetId}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 12px', borderRadius: 8,
                    border: '1px solid rgba(255,255,255,0.04)',
                    marginBottom: 6,
                    background: isImported
                      ? 'rgba(90,168,120,0.04)'
                      : 'rgba(255,255,255,0.01)',
                    transition: `background 150ms`,
                  }}
                >
                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      marginBottom: 4,
                    }}>
                      <span style={{
                        fontSize: 12, fontWeight: 600, color: labPalette.text,
                        fontFamily: 'var(--sn-font-family)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {listing.manifest.name}
                      </span>
                      <LicenseBadge license={listing.manifest.license} />
                      {isImported && (
                        <span style={{
                          fontSize: 9, fontWeight: 600, color: labPalette.moss,
                          padding: '1px 6px', borderRadius: 4,
                          background: 'rgba(90,168,120,0.1)',
                        }}>
                          Forked
                        </span>
                      )}
                    </div>
                    <div style={{
                      fontSize: 10, color: labPalette.textMuted,
                      fontFamily: 'var(--sn-font-family)',
                    }}>
                      v{listing.manifest.version}
                    </div>
                  </div>

                  {/* Fork button */}
                  <button
                    onClick={() => handleFork(listing)}
                    disabled={!canFork || isImported}
                    aria-label={
                      !canFork
                        ? `Cannot fork: ${listing.manifest.license} license`
                        : isImported
                          ? 'Already forked'
                          : `Fork ${listing.manifest.name}`
                    }
                    style={{
                      padding: '6px 14px', fontSize: 11, fontWeight: 500,
                      fontFamily: 'var(--sn-font-family)',
                      color: canFork && !isImported ? '#fff' : labPalette.textMuted,
                      background: canFork && !isImported
                        ? labPalette.storm
                        : 'rgba(255,255,255,0.04)',
                      border: canFork && !isImported
                        ? 'none'
                        : '1px solid rgba(255,255,255,0.06)',
                      borderRadius: 6,
                      cursor: canFork && !isImported ? 'pointer' : 'not-allowed',
                      opacity: canFork && !isImported ? 1 : 0.5,
                      flexShrink: 0,
                      transition: `all 200ms ${SPRING}`,
                    }}
                  >
                    {isImported ? 'Forked' : !canFork ? 'No Fork' : 'Fork to Lab'}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
