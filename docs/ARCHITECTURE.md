# Architecture Documentation

## Overview

Angry Luhmann is an Obsidian plugin that manages a Zettelkasten note system with hierarchical IDs. This document describes the core architecture, focusing on the `ZkEntryCache` system that provides efficient data management.

## Data Flow

```
                    ┌─────────────────────┐
                    │    File Events      │
                    │ (create/modify/     │
                    │  delete/rename)     │
                    └─────────┬───────────┘
                              │
                              ▼
                    ┌─────────────────────┐
                    │    ZkEntryCache     │◄──── Single Source of Truth
                    │                     │
                    │  - entriesById      │ (O(1) lookup by zk-id)
                    │  - entriesByPath    │ (O(1) lookup by path)
                    │  - compiledPatterns │ (pre-compiled minimatch)
                    └─────────┬───────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
              ▼               ▼               ▼
      ┌───────────┐   ┌───────────┐   ┌───────────┐
      │ TreeView  │   │ Commands  │   │ Overview  │
      │           │   │           │   │   Note    │
      └───────────┘   └───────────┘   └───────────┘
```

## ZkEntryCache

The `ZkEntryCache` class (`src/core/ZkEntryCache.ts`) is the central data store for all ZK entries. It provides:

### O(1) Lookup Maps

- `entriesById: Map<string, CachedEntry>` - Lookup by zk-id
- `entriesByPath: Map<string, CachedEntry>` - Lookup by file path

### Cached Derived Data

- `allEntriesCache: ZkEntry[] | null` - Array of all entries (lazy computed)
- `maxTopLevelIdCache: number | null` - Maximum top-level ID (lazy computed)

### Compiled Patterns

- `compiledPatterns: Minimatch[]` - Pre-compiled glob patterns for include/exclude filtering

### Key Methods

| Method | Description | Complexity |
|--------|-------------|------------|
| `rebuild()` | Full cache rebuild | O(n) - only on startup/settings change |
| `updateFile()` | Incremental file update | O(1) |
| `removeFile()` | Remove file from cache | O(1) |
| `getEntries()` | Get all entries | O(1) cached |
| `hasZkId()` | Check if zk-id exists | O(1) |
| `getEntryByZkId()` | Get entry by zk-id | O(1) |
| `findNextTopLevelId()` | Next available top-level ID | O(1) cached |
| `findNextChildId()` | Next child ID for parent | O(m) where m = children count |
| `findNextFollowingId()` | Next sibling ID | O(1) average |
| `hasValidZkPlacement()` | Check if note is properly placed | O(1) |

## Cache Invalidation Rules

| Event | Action |
|-------|--------|
| Plugin load | `rebuild()` |
| Settings change (patterns/mode) | `rebuild()` via `updatePatterns()` |
| File create | `updateFile(file)` |
| File modify | `updateFile(file)` |
| File delete | `removeFile(path)` |
| File rename | `renameFile(oldPath, newFile)` |

## Performance Characteristics

### Before Cache Implementation

| Operation | Complexity |
|-----------|------------|
| Single file change | ~20,000 file iterations (2 full scans) |
| `hasNoteWithZkId()` | O(n) vault scan |
| `findNextTopLevelId()` | O(n) vault scan |
| Pattern matching | n * m minimatch calls per scan |

### After Cache Implementation

| Operation | Complexity |
|-----------|------------|
| Single file change | 1 file check + O(1) map ops |
| `hasNoteWithZkId()` | O(1) map lookup |
| `findNextTopLevelId()` | O(1) cached value |
| Pattern matching | m compilations (cached), O(m) per file |

## TreeView Optimization

The `ZkTreeView` class maintains its own `zkIdToPath` map for O(1) lookups when expanding parent nodes:

```typescript
private zkIdToPath: Map<string, string> = new Map();

setTree(lines, emptyState) {
  this.zkIdToPath.clear();
  for (const line of lines) {
    const zkId = this.getZkId(line.file.path);
    if (zkId) {
      this.zkIdToPath.set(zkId, line.file.path);
    }
  }
}
```

## Guidelines for Future Development

### When Adding New Features

1. **Use the cache** - Always access ZK entries through `plugin.zkCache` methods
2. **Avoid vault scans** - Never iterate `app.vault.getMarkdownFiles()` in frequently-called code
3. **Prefer O(1) lookups** - Use `hasZkId()` or `getEntryByZkId()` instead of filtering arrays

### When Modifying Cache Behavior

1. **Keep incremental updates fast** - `updateFile()` should remain O(1)
2. **Invalidate derived data** - Call `invalidateDerivedData()` when entries change
3. **Test with large vaults** - Profile with 10,000+ files to verify performance

### Adding New Queries

If you need a new type of query:

1. Check if it can use existing cached data
2. If not, consider adding a new cached derived value
3. Ensure the cache is invalidated appropriately when entries change

## File Structure

```
src/
├── core/
│   ├── ZkEntryCache.ts   # Centralized cache (single source of truth)
│   ├── data.ts           # Thin wrappers delegating to cache
│   ├── types.ts          # ZkEntry, CachedEntry, ZkNode types
│   ├── tree.ts           # Tree building logic
│   └── overview.ts       # Overview note generation
├── plugin.ts             # Plugin entry point, owns ZkEntryCache
├── commands/             # All commands use plugin.zkCache
├── settings/             # Settings UI, triggers cache rebuild on pattern change
├── ui/
│   └── views/
│       └── TreeView.ts   # Tree view with its own zkId-to-path map
└── utils/
    ├── constants.ts
    └── patterns.ts       # Pattern utilities (used by reportIllegalNotes)
```
