import { Notice, TFile } from "obsidian";
import { DEBUG_NOTE_PATH } from "./constants";
import { findNextTopLevelId } from "./zkData";
import type AngryLuhmannPlugin from "./main";

export function registerCommands(plugin: AngryLuhmannPlugin) {
	plugin.addCommand({
		id: "place-note-at-end",
		name: "Place this note at the end of the Zettelkasten",
		checkCallback: (checking) => {
			const file = plugin.app.workspace.getActiveFile();
			if (!file || file.extension !== "md" || file.path === DEBUG_NOTE_PATH) {
				return false;
			}

			if (!checking) {
				void placeCurrentNoteAtEnd(plugin, file);
			}

			return true;
		},
	});
}

async function placeCurrentNoteAtEnd(plugin: AngryLuhmannPlugin, file: TFile) {
	const cache = plugin.app.metadataCache.getFileCache(file);
	const existingId = cache?.frontmatter?.["zk-id"];

	if (existingId !== undefined) {
		new Notice("Note is already placed");
		return;
	}

	const nextId = findNextTopLevelId(plugin.app, DEBUG_NOTE_PATH);
	const idValue = String(nextId);

	await plugin.app.fileManager.processFrontMatter(file, (frontmatter) => {
		frontmatter["zk-id"] = idValue;
	});

	new Notice(`Placed note as ${idValue}`);
	await plugin.refreshTree();
}
