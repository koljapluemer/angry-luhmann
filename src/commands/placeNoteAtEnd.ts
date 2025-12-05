import { Notice, TFile } from "obsidian";
import type AngryLuhmannPlugin from "../plugin";
import { findNextTopLevelId } from "../core/data";

export async function placeNoteAtEnd(plugin: AngryLuhmannPlugin, file: TFile) {
	const cache = plugin.app.metadataCache.getFileCache(file);
	const existingId = cache?.frontmatter?.["zk-id"];

	if (existingId !== undefined) {
		new Notice("Note is already placed");
		return;
	}

	const nextId = findNextTopLevelId(plugin.app);
	const idValue = String(nextId);

	await plugin.app.fileManager.processFrontMatter(file, (frontmatter) => {
		frontmatter["zk-id"] = String(idValue);
	});

	new Notice(`Placed note as ${idValue}`);
	await plugin.refreshTree();
}
