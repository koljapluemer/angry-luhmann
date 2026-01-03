import { Notice, TFile } from "obsidian";
import type AngryLuhmannPlugin from "../plugin";
import { shouldIncludeFile } from "../utils/patterns";
import { ZK_ID_PATTERN } from "../core/types";

export async function openRandomUnplacedNote(plugin: AngryLuhmannPlugin) {
	const invalidNotes: TFile[] = [];
	const unplacedNotes: TFile[] = [];
	const validZkIds = new Set<string>();

	// First pass: collect all valid zk-ids
	for (const file of plugin.app.vault.getMarkdownFiles()) {
		if (!shouldIncludeFile(file, plugin.settings.excludePatterns, plugin.settings.useIncludeMode)) {
			continue;
		}

		const cache = plugin.app.metadataCache.getFileCache(file);
		const zkId = cache?.frontmatter?.["zk-id"];

		if (typeof zkId === "string" || typeof zkId === "number") {
			const idStr = String(zkId).trim();

			// Skip notes marked as outside ZK
			if (idStr === "-1") {
				continue;
			}

			// Check if well-formed
			if (ZK_ID_PATTERN.test(idStr)) {
				validZkIds.add(idStr);
			}
		}
	}

	// Second pass: categorize notes
	for (const file of plugin.app.vault.getMarkdownFiles()) {
		if (!shouldIncludeFile(file, plugin.settings.excludePatterns, plugin.settings.useIncludeMode)) {
			continue;
		}

		const cache = plugin.app.metadataCache.getFileCache(file);
		const zkId = cache?.frontmatter?.["zk-id"];

		if (zkId === undefined) {
			// Notes with no zk-id at all
			unplacedNotes.push(file);
		} else if (typeof zkId === "string" || typeof zkId === "number") {
			const idStr = String(zkId).trim();

			// Skip notes marked as outside ZK
			if (idStr === "-1") {
				continue;
			}

			// Check for malformed zk-id
			if (!ZK_ID_PATTERN.test(idStr)) {
				invalidNotes.push(file);
				continue;
			}

			// Check for orphaned zk-id (well-formed but parent doesn't exist)
			const parts = idStr.split(".");
			if (parts.length > 1) {
				const parentId = parts.slice(0, -1).join(".");
				if (!validZkIds.has(parentId)) {
					invalidNotes.push(file);
				}
			}
		}
	}

	// Prioritize invalid notes over unplaced notes
	let targetNotes: TFile[];
	let noticeType: string;

	if (invalidNotes.length > 0) {
		targetNotes = invalidNotes;
		noticeType = "invalid";
	} else if (unplacedNotes.length > 0) {
		targetNotes = unplacedNotes;
		noticeType = "unplaced";
	} else {
		new Notice("No unplaced or invalid notes found");
		return;
	}

	// Select random note
	const randomIndex = Math.floor(Math.random() * targetNotes.length);
	const randomNote = targetNotes[randomIndex];

	// Open the file
	await plugin.app.workspace.getLeaf(false).openFile(randomNote);

	new Notice(`Opened ${noticeType} note: ${randomNote.basename}`);
}
