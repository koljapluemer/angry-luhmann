import { Notice } from "obsidian";
import { moment } from "obsidian";
import type AngryLuhmannPlugin from "../plugin";
import { ZK_ID_PATTERN, ZkEntry } from "../core/types";
import { shouldIncludeFile } from "../utils/patterns";
import { getUniqueNotePath } from "./utils";

interface IllegalEntry {
	file: string;
	zkId: string;
	reason: string;
}

export async function reportIllegalNotes(plugin: AngryLuhmannPlugin) {
	const { app, settings } = plugin;
	const illegal: IllegalEntry[] = [];
	const validEntries: ZkEntry[] = [];
	const seenIds = new Map<string, string>();

	// Scan all markdown files
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

		// Check for malformed zk-id
		if (!ZK_ID_PATTERN.test(idStr)) {
			illegal.push({
				file: file.basename,
				zkId: idStr,
				reason: "Malformed zk-id (must be digits separated by dots)",
			});
			continue;
		}

		// Check for duplicates
		if (seenIds.has(idStr)) {
			illegal.push({
				file: file.basename,
				zkId: idStr,
				reason: `Duplicate zk-id (also used by ${seenIds.get(idStr)})`,
			});
			continue;
		}

		seenIds.set(idStr, file.basename);
		validEntries.push({ id: idStr, file });
	}

	// Check for orphaned notes (missing parent)
	const validIds = new Set(validEntries.map((e) => e.id));

	for (const entry of validEntries) {
		const parts = entry.id.split(".");
		if (parts.length <= 1) {
			continue; // Top-level, no parent needed
		}

		const parentId = parts.slice(0, -1).join(".");
		if (!validIds.has(parentId)) {
			illegal.push({
				file: entry.file.basename,
				zkId: entry.id,
				reason: `Missing parent (no note with zk-id "${parentId}")`,
			});
		}
	}

	if (illegal.length === 0) {
		new Notice("No illegal zk-id notes found");
		return;
	}

	// Generate report
	const timestamp = moment().format("YYYY-MM-DD HH-mm-ss");
	const dateHeader = moment().format("YYYY-MM-DD HH:mm:ss");

	let content = `---\nzk-id: "-1"\n---\n\n`;
	content += `# Illegal zk-id Report\n\n`;
	content += `Generated: ${dateHeader}\n\n`;
	content += `Found ${illegal.length} illegal note(s):\n\n`;

	// Group by reason type
	const malformed = illegal.filter((e) => e.reason.startsWith("Malformed"));
	const duplicates = illegal.filter((e) => e.reason.startsWith("Duplicate"));
	const orphaned = illegal.filter((e) => e.reason.startsWith("Missing parent"));

	if (malformed.length > 0) {
		content += `## Malformed zk-ids (${malformed.length})\n\n`;
		for (const entry of malformed) {
			content += `- [[${entry.file}]] — zk-id: \`${entry.zkId}\`\n`;
		}
		content += `\n`;
	}

	if (duplicates.length > 0) {
		content += `## Duplicate zk-ids (${duplicates.length})\n\n`;
		for (const entry of duplicates) {
			content += `- [[${entry.file}]] — zk-id: \`${entry.zkId}\` (${entry.reason.replace("Duplicate zk-id ", "")})\n`;
		}
		content += `\n`;
	}

	if (orphaned.length > 0) {
		content += `## Orphaned zk-ids (${orphaned.length})\n\n`;
		for (const entry of orphaned) {
			content += `- [[${entry.file}]] — zk-id: \`${entry.zkId}\` (${entry.reason.replace("Missing parent ", "")})\n`;
		}
		content += `\n`;
	}

	// Create the note
	const activeFile = app.workspace.getActiveFile();
	const parentFolder = app.fileManager.getNewFileParent(activeFile?.path || "/");
	const baseName = `Illegal ZK Notes ${timestamp}`;
	const targetPath = getUniqueNotePath(plugin, parentFolder.path, baseName);

	const newFile = await app.vault.create(targetPath, content);
	new Notice(`Created report with ${illegal.length} illegal note(s)`);
	await plugin.refreshTree();
	await app.workspace.openLinkText(newFile.path, "", false);
}
