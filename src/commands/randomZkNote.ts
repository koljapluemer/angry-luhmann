import { Notice } from "obsidian";
import type AngryLuhmannPlugin from "../plugin";
import { collectZkEntries } from "../core/data";

export async function openRandomZkNote(plugin: AngryLuhmannPlugin) {
	const entries = collectZkEntries(plugin.app, plugin.settings.excludePatterns);

	if (entries.length === 0) {
		new Notice("No Zettelkasten notes found");
		return;
	}

	// Select random entry
	const randomIndex = Math.floor(Math.random() * entries.length);
	const randomEntry = entries[randomIndex];

	// Open the file
	await plugin.app.workspace.getLeaf(false).openFile(randomEntry.file);

	new Notice(`Opened: ${randomEntry.file.basename} (${randomEntry.id})`);
}
