/**
 * StreamingPreview — Loading screen during generation, live iframe on completion.
 *
 * During generation: shows an animated loading screen with pulsing glow.
 * On completion: renders the final widget HTML in an iframe.
 * Stays visible until the user starts a new generation or navigates away.
 *
 * @module lab/components
 * @layer L2
 */

import React from 'react';

import { HEX, hexToRgb, SPRING } from './shared/palette';

const [er, eg, eb] = hexToRgb(HEX.ember);
const [sr, sg, sb] = hexToRgb(HEX.storm);

// ═══════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════

export interface StreamingPreviewProps {
  /** Final HTML to render (only used when done=true) */
  html: string;
  /** Whether generation is complete */
  done: boolean;
  /** Error message to display instead of the widget */
  error?: string | null;
}

// ═══════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════

export const StreamingPreview: React.FC<StreamingPreviewProps> = ({
  html,
  done,
  error,
}) => {
  // Check if the final HTML looks valid enough to render
  const hasValidHtml = done && html && (
    /<html[\s>]/i.test(html) || /<body[\s>]/i.test(html) || /<div[\s>]/i.test(html)
  );

  // Build the srcdoc — wrap in a minimal page if not already a full document
  const srcdoc = hasValidHtml
    ? (html.includes('<html') || html.includes('<!DOCTYPE')
      ? html
      : `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
          body { margin: 0; padding: 16px; font-family: system-ui, sans-serif;
                 background: #0A0A0E; color: #E8E4E0; }
        </style></head><body>${html}</body></html>`)
    : '';

  const showError = done && (error || (!hasValidHtml && html));

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 5,
        padding: 32,
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 480,
          height: '100%',
          maxHeight: 400,
          borderRadius: 14,
          overflow: 'hidden',
          background: '#0A0A0E',
          border: done
            ? '1px solid rgba(255,255,255,0.08)'
            : `1px solid rgba(${er},${eg},${eb},0.3)`,
          boxShadow: done
            ? '0 4px 24px rgba(0,0,0,0.3)'
            : `0 0 20px rgba(${er},${eg},${eb},0.12), 0 4px 24px rgba(0,0,0,0.3)`,
          animation: done ? undefined : 'sn-streaming-glow 2s ease-in-out infinite',
          transition: `all 400ms ${SPRING}`,
        }}
      >
        {/* Progress bar — slides across the top while generating */}
        {!done && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 2,
              overflow: 'hidden',
              zIndex: 2,
            }}
          >
            <div
              style={{
                width: '40%',
                height: '100%',
                background: `linear-gradient(90deg, transparent 0%, rgba(${er},${eg},${eb},0.6) 50%, transparent 100%)`,
                animation: 'sn-streaming-bar 1.5s ease-in-out infinite',
              }}
            />
          </div>
        )}

        {/* Loading screen — shown during generation */}
        {!done && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 16,
              zIndex: 1,
            }}
          >
            {/* Animated widget silhouette */}
            <div style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              border: `2px solid rgba(${er},${eg},${eb},0.3)`,
              animation: 'sn-loading-pulse 2s ease-in-out infinite',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <div style={{
                width: 20,
                height: 20,
                borderRadius: 6,
                background: `rgba(${er},${eg},${eb},0.15)`,
                animation: 'sn-loading-pulse 2s ease-in-out infinite 0.3s',
              }} />
            </div>

            <div style={{
              color: `rgba(${er},${eg},${eb},0.5)`,
              fontSize: 12,
              fontFamily: 'var(--sn-font-family)',
              letterSpacing: '0.04em',
              animation: 'sn-loading-text 2s ease-in-out infinite',
            }}>
              Building widget...
            </div>

            {/* Fake progress lines */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              width: 140,
              marginTop: 8,
            }}>
              {[100, 80, 60].map((w, i) => (
                <div key={i} style={{
                  height: 3,
                  borderRadius: 2,
                  background: `rgba(${sr},${sg},${sb},0.12)`,
                  width: `${w}%`,
                  animation: `sn-loading-line 1.5s ease-in-out infinite ${i * 0.2}s`,
                }} />
              ))}
            </div>
          </div>
        )}

        {/* Error state — model returned non-HTML */}
        {showError && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              padding: 32,
              animation: `sn-fade-in 400ms ${SPRING} both`,
            }}
          >
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              border: `2px solid rgba(${er},${eg},${eb},0.3)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
            }}>
              !
            </div>
            <div style={{
              color: `rgba(${er},${eg},${eb},0.7)`,
              fontSize: 12,
              fontFamily: 'var(--sn-font-family)',
              textAlign: 'center',
              lineHeight: 1.5,
              maxWidth: 280,
            }}>
              {error ?? 'The model returned text instead of HTML. Try a different model or refine your prompt.'}
            </div>
          </div>
        )}

        {/* Final rendered widget — only shown when done with valid HTML */}
        {done && srcdoc && !showError && (
          <iframe
            srcDoc={srcdoc}
            sandbox="allow-scripts"
            title="Widget preview"
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              background: '#0A0A0E',
              animation: `sn-fade-in 400ms ${SPRING} both`,
            }}
          />
        )}
      </div>

      {/* Keyframes */}
      <style>{`
        @keyframes sn-streaming-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(${er},${eg},${eb},0.08), 0 4px 24px rgba(0,0,0,0.3); }
          50% { box-shadow: 0 0 28px rgba(${er},${eg},${eb},0.18), 0 4px 24px rgba(0,0,0,0.3); }
        }
        @keyframes sn-streaming-bar {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        @keyframes sn-loading-pulse {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.05); }
        }
        @keyframes sn-loading-text {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }
        @keyframes sn-loading-line {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.6; }
        }
        @keyframes sn-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
};
