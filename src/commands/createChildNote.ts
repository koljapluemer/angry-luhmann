import { Notice, TFile } from "obsidian";
import type AngryLuhmannPlugin from "../plugin";
import { findNextChildId } from "../core/data";
import { getUniqueNotePath } from "./utils";

export async function createChildNote(plugin: AngryLuhmannPlugin, file: TFile) {
	const cache = plugin.app.metadataCache.getFileCache(file);
	const parentId = cache?.frontmatter?.["zk-id"];

	if (parentId === undefined) {
		new Notice("Current note has no zk-id");
		return;
	}

	const parentIdStr = String(parentId);
	const childId = findNextChildId(parentIdStr, plugin.app);

	const parentFolder = plugin.app.fileManager.getNewFileParent(file.path);
	const baseName = `Child of ${file.basename}`.trim();
	const targetPath = getUniqueNotePath(plugin, parentFolder.path, baseName);

	const content = `---\nzk-id: "${String(childId)}"\n---\n\n`;
	const newFile = await plugin.app.vault.create(targetPath, content);

	new Notice(`Created child ${childId}`);
	await plugin.refreshTree();
	await plugin.app.workspace.openLinkText(newFile.path, "", false);
}
