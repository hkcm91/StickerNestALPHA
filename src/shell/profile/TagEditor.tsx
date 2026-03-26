/**
 * TagEditor — inline tag editor for adding/removing tags on a canvas.
 *
 * Supports autocomplete from existing tags, max 20 tags,
 * max 50 chars each.
 *
 * @module shell/profile
 * @layer L6
 */

import React, { useCallback, useRef, useState } from 'react';

import { themeVar } from '../theme/theme-vars';

const MAX_TAGS = 20;
const MAX_TAG_LENGTH = 50;

export interface TagEditorProps {
  tags: string[];
  allTags?: string[];
  onChange: (tags: string[]) => void;
  readOnly?: boolean;
}

export const TagEditor: React.FC<TagEditorProps> = ({
  tags,
  allTags = [],
  onChange,
  readOnly = false,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions = inputValue.length > 0
    ? allTags
        .filter((t) => t.toLowerCase().includes(inputValue.toLowerCase()) && !tags.includes(t))
        .slice(0, 5)
    : [];

  const addTag = useCallback(
    (tag: string) => {
      const trimmed = tag.trim().toLowerCase();
      if (!trimmed || trimmed.length > MAX_TAG_LENGTH) return;
      if (tags.includes(trimmed) || tags.length >= MAX_TAGS) return;
      onChange([...tags, trimmed]);
      setInputValue('');
      setShowSuggestions(false);
    },
    [tags, onChange],
  );

  const removeTag = useCallback(
    (tag: string) => {
      onChange(tags.filter((t) => t !== tag));
    },
    [tags, onChange],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        addTag(inputValue);
      } else if (e.key === 'Backspace' && inputValue === '' && tags.length > 0) {
        removeTag(tags[tags.length - 1]);
      } else if (e.key === 'Escape') {
        setShowSuggestions(false);
        inputRef.current?.blur();
      }
    },
    [inputValue, tags, addTag, removeTag],
  );

  return (
    <div style={{ position: 'relative' }}>
      <div
        data-testid="tag-editor"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 4,
          padding: '6px 8px',
          borderRadius: 'var(--sn-radius, 6px)',
          border: readOnly ? 'none' : `1px solid ${themeVar('--sn-border')}`,
          background: readOnly ? 'transparent' : themeVar('--sn-surface'),
          minHeight: 32,
          alignItems: 'center',
          cursor: readOnly ? 'default' : 'text',
        }}
        onClick={() => !readOnly && inputRef.current?.focus()}
      >
        {tags.map((tag) => (
          <span
            key={tag}
            data-testid="tag-chip"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '2px 8px',
              borderRadius: 10,
              background: themeVar('--sn-surface-raised'),
              color: themeVar('--sn-text-muted'),
              fontSize: 12,
              fontWeight: 500,
            }}
          >
            {tag}
            {!readOnly && (
              <button
                onClick={(e) => { e.stopPropagation(); removeTag(tag); }}
                data-testid="tag-remove"
                style={{
                  border: 'none',
                  background: 'none',
                  color: 'inherit',
                  cursor: 'pointer',
                  padding: 0,
                  fontSize: 14,
                  lineHeight: 1,
                  opacity: 0.6,
                }}
              >
                x
              </button>
            )}
          </span>
        ))}

        {!readOnly && tags.length < MAX_TAGS && (
          <input
            ref={inputRef}
            data-testid="tag-input"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setShowSuggestions(true);
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            placeholder={tags.length === 0 ? 'Add tags...' : ''}
            style={{
              border: 'none',
              outline: 'none',
              background: 'transparent',
              color: themeVar('--sn-text'),
              fontSize: 12,
              fontFamily: 'inherit',
              flex: 1,
              minWidth: 60,
              padding: '2px 0',
            }}
          />
        )}
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          data-testid="tag-suggestions"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: 4,
            borderRadius: 'var(--sn-radius, 6px)',
            border: `1px solid ${themeVar('--sn-border')}`,
            background: themeVar('--sn-surface'),
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            zIndex: 10,
            overflow: 'hidden',
          }}
        >
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              onMouseDown={(e) => {
                e.preventDefault();
                addTag(suggestion);
              }}
              style={{
                display: 'block',
                width: '100%',
                padding: '6px 12px',
                border: 'none',
                background: 'transparent',
                color: themeVar('--sn-text'),
                fontSize: 12,
                fontFamily: 'inherit',
                textAlign: 'left',
                cursor: 'pointer',
              }}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
