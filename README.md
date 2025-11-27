# Angry Luhmann

Angry Luhmann is an Obsidian plugin that helps you work with a Luhmann-style Zettelkasten using stable `zk-id` frontmatter values. It builds a navigable tree view of your notes, keeps ids consistent, and provides commands to place notes quickly.

## What it does

- Scans your vault for notes with a `zk-id` frontmatter field (`1`, `2.0.1`, etc.) and renders a plaintext-style tree in a right sidebar view. Entries are clickable to open the note.
- Warns when it encounters invalid, duplicate, or orphaned ids, and can optionally log ids/errors to `angry-luhmann-debug.md`.
- Keeps the tree up to date when files change, with a manual refresh button in the view.

## Commands

- `Place this note at the end of the Zettelkasten`: gives the active note the next top-level `zk-id`. If it already has an id, it does nothing and shows a notice.
- `Place note as child of...`: search existing `zk-id` notes (paginated to 20 results) and assign the active note the next child id under the selected parent. Skips notes that already have an id.
- `Create Child`: creates a new note as the next child of the current `zk-id` note (frontmatter prefilled with the id) and opens it.
- `Create Following Note`: creates a new note as the next available sibling of the current `zk-id` note, skipping occupied ids, then opens it.

## Debug note

Enable **Use Debug Note** in plugin settings to keep `angry-luhmann-debug.md` updated with:
- A list of notes that have `zk-id` values.
- A list of errors encountered during tree building.

## Installation (dev)

1. `npm install`
2. `npm run dev` (watch) or `npm run build` (production)
3. Copy `main.js`, `manifest.json`, and `styles.css` into your vault at `.obsidian/plugins/angry-luhmann/`, then reload plugins in Obsidian.
