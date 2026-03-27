/**
 * SearchBar — search input with icon, category filter, and sort selector.
 *
 * @module shell/pages/marketplace/browse
 * @layer L6
 */

import React, { useCallback } from 'react';

import { themeVar } from '../../../theme/theme-vars';
import { CATEGORIES, inputStyle, selectStyle, SORT_OPTIONS, type SortBy } from '../styles';

export interface SearchBarProps {
  query: string;
  category: string;
  sortBy: SortBy;
  onQueryChange: (query: string) => void;
  onCategoryChange: (category: string) => void;
  onSortChange: (sort: SortBy) => void;
  onSearch: () => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  query,
  category,
  sortBy,
  onQueryChange,
  onCategoryChange,
  onSortChange,
  onSearch,
}) => {
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') onSearch();
    },
    [onSearch],
  );

  return (
    <div
      data-testid="marketplace-search-bar"
      style={{
        display: 'flex',
        gap: '8px',
        flexWrap: 'wrap',
        alignItems: 'center',
      }}
    >
      <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
        {/* Search icon */}
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          style={{
            position: 'absolute',
            left: '10px',
            top: '50%',
            transform: 'translateY(-50%)',
            pointerEvents: 'none',
          }}
        >
          <circle cx="6.5" cy="6.5" r="5" stroke={themeVar('--sn-text-muted')} strokeWidth="1.5" fill="none" />
          <line x1="10.5" y1="10.5" x2="15" y2="15" stroke={themeVar('--sn-text-muted')} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <input
          type="text"
          data-testid="marketplace-search-input"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search widgets..."
          style={{
            ...inputStyle,
            paddingLeft: '34px',
            width: '100%',
            boxSizing: 'border-box' as const,
          }}
        />
      </div>

      <select
        data-testid="marketplace-category-select"
        value={category}
        onChange={(e) => onCategoryChange(e.target.value)}
        style={selectStyle}
      >
        {CATEGORIES.map((cat) => (
          <option key={cat.value} value={cat.value}>
            {cat.label}
          </option>
        ))}
      </select>

      <select
        data-testid="marketplace-sort-select"
        value={sortBy}
        onChange={(e) => onSortChange(e.target.value as SortBy)}
        style={selectStyle}
      >
        {SORT_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
};
      