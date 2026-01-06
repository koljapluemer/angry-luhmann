import { Notice, TFile } from "obsidian";
import type AngryLuhmannPlugin from "../plugin";
import { findNextTopLevelId } from "../core/data";
import { VIEW_TYPE_ZK_TREE } from "../utils/constants";
import { ZkTreeView } from "../ui/views/TreeView";

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

	// Scroll to the placed note
	for (const leaf of plugin.app.workspace.getLeavesOfType(VIEW_TYPE_ZK_TREE)) {
		const view = leaf.view;
		if (view instanceof ZkTreeView) {
			view.scrollToActiveNote();
		}
	}
}
