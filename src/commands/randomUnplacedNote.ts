import { Notice } from "obsidian";
import type AngryLuhmannPlugin from "../plugin";
import { isFileExcluded } from "../utils/patterns";

export async function openRandomUnplacedNote(plugin: AngryLuhmannPlugin) {
	const unplacedNotes = [];

	// Find all markdown files that don't have a zk-id
	for (const file of plugin.app.vault.getMarkdownFiles()) {
		// Skip files matching exclude patterns
		if (isFileExcluded(file, plugin.settings.excludePatterns)) {
			continue;
		}

		const cache = plugin.app.metadataCache.getFileCache(file);
		const zkId = cache?.frontmatter?.["zk-id"];

		// Include only notes with no zk-id at all (not even -1)
		if (zkId === undefined) {
			unplacedNotes.push(file);
		}
	}

	if (unplacedNotes.length === 0) {
		new Notice("No unplaced notes found");
		return;
	}

	// Select random unplaced note
	const randomIndex = Math.floor(Math.random() * unplacedNotes.length);
	const randomNote = unplacedNotes[randomIndex];

	// Open the file
	await plugin.app.workspace.getLeaf(false).openFile(randomNote);

	new Notice(`Opened unplaced note: ${randomNote.basename}`);
}
