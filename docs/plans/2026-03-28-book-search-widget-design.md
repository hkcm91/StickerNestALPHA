# Book Search Widget — Design

**Date**: 2026-03-28
**Status**: Approved

## Context

Users need a way to search for books and build reading lists within their StickerNest canvases. This widget uses the Open Library API (free, no key, CORS-enabled) for search and the StickerNest DataSource table API for persistent storage. Users can select or create a DataSource table to save books to.

## Widget Identity

| Field | Value |
|---|---|
| ID | `wgt-book-search` |
| Name | Book Search |
| Category | `productivity` |
| Permissions | `storage`, `datasource`, `datasource-write` |
| Default size | 380 x 500 |
| License | MIT |
| Tags | `books`, `reading`, `library`, `search` |

## UI Sections

### 1. Database Selector (top bar)
- Dropdown of user's existing table DataSources via `StickerNest.datasource.list({ type: 'table' })`
- "Create new..." option creates a `table` DataSource named "My Books" scoped to `canvas`
- Selected `dataSourceId` persisted to widget instance state via `StickerNest.setState('dataSourceId', id)`

### 2. Search Bar
- Text input + search button
- Debounced 300ms, min 2 characters
- Endpoint: `https://openlibrary.org/search.json?q={query}&limit=10`
- Loading: shimmer/pulse state on result cards

### 3. Results List
- Scrollable card list: cover thumbnail, title, author(s), year
- Cover: `https://covers.openlibrary.org/b/olid/{olid}-M.jpg` (fallback: book icon placeholder)
- "Add" button per card
- Staggered entry animation (80ms between cards)

### 4. Add Action
- Writes row to selected DataSource table via `StickerNest.datasource.table.addRow()`
- Row schema: `{ title, authors, year, isbn, coverUrl, openLibraryId }`
- Duplicate check by `openLibraryId` via `StickerNest.datasource.table.getRows()`
- Visual: brief green check, then button returns to default
- Emits `book.added` bus event with book data

## Data Flow

```
User types query
  -> debounce 300ms
  -> fetch('https://openlibrary.org/search.json?q=...')
  -> parse response, map to book cards
  -> user clicks "Add"
  -> check duplicates via getRows()
  -> addRow() to selected DataSource
  -> emit('book.added', bookData)
```

## Styling

- Dark Obsidian theme: `ground` (#110E14) bg, `glass` surfaces, `storm` (#6BA4B8) accent
- `backdrop-filter: blur(20px) saturate(1.2)` on card surfaces
- Spring easing: `cubic-bezier(0.16, 1, 0.3, 1)`
- Font: `var(--sn-font-family)` (Outfit)
- All contrast 4.5:1+ on dark ground
- Focus rings: `box-shadow: 0 0 0 2px rgba(107,164,184,0.3)`

## Error States

- Network error: warm nudge ("Couldn't reach Open Library")
- No results: invitation ("No books found. Try a different term.")
- Write failure: toast at widget bottom
- No database selected: prompt to select or create one

## Technical Notes

- Single-file HTML widget format (HTML + CSS + JS in one file)
- Direct `fetch()` to Open Library (public CORS API, no integration proxy needed)
- SDK methods used: `register`, `ready`, `setState`, `getState`, `datasource.list`, `datasource.create`, `datasource.table.addRow`, `datasource.table.getRows`, `emit`, `onThemeChange`, `onResize`
- Manifest declares emits: `book.added` port

## Event Contract

```json
{
  "emits": [{ "name": "book.added", "description": "Emitted when a book is added to the database" }],
  "subscribes": []
}
```
