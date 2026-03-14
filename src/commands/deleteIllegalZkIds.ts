import { Notice } from "obsidian";
import type AngryLuhmannPlugin from "../plugin";
import { ZK_ID_PATTERN, ZkEntry } from "../core/types";
import { shouldIncludeFile } from "../utils/patterns";
import { ConfirmationModal } from "../ui/modals/ConfirmationModal";

export async function deleteIllegalZkIds(plugin: AngryLuhmannPlugin) {
	const { app, settings } = plugin;
	const illegalFiles: { file: ReturnType<typeof app.vault.getMarkdownFiles>[number]; zkId: string }[] = [];
	const validEntries: ZkEntry[] = [];
	const seenIds = new Map<string, string>();

	// Scan all markdown files (same logic as reportIllegalNotes)
	for (const file of app.vault.getMarkdownFiles()) {
		if (!shouldIncludeFile(file, settings.excludePatterns, settings.useIncludeMode)) {
			continue;
		}

		const cache = app.metadataCache.getFileCache(file);
		const zkId = cache?.frontmatter?.["zk-id"];

		if (zkId === undefined) {
			continue;
		}

		const idStr = String(zkId).trim();

		// Skip notes marked as outside ZK
		if (idStr === "-1") {
			continue;
		}

		// Malformed zk-id
		if (!ZK_ID_PATTERN.test(idStr)) {
			illegalFiles.push({ file, zkId: idStr });
			continue;
		}

		// Duplicate zk-id
		if (seenIds.has(idStr)) {
			illegalFiles.push({ file, zkId: idStr });
			continue;
		}

		seenIds.set(idStr, file.basename);
		validEntries.push({ id: idStr, file });
	}

	// Orphaned notes (missing parent)
	const validIds = new Set(validEntries.map((e) => e.id));

	for (const entry of validEntries) {
		const parts = entry.id.split(".");
		if (parts.length <= 1) {
			continue;
		}

		const parentId = parts.slice(0, -1).join(".");
		if (!validIds.has(parentId)) {
			illegalFiles.push({ file: entry.file, zkId: entry.id });
		}
	}

	if (illegalFiles.length === 0) {
		new Notice("No illegal zk-id notes found");
		return;
	}

	new ConfirmationModal(
		app,
		`Remove zk-id from ${illegalFiles.length} illegally placed note(s)?`,
		async () => {
			for (const { file } of illegalFiles) {
				await app.fileManager.processFrontMatter(file, (frontmatter) => {
					delete frontmatter["zk-id"];
				});
			}

			new Notice(`Removed zk-id from ${illegalFiles.length} note(s)`);
			await plugin.refreshTree();
		}
	).open();
}
