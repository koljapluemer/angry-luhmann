import type AngryLuhmannPlugin from "../plugin";
import { collectZkEntries } from "../core/data";
import { placeNoteAtEnd } from "./placeNoteAtEnd";
import { placeNoteAsChild } from "./placeNoteAsChild";
import { createChildNote } from "./createChildNote";
import { createFollowingNote } from "./createFollowingNote";
import { addNavigationLinksToAllNotes } from "./addNavigationLinks";

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
}
