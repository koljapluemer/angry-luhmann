import { Notice, TFile } from "obsidian";
import type AngryLuhmannPlugin from "../plugin";
import { findNextFollowingId } from "../core/data";
import { getUniqueNotePath } from "./utils";

export async function createFollowingNote(plugin: AngryLuhmannPlugin, file: TFile) {
	const cache = plugin.app.metadataCache.getFileCache(file);
	const currentId = cache?.frontmatter?.["zk-id"];

	if (currentId === undefined) {
		new Notice("Current note has no zk-id");
		return;
	}

	const currentIdStr = String(currentId).trim();
	const nextId = findNextFollowingId(currentIdStr, plugin.app);

	if (!nextId) {
		new Notice("Cannot determine next position");
		return;
	}

	const parentFolder = plugin.app.fileManager.getNewFileParent(file.path);
	const baseName = `Following ${file.basename}`.trim();
	const targetPath = getUniqueNotePath(plugin, parentFolder.path, baseName);
	const content = `---\nzk-id: "${String(nextId)}"\n---\n\n`;
	const newFile = await plugin.app.vault.create(targetPath, content);

	new Notice(`Created following note ${nextId}`);
	await plugin.refreshTree();
	await plugin.app.workspace.openLinkText(newFile.path, "", false);
}
