import type AngryLuhmannPlugin from "../plugin";
import { collectZkEntries } from "../core/data";
import { buildZkTree, getDepthFirstOrder } from "../core/tree";
import { ConfirmationModal } from "../ui/modals/ConfirmationModal";
import { processNavigationLinks } from "./utils";

export async function addNavigationLinksToAllNotes(plugin: AngryLuhmannPlugin) {
	const entries = collectZkEntries(plugin.app, plugin.settings.excludePatterns, plugin.settings.useIncludeMode);
	const tree = buildZkTree(entries);
	const filesInOrder = getDepthFirstOrder(tree);

	const message =
		`This will add navigation links to ${filesInOrder.length} notes. ` +
		`This operation will modify file contents. Continue?`;

	const modal = new ConfirmationModal(plugin.app, message, async () => {
		await processNavigationLinks(plugin, filesInOrder);
	});

	modal.open();
}
