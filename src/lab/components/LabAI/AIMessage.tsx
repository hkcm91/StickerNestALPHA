/**
 * AIMessage — Single message bubble in the AI Companion thread.
 *
 * User messages: right-aligned, subtle surface.
 * AI messages: left-aligned, frosted glass with opal accent border.
 * Code blocks: DM Mono font with "Apply" button.
 *
 * @module lab/components/LabAI
 * @layer L2
 */

import React, { useState } from 'react';

import { labPalette, SPRING } from '../shared/palette';

export interface AIMessageData {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  codeBlock?: string;
  timestamp: number;
}

export interface AIMessageProps {
  message: AIMessageData;
  onApplyCode?: (code: string) => void;
}

export const AIMessage: React.FC<AIMessageProps> = ({
  message,
  onApplyCode,
}) => {
  const [applyHovered, setApplyHovered] = useState(false);
  const isUser = message.role === 'user';

  return (
    <div style={{
      display: 'flex',
      justifyContent: isUser ? 'flex-end' : 'flex-start',
      padding: '4px 0',
    }}>
      <div style={{
        maxWidth: '85%',
        padding: '10px 14px',
        borderRadius: 12,
        background: isUser
          ? 'rgba(255,255,255,0.04)'
          : 'rgba(20,17,24,0.85)',
        backdropFilter: isUser ? undefined : 'blur(16px)',
        border: isUser
          ? '1px solid rgba(255,255,255,0.06)'
          : '1px solid rgba(176,208,216,0.12)',
        boxShadow: isUser
          ? 'none'
          : '0 0 8px rgba(176,208,216,0.06)',
        animation: `sn-drift-up 300ms ${SPRING} both`,
      }}>
        {/* Text content */}
        <div style={{
          fontSize: 12, lineHeight: 1.6,
          color: labPalette.textSoft,
          fontFamily: 'var(--sn-font-family)',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}>
          {message.content}
        </div>

        {/* Code block */}
        {message.codeBlock && (
          <div style={{
            marginTop: 8, borderRadius: 8,
            background: 'rgba(0,0,0,0.3)',
            border: '1px solid rgba(255,255,255,0.04)',
            overflow: 'hidden',
          }}>
            <pre style={{
              margin: 0, padding: '10px 12px',
              fontSize: 11, lineHeight: 1.5,
              color: labPalette.textSoft,
              fontFamily: 'var(--sn-font-mono, "DM Mono", monospace)',
              overflow: 'auto', maxHeight: 200,
              whiteSpace: 'pre-wrap',
            }}>
              {message.codeBlock}
            </pre>

            {onApplyCode && (
              <div style={{
                padding: '6px 12px',
                borderTop: '1px solid rgba(255,255,255,0.04)',
                display: 'flex', justifyContent: 'flex-end',
              }}>
                <button
                  onClick={() => onApplyCode(message.codeBlock!)}
                  onMouseEnter={() => setApplyHovered(true)}
                  onMouseLeave={() => setApplyHovered(false)}
                  aria-label="Apply code to editor"
                  style={{
                    padding: '4px 12px', fontSize: 10, fontWeight: 500,
                    fontFamily: 'var(--sn-font-family)',
                    color: '#fff',
                    background: applyHovered
                      ? 'rgba(78,123,142,0.4)'
                      : 'rgba(78,123,142,0.25)',
                    border: '1px solid rgba(78,123,142,0.3)',
                    borderRadius: 6, cursor: 'pointer',
                    transition: `all 200ms ${SPRING}`,
                  }}
                >
                  Apply
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
