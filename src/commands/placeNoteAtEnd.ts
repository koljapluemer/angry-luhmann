import { Notice, TFile } from "obsidian";
import type AngryLuhmannPlugin from "../plugin";
import { VIEW_TYPE_ZK_TREE } from "../utils/constants";
import { ZkTreeView } from "../ui/views/TreeView";
import { waitForMetadataCacheUpdate } from "./utils";

export async function placeNoteAtEnd(plugin: AngryLuhmannPlugin, file: TFile) {
	if (plugin.zkCache.hasValidZkPlacement(file)) {
		new Notice("Note is already placed");
		return;
	}

	const nextId = plugin.zkCache.findNextTopLevelId();
	const idValue = String(nextId);

	await plugin.app.fileManager.processFrontMatter(file, (frontmatter) => {
		frontmatter["zk-id"] = String(idValue);
	});

	new Notice(`Placed note as ${idValue}`);

	// Wait for metadata cache to update with new zk-id
	await waitForMetadataCacheUpdate(plugin.app, file);

	// Refresh tree (now sees the new zk-id)
	await plugin.refreshTree();

	// Scroll to the placed note (now in tree)
	for (const leaf of plugin.app.workspace.getLeavesOfType(VIEW_TYPE_ZK_TREE)) {
		const view = leaf.view;
		if (view instanceof ZkTreeView) {
			view.scrollToActiveNote();
		}
	}
}
