import { Notice, TFile } from "obsidian";
import type AngryLuhmannPlugin from "../plugin";
import { findNextChildId, listPlacableParents } from "../core/data";
import { PlaceChildModal } from "../ui/modals/PlaceChildModal";

export async function placeNoteAsChild(plugin: AngryLuhmannPlugin, file: TFile) {
	const cache = plugin.app.metadataCache.getFileCache(file);
	const existingId = cache?.frontmatter?.["zk-id"];

	if (existingId !== undefined) {
		new Notice("Note is already placed");
		return;
	}

	const parents = listPlacableParents(plugin.app);
	const modal = new PlaceChildModal(plugin.app, parents, async (parent) => {
		const nextId = findNextChildId(parent.id, plugin.app);
		await plugin.app.fileManager.processFrontMatter(file, (frontmatter) => {
			frontmatter["zk-id"] = String(nextId);
		});
		new Notice(`Placed note as ${nextId}`);
		await plugin.refreshTree();
	});

	modal.open();
}
