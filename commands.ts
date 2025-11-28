import { Notice, TFile } from "obsidian";
import { DEBUG_NOTE_PATH } from "./constants";
import { findNextChildId, findNextFollowingId, findNextTopLevelId, listPlacableParents } from "./zkData";
import { PlaceChildModal } from "./placeChildModal";
import type AngryLuhmannPlugin from "./main";

export function registerCommands(plugin: AngryLuhmannPlugin) {
	plugin.addCommand({
		id: "place-note-at-end",
		name: "Place this note at the end of the Zettelkasten",
		checkCallback: (checking) => {
			const file = plugin.app.workspace.getActiveFile();
			if (!file || file.extension !== "md" || file.path === DEBUG_NOTE_PATH) {
				return false;
			}

			if (!checking) {
				void placeCurrentNoteAtEnd(plugin, file);
			}

			return true;
		},
	});

	plugin.addCommand({
		id: "place-note-as-child",
		name: "Place note as child of...",
		checkCallback: (checking) => {
			const file = plugin.app.workspace.getActiveFile();
			if (!file || file.extension !== "md" || file.path === DEBUG_NOTE_PATH) {
				return false;
			}

			if (!checking) {
				void placeNoteAsChild(plugin, file);
			}

			return true;
		},
	});

	plugin.addCommand({
		id: "create-child-note",
		name: "Create Child",
		checkCallback: (checking) => {
			const file = plugin.app.workspace.getActiveFile();
			if (!file || file.extension !== "md" || file.path === DEBUG_NOTE_PATH) {
				return false;
			}

			if (!checking) {
				void createChildNote(plugin, file);
			}

			return true;
		},
	});

	plugin.addCommand({
		id: "create-following-note",
		name: "Create Following Note",
		checkCallback: (checking) => {
			const file = plugin.app.workspace.getActiveFile();
			if (!file || file.extension !== "md" || file.path === DEBUG_NOTE_PATH) {
				return false;
			}

			if (!checking) {
				void createFollowingNote(plugin, file);
			}

			return true;
		},
	});
}

async function placeCurrentNoteAtEnd(plugin: AngryLuhmannPlugin, file: TFile) {
	const cache = plugin.app.metadataCache.getFileCache(file);
	const existingId = cache?.frontmatter?.["zk-id"];

	if (existingId !== undefined) {
		new Notice("Note is already placed");
		return;
	}

	const nextId = findNextTopLevelId(plugin.app, DEBUG_NOTE_PATH);
	const idValue = String(nextId);

	await plugin.app.fileManager.processFrontMatter(file, (frontmatter) => {
		frontmatter["zk-id"] = String(idValue);
	});

	new Notice(`Placed note as ${idValue}`);
	await plugin.refreshTree();
}

async function placeNoteAsChild(plugin: AngryLuhmannPlugin, file: TFile) {
	const cache = plugin.app.metadataCache.getFileCache(file);
	const existingId = cache?.frontmatter?.["zk-id"];

	if (existingId !== undefined) {
		new Notice("Note is already placed");
		return;
	}

	const parents = listPlacableParents(plugin.app, DEBUG_NOTE_PATH);
	const modal = new PlaceChildModal(plugin.app, parents, async (parent) => {
		const nextId = findNextChildId(parent.id, plugin.app, DEBUG_NOTE_PATH);
		await plugin.app.fileManager.processFrontMatter(file, (frontmatter) => {
			frontmatter["zk-id"] = String(nextId);
		});
		new Notice(`Placed note as ${nextId}`);
		await plugin.refreshTree();
	});

	modal.open();
}

async function createChildNote(plugin: AngryLuhmannPlugin, file: TFile) {
	const cache = plugin.app.metadataCache.getFileCache(file);
	const parentId = cache?.frontmatter?.["zk-id"];

	if (parentId === undefined) {
		new Notice("Current note has no zk-id");
		return;
	}

	const parentIdStr = String(parentId);
	const childId = findNextChildId(parentIdStr, plugin.app, DEBUG_NOTE_PATH);

	const parentFolder = plugin.app.fileManager.getNewFileParent(file.path);
	const baseName = `Child of ${file.basename}`.trim();
	const targetPath = getUniqueNotePath(plugin, parentFolder.path, baseName);

	const content = `---\nzk-id: "${String(childId)}"\n---\n\n`;
	const newFile = await plugin.app.vault.create(targetPath, content);

	new Notice(`Created child ${childId}`);
	await plugin.refreshTree();
	await plugin.app.workspace.openLinkText(newFile.path, "", false);
}

function getUniqueNotePath(plugin: AngryLuhmannPlugin, folderPath: string, baseName: string): string {
	let name = baseName || "Untitled";
	let attempt = 0;

	while (true) {
		const candidateName = attempt === 0 ? name : `${name} ${attempt}`;
		const candidatePath = folderPath ? `${folderPath}/${candidateName}.md` : `${candidateName}.md`;
		if (!plugin.app.vault.getAbstractFileByPath(candidatePath)) {
			return candidatePath;
		}
		attempt += 1;
	}
}

async function createFollowingNote(plugin: AngryLuhmannPlugin, file: TFile) {
	const cache = plugin.app.metadataCache.getFileCache(file);
	const currentId = cache?.frontmatter?.["zk-id"];

	if (currentId === undefined) {
		new Notice("Current note has no zk-id");
		return;
	}

	const currentIdStr = String(currentId).trim();
	const nextId = findNextFollowingId(currentIdStr, plugin.app, DEBUG_NOTE_PATH);

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
