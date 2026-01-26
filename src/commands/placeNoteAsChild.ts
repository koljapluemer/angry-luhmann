import { Notice, TFile } from "obsidian";
import type AngryLuhmannPlugin from "../plugin";
import { PlaceChildModal } from "../ui/modals/PlaceChildModal";
import { VIEW_TYPE_ZK_TREE } from "../utils/constants";
import { ZkTreeView } from "../ui/views/TreeView";
import { waitForMetadataCacheUpdate } from "./utils";

export async function placeNoteAsChild(plugin: AngryLuhmannPlugin, file: TFile) {
	if (plugin.zkCache.hasValidZkPlacement(file)) {
		new Notice("Note is already placed");
		return;
	}

	const parents = plugin.zkCache.listPlacableParents();
	const modal = new PlaceChildModal(plugin.app, parents, async (parent) => {
		const nextId = plugin.zkCache.findNextChildId(parent.id);
		await plugin.app.fileManager.processFrontMatter(file, (frontmatter) => {
			frontmatter["zk-id"] = String(nextId);
		});
		new Notice(`Placed note as ${nextId}`);

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
	});

	modal.open();
}
