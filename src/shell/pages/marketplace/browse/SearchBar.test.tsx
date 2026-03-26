/**
 * SearchBar tests
 * @vitest-environment happy-dom
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { SearchBar } from './SearchBar';

const baseProps = {
  query: '',
  category: '',
  sortBy: 'newest' as const,
  onQueryChange: vi.fn(),
  onCategoryChange: vi.fn(),
  onSortChange: vi.fn(),
  onSearch: vi.fn(),
};

describe('SearchBar', () => {
  it('renders search input, category select, and sort select', () => {
    render(<SearchBar {...baseProps} />);
    expect(screen.getByTestId('marketplace-search')).toBeTruthy();
    expect(screen.getByTestId('marketplace-category')).toBeTruthy();
    expect(screen.getByTestId('marketplace-sort')).toBeTruthy();
  });

  it('calls onQueryChange when typing in search', () => {
    const onQueryChange = vi.fn();
    render(<SearchBar {...baseProps} onQueryChange={onQueryChange} />);
    fireEvent.change(screen.getByTestId('marketplace-search'), {
      target: { value: 'counter' },
    });
    expect(onQueryChange).toHaveBeenCalledWith('counter');
  });

  it('calls onSearch on Enter key', () => {
    const onSearch = vi.fn();
    render(<SearchBar {...baseProps} onSearch={onSearch} />);
    fireEvent.keyDown(screen.getByTestId('marketplace-search'), { key: 'Enter' });
    expect(onSearch).toHaveBeenCalled();
  });

  it('calls onCategoryChange when selecting a category', () => {
    const onCategoryChange = vi.fn();
    render(<SearchBar {...baseProps} onCategoryChange={onCategoryChange} />);
    fireEvent.change(screen.getByTestId('marketplace-category'), {
      target: { value: 'productivity' },
    });
    expect(onCategoryChange).toHaveBeenCalledWith('productivity');
  });

  it('calls onSortChange when changing sort', () => {
    const onSortChange = vi.fn();
    render(<SearchBar {...baseProps} onSortChange={onSortChange} />);
    fireEvent.change(screen.getByTestId('marketplace-sort'), {
      target: { value: 'rating' },
    });
    expect(onSortChange).toHaveBeenCalledWith('rating');
  });
});
