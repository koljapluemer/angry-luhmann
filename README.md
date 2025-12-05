# Angry Luhmann

Angry Luhmann is an Obsidian plugin that helps you work with a Luhmann-style Zettelkasten using stable `zk-id` frontmatter values. It builds a navigable tree view of your notes, keeps ids consistent, and provides commands to place notes quickly.

## Architecture

```
src/
├── core/                  # Core logic and data structures
│   ├── types.ts          # ZkEntry, ZkNode, RenderedZkLine interfaces
│   ├── tree.ts           # buildZkTree(), renderZkTree(), getDepthFirstOrder()
│   └── data.ts           # collectZkEntries(), findNext*Id() functions
├── ui/
│   ├── views/
│   │   └── TreeView.ts   # Main tree view component, rendering, collapse/expand
│   └── modals/
│       ├── PlaceChildModal.ts      # Parent selection modal
│       └── ConfirmationModal.ts    # Confirmation dialogs
├── commands/
│   ├── index.ts                    # Command registration
│   ├── placeNoteAtEnd.ts          # Place note at end command
│   ├── placeNoteAsChild.ts        # Place as child command
│   ├── createChildNote.ts         # Create child note command
│   ├── createFollowingNote.ts     # Create following note command
│   ├── addNavigationLinks.ts      # Bulk add navigation links
│   └── utils.ts                    # Command utilities (file path generation, link processing)
├── utils/
│   ├── constants.ts      # VIEW_TYPE_ZK_TREE, EMPTY_STATE_TEXT
│   └── navigationLinks.ts # Navigation link generation/removal
├── settings/
│   └── index.ts          # Settings interface and tab
└── plugin.ts             # Main plugin class, lifecycle, tree refresh orchestration

main.ts                   # Entry point (imports from src/)
```

## What it does

- Scans your vault for notes with a `zk-id` frontmatter field (`1`, `2.0.1`, etc.) and renders a plaintext-style tree in a right sidebar view. Entries are clickable to open the note.
- Keeps the tree up to date when files change.
- Auto-expands parents and scrolls to active file in tree view.

## Commands

- `Place this note at the end of the Zettelkasten`: gives the active note the next top-level `zk-id`.
- `Place note as child of...`: search existing `zk-id` notes and assign the active note the next child id under the selected parent.
- `Create Child`: creates a new note as the next child of the current `zk-id` note and opens it.
- `Create Following Note`: creates a new note as the next available sibling of the current `zk-id` note and opens it.
- `Add id-based links to all notes`: generates navigation links (prev/next) for all zk-id notes in tree order.

## Installation (dev)

1. `npm install`
2. `npm run dev` (watch) or `npm run build` (production)
3. Copy `main.js`, `manifest.json`, and `styles.css` into your vault at `.obsidian/plugins/angry-luhmann/`, then reload plugins in Obsidian.
