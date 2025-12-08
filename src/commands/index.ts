import type AngryLuhmannPlugin from "../plugin";
import { collectZkEntries } from "../core/data";
import { placeNoteAtEnd } from "./placeNoteAtEnd";
import { placeNoteAsChild } from "./placeNoteAsChild";
import { createChildNote } from "./createChildNote";
import { createFollowingNote } from "./createFollowingNote";
import { addNavigationLinksToAllNotes } from "./addNavigationLinks";
import { openRandomZkNote } from "./randomZkNote";
import { removeFromZk } from "./removeFromZk";
import { markOutsideZk } from "./markOutsideZk";

export function registerCommands(plugin: AngryLuhmannPlugin) {
	plugin.addCommand({
		id: "place-note-at-end",
		name: "Place this note at the end of the Zettelkasten",
		checkCallback: (checking) => {
			const file = plugin.app.workspace.getActiveFile();
			if (!file || file.extension !== "md") {
				return false;
			}

			if (!checking) {
				void placeNoteAtEnd(plugin, file);
			}

			return true;
		},
	});

	plugin.addCommand({
		id: "place-note-as-child",
		name: "Place note as child of...",
		checkCallback: (checking) => {
			const file = plugin.app.workspace.getActiveFile();
			if (!file || file.extension !== "md") {
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
			if (!file || file.extension !== "md") {
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
			if (!file || file.extension !== "md") {
				return false;
			}

			if (!checking) {
				void createFollowingNote(plugin, file);
			}

			return true;
		},
	});

	plugin.addCommand({
		id: "add-navigation-links",
		name: "Add id-based links to all notes",
		checkCallback: (checking) => {
			const hasZkNotes = collectZkEntries(plugin.app).length > 0;

			if (!checking && hasZkNotes) {
				void addNavigationLinksToAllNotes(plugin);
			}

			return hasZkNotes;
		},
	});

	plugin.addCommand({
		id: "refresh-overview-note",
		name: "Refresh ZK Overview note",
		checkCallback: (checking) => {
			const hasPath = plugin.settings.overviewNotePath.trim().length > 0;

			if (!checking && hasPath) {
				void plugin.updateOverviewNote();
			}

			return hasPath;
		},
	});

	plugin.addCommand({
		id: "open-random-zk-note",
		name: "Open random Zettelkasten note",
		callback: () => void openRandomZkNote(plugin),
	});

	plugin.addCommand({
		id: "remove-from-zk",
		name: "Remove note from Zettelkasten",
		checkCallback: (checking) => {
			const file = plugin.app.workspace.getActiveFile();
			if (!file) {
				return false;
			}

			const cache = plugin.app.metadataCache.getFileCache(file);
			const zkId = cache?.frontmatter?.["zk-id"];
			const hasZkId = zkId !== undefined && String(zkId) !== "-1";

			if (!checking && hasZkId) {
				void removeFromZk(plugin, file);
			}

			return hasZkId;
		},
	});

	plugin.addCommand({
		id: "mark-outside-zk",
		name: "Mark note as outside Zettelkasten",
		checkCallback: (checking) => {
			const file = plugin.app.workspace.getActiveFile();
			if (!file || file.extension !== "md") {
				return false;
			}

			if (!checking) {
				void markOutsideZk(plugin, file);
			}

			return true;
		},
	});
}
