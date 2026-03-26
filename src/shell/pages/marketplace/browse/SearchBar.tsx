/**
 * SearchBar — search input, category filter, and sort selector.
 *
 * @module shell/pages/marketplace/browse
 * @layer L6
 */

import React, { useCallback } from 'react';

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
      style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}
    >
      <input
        type="text"
        placeholder="Search widgets..."
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        onKeyDown={handleKeyDown}
        style={{ ...inputStyle, flex: 1, minWidth: '200px' }}
        data-testid="marketplace-search"
      />
      <select
        value={category}
        onChange={(e) => onCategoryChange(e.target.value)}
        style={selectStyle}
        data-testid="marketplace-category"
      >
        {CATEGORIES.map((cat) => (
          <option key={cat.value} value={cat.value}>
            {cat.label}
          </option>
        ))}
      </select>
      <select
        value={sortBy}
        onChange={(e) => onSortChange(e.target.value as SortBy)}
        style={selectStyle}
        data-testid="marketplace-sort"
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
