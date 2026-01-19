import { App, TFile } from "obsidian";
import { ZK_ID_PATTERN, ZkEntry } from "./types";
import { shouldIncludeFile } from "../utils/patterns";

/**
 * Check if a note has a valid zk-id placement in the tree.
 * Returns true only if the note has a properly formatted zk-id AND
 * (for non-top-level notes) a valid parent exists.
 */
export function hasValidZkPlacement(app: App, file: TFile): boolean {
	const cache = app.metadataCache.getFileCache(file);
	const zkId = cache?.frontmatter?.["zk-id"];

	if (zkId === undefined) {
		return false;
	}

	const idStr = String(zkId).trim();

	// "-1" means explicitly outside ZK
	if (idStr === "-1") {
		return false;
	}

	// Must match the pattern
	if (!ZK_ID_PATTERN.test(idStr)) {
		return false;
	}

	// Top-level notes are valid if pattern matches
	const parts = idStr.split(".");
	if (parts.length === 1) {
		return true;
	}

	// Non-top-level notes need a valid parent
	const parentId = parts.slice(0, -1).join(".");
	return hasNoteWithZkId(app, parentId);
}

/**
 * Check if any note in the vault has the given zk-id.
 */
function hasNoteWithZkId(app: App, zkId: string): boolean {
	for (const file of app.vault.getMarkdownFiles()) {
		const cache = app.metadataCache.getFileCache(file);
		const fileZkId = cache?.frontmatter?.["zk-id"];

		if (fileZkId !== undefined && String(fileZkId).trim() === zkId) {
			return true;
		}
	}
	return false;
}

export function collectZkEntries(app: App, excludePatterns = "", useIncludeMode = false): ZkEntry[] {
	const entries: ZkEntry[] = [];

	for (const file of app.vault.getMarkdownFiles()) {
		// Skip files based on pattern mode
		if (!shouldIncludeFile(file, excludePatterns, useIncludeMode)) {
			continue;
		}

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
