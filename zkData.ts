import { App } from "obsidian";
import { DEBUG_NOTE_PATH } from "./constants";
import { ZK_ID_PATTERN, ZkEntry } from "./zkTree";

export function collectZkEntries(app: App, ignorePath: string = DEBUG_NOTE_PATH): ZkEntry[] {
	const entries: ZkEntry[] = [];

	for (const file of app.vault.getMarkdownFiles()) {
		if (file.path === ignorePath) {
			continue;
		}

		const cache = app.metadataCache.getFileCache(file);
		const zkId = cache?.frontmatter?.["zk-id"];

		if (typeof zkId === "string" || typeof zkId === "number") {
			entries.push({ id: String(zkId), file });
		}
	}

	return entries;
}

export function findNextTopLevelId(app: App, ignorePath: string = DEBUG_NOTE_PATH): number {
	let maxId = -1;

	for (const file of app.vault.getMarkdownFiles()) {
		if (file.path === ignorePath) {
			continue;
		}

		const cache = app.metadataCache.getFileCache(file);
		const zkId = cache?.frontmatter?.["zk-id"];

		if (typeof zkId !== "string" && typeof zkId !== "number") {
			continue;
		}

		const zkIdStr = String(zkId).trim();
		if (!ZK_ID_PATTERN.test(zkIdStr)) {
			continue;
		}

		const [firstPart] = zkIdStr.split(".");
		const topLevel = Number(firstPart);

		if (!Number.isNaN(topLevel)) {
			maxId = Math.max(maxId, topLevel);
		}
	}

	return maxId + 1;
}
