import { Notice, TFile } from "obsidian";
import type AngryLuhmannPlugin from "../plugin";

export async function markOutsideZk(plugin: AngryLuhmannPlugin, file: TFile) {
	const cache = plugin.app.metadataCache.getFileCache(file);
	const zkId = cache?.frontmatter?.["zk-id"];

	if (zkId === "-1") {
		new Notice("Note is already marked as outside Zettelkasten");
		return;
	}

	// Set zk-id to -1 (magic value for "outside ZK")
	await plugin.app.fileManager.processFrontMatter(file, (frontmatter) => {
		frontmatter["zk-id"] = "-1";
	});

	new Notice(`Marked ${file.basename} as outside Zettelkasten`);
	await plugin.refreshTree();
}
