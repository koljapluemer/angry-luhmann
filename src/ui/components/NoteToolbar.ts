import { setIcon, TFile } from "obsidian";
import type AngryLuhmannPlugin from "../../plugin";
import { openRandomZkNote } from "../../commands/randomZkNote";
import { openRandomUnplacedNote } from "../../commands/randomUnplacedNote";
import { removeFromZk } from "../../commands/removeFromZk";
import { markOutsideZk } from "../../commands/markOutsideZk";

export class NoteToolbar {
	private plugin: AngryLuhmannPlugin;
	private toolbarEl: HTMLElement | null = null;
	private separatorEl: HTMLElement | null = null;
	private removeButton: HTMLElement | null = null;
	private outsideButton: HTMLElement | null = null;
	private currentFile: TFile | null = null;

	constructor(plugin: AngryLuhmannPlugin) {
		this.plugin = plugin;
	}

	initialize() {
		// Listen for active file changes
		this.plugin.registerEvent(
			this.plugin.app.workspace.on("active-leaf-change", () => {
				this.updateToolbar();
			})
		);

		// Listen for file modifications (frontmatter changes)
		this.plugin.registerEvent(
			this.plugin.app.metadataCache.on("changed", (file) => {
				if (file === this.currentFile) {
					this.updateToolbar();
				}
			})
		);

		// Initial render
		this.updateToolbar();
	}

	private updateToolbar() {
		const activeFile = this.plugin.app.workspace.getActiveFile();

		// Remove toolbar if no active file or not a markdown file
		if (!activeFile || activeFile.extension !== "md") {
			this.removeToolbar();
			return;
		}

		this.currentFile = activeFile;

		// Find the view container
		const container = this.findViewContainer();
		if (!container) {
			this.removeToolbar();
			return;
		}

		// Check if toolbar exists and is in the correct container
		const needsNewToolbar = !this.toolbarEl ||
			!this.toolbarEl.isConnected ||
			this.toolbarEl.parentElement !== container;

		if (needsNewToolbar) {
			// Remove old toolbar if it exists
			this.removeToolbar();
			// Create new toolbar in the correct container
			this.createToolbar(container);
		}

		// Update button visibility based on zk-id status
		this.updateButtonVisibility(activeFile);
	}

	private findViewContainer(): HTMLElement | null {
		const activeLeaf = this.plugin.app.workspace.activeLeaf;
		if (!activeLeaf) {
			return null;
		}

		const viewContent = activeLeaf.view.containerEl.querySelector(
			".view-content"
		) as HTMLElement;

		return viewContent;
	}

	private createToolbar(container: HTMLElement) {
		// Create toolbar element
		this.toolbarEl = container.createDiv({ cls: "zk-note-toolbar" });

		// Button 1: Random ZK Note
		const randomButton = this.toolbarEl.createDiv({
			cls: "zk-note-toolbar-button",
			attr: { "aria-label": "Open random Zettelkasten note" },
		});
		setIcon(randomButton, "shuffle");
		randomButton.addEventListener("click", () => {
			void openRandomZkNote(this.plugin);
		});

		// Button 2: Random Unplaced Note
		const randomUnplacedButton = this.toolbarEl.createDiv({
			cls: "zk-note-toolbar-button",
			attr: { "aria-label": "Open random unplaced note" },
		});
		setIcon(randomUnplacedButton, "help-circle");
		randomUnplacedButton.addEventListener("click", () => {
			void openRandomUnplacedNote(this.plugin);
		});

		// Separator (conditionally visible)
		this.separatorEl = this.toolbarEl.createDiv({ cls: "zk-note-toolbar-separator" });

		// Button 3: Remove from ZK (conditionally visible)
		this.removeButton = this.toolbarEl.createDiv({
			cls: "zk-note-toolbar-button",
			attr: { "aria-label": "Remove note from Zettelkasten" },
		});
		setIcon(this.removeButton, "x");
		this.removeButton.addEventListener("click", () => {
			if (this.currentFile) {
				void removeFromZk(this.plugin, this.currentFile);
			}
		});

		// Button 4: Mark Outside ZK (conditionally visible)
		this.outsideButton = this.toolbarEl.createDiv({
			cls: "zk-note-toolbar-button",
			attr: { "aria-label": "Mark note as outside Zettelkasten" },
		});
		setIcon(this.outsideButton, "ban");
		this.outsideButton.addEventListener("click", () => {
			if (this.currentFile) {
				void markOutsideZk(this.plugin, this.currentFile);
			}
		});
	}

	private updateButtonVisibility(file: TFile) {
		if (!this.removeButton || !this.outsideButton || !this.separatorEl) {
			return;
		}

		const cache = this.plugin.app.metadataCache.getFileCache(file);
		const zkId = cache?.frontmatter?.["zk-id"];

		// Show remove button only if note has a valid zk-id (not undefined, not -1)
		const hasValidZkId = zkId !== undefined && String(zkId) !== "-1";

		if (hasValidZkId) {
			this.removeButton.removeClass("is-hidden");
		} else {
			this.removeButton.addClass("is-hidden");
		}

		// Show mark-outside button only if note has NO zk-id at all
		const hasNoZkId = zkId === undefined;

		if (hasNoZkId) {
			this.outsideButton.removeClass("is-hidden");
		} else {
			this.outsideButton.addClass("is-hidden");
		}

		// Show separator only if at least one button on the right is visible
		const anyRightButtonVisible = hasValidZkId || hasNoZkId;

		if (anyRightButtonVisible) {
			this.separatorEl.removeClass("is-hidden");
		} else {
			this.separatorEl.addClass("is-hidden");
		}
	}

	private removeToolbar() {
		if (this.toolbarEl) {
			this.toolbarEl.remove();
			this.toolbarEl = null;
			this.separatorEl = null;
			this.removeButton = null;
			this.outsideButton = null;
		}
		this.currentFile = null;
	}

	destroy() {
		this.removeToolbar();
	}
}
