import { Notice, TFile } from "obsidian";
import type AngryLuhmannPlugin from "../plugin";
import { ConfirmationModal } from "../ui/modals/ConfirmationModal";

export async function removeFromZk(plugin: AngryLuhmannPlugin, file: TFile) {
	const cache = plugin.app.metadataCache.getFileCache(file);
	const zkId = cache?.frontmatter?.["zk-id"];

	if (zkId === undefined) {
		new Notice("Note is not in the Zettelkasten");
		return;
	}

	// Show confirmation modal
	new ConfirmationModal(
		plugin.app,
		`Remove zk-id "${zkId}" from "${file.basename}"? This will remove the note from the Zettelkasten tree.`,
		async () => {
			// Remove the zk-id field from frontmatter
			await plugin.app.fileManager.processFrontMatter(file, (frontmatter) => {
				delete frontmatter["zk-id"];
			});

			new Notice(`Removed zk-id from ${file.basename}`);
			await plugin.refreshTree();
		}
	).open();
}
