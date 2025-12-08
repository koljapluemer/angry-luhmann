import { App } from "obsidian";
import { ZK_ID_PATTERN, ZkEntry } from "./types";

export function collectZkEntries(app: App): ZkEntry[] {
	const entries: ZkEntry[] = [];

	for (const file of app.vault.getMarkdownFiles()) {
		const cache = app.metadataCache.getFileCache(file);
		const zkId = cache?.frontmatter?.["zk-id"];

		if (typeof zkId === "string" || typeof zkId === "number") {
			const idStr = String(zkId);

			// Skip entries marked as outside ZK (zk-id: -1)
			if (idStr === "-1") {
				continue;
			}

			entries.push({ id: idStr, file });
		}
	}

	return entries;
}

export function findNextTopLevelId(app: App): number {
	let maxId = -1;

	for (const file of app.vault.getMarkdownFiles()) {
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

export function listPlacableParents(app: App): ZkEntry[] {
	return collectZkEntries(app);
}

export function findNextChildId(parentId: string, app: App): string {
	const depth = parentId.split(".").length + 1;
	let maxChild = -1;

	for (const entry of collectZkEntries(app)) {
		if (!entry.id.startsWith(`${parentId}.`)) {
			continue;
		}

		const parts = entry.id.split(".");
		if (parts.length !== depth) {
			continue;
		}

		const last = Number(parts[parts.length - 1]);
		if (!Number.isNaN(last)) {
			maxChild = Math.max(maxChild, last);
		}
	}

	return `${parentId}.${maxChild + 1}`;
}

export function findNextFollowingId(currentId: string, app: App): string | null {
	if (!ZK_ID_PATTERN.test(currentId)) {
		return null;
	}

	const entries = collectZkEntries(app);
	const used = new Set(entries.map((e) => e.id.trim()));
	const parts = currentId.split(".");
	const parentParts = parts.slice(0, -1);
	const parentPrefix = parentParts.length ? `${parentParts.join(".")}.` : "";
	const currentNumber = Number(parts[parts.length - 1]);

	if (Number.isNaN(currentNumber)) {
		return null;
	}

	let candidate = currentNumber + 1;
	let nextId = `${parentPrefix}${candidate}`;

	while (used.has(nextId)) {
		candidate += 1;
		nextId = `${parentPrefix}${candidate}`;
	}

	return nextId;
}
