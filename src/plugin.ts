import { App, Notice, Plugin, TAbstractFile, TFile } from "obsidian";
import { registerCommands } from "./commands";
import { EMPTY_STATE_TEXT, VIEW_TYPE_ZK_TREE } from "./utils/constants";
import { AngryLuhmannSettingTab, AngryLuhmannSettings, DEFAULT_SETTINGS } from "./settings";
import { ZkTreeView } from "./ui/views/TreeView";
import { NoteToolbar } from "./ui/components/NoteToolbar";
import { collectZkEntries } from "./core/data";
import { RenderedZkLine, ZkEntry } from "./core/types";
import { buildZkTree, renderZkTree } from "./core/tree";
import { generateMarkdownTree } from "./core/overview";

export default class AngryLuhmannPlugin extends Plugin {
	private refreshTimer: number | null = null;
	private overviewUpdateTimer: number | null = null;
	private isRefreshing = false;
	private noteToolbar: NoteToolbar | null = null;
	settings: AngryLuhmannSettings;

	async onload() {
		await this.loadSettings();

		this.registerView(VIEW_TYPE_ZK_TREE, (leaf) => new ZkTreeView(leaf));

		this.registerEvent(this.app.vault.on("create", (file) => this.onFileChange(file)));
		this.registerEvent(this.app.vault.on("modify", (file) => this.onFileChange(file)));
		this.registerEvent(this.app.vault.on("delete", (file) => this.onFileChange(file)));
		this.registerEvent(this.app.metadataCache.on("resolved", () => this.scheduleRefresh()));

		this.addSettingTab(new AngryLuhmannSettingTab(this.app, this));
		registerCommands(this);

		this.noteToolbar = new NoteToolbar(this);
		this.noteToolbar.initialize();

		this.app.workspace.onLayoutReady(() => {
			this.initLeaf();
			this.scheduleRefresh();

			// Initial overview note update if path is set
			if (this.settings.overviewNotePath.trim()) {
				void this.updateOverviewNote();
			}
		});
	}

	onunload() {
		this.clearRefreshTimer();
		this.clearOverviewUpdateTimer();
		this.noteToolbar?.destroy();
		this.noteToolbar = null;
		// Don't detach leaves - they will be reinitialized at original position on plugin update
	}

	private initLeaf() {
		if (this.app.workspace.getLeavesOfType(VIEW_TYPE_ZK_TREE).length === 0) {
			const rightLeaf = this.app.workspace.getRightLeaf(false);
			rightLeaf?.setViewState({ type: VIEW_TYPE_ZK_TREE, active: true });
		}
	}

	private onFileChange(file: TAbstractFile) {
		if (this.isRefreshing) {
			return;
		}

		if (file instanceof TFile && file.extension === "md") {
			this.scheduleRefresh();
		}
	}

	private scheduleRefresh() {
		if (this.isRefreshing) {
			return;
		}

		if (this.refreshTimer !== null) {
			return;
		}

		this.refreshTimer = window.setTimeout(() => {
			this.refreshTimer = null;
			void this.refreshTree();
		}, 200);
	}

	private clearRefreshTimer() {
		if (this.refreshTimer !== null) {
			window.clearTimeout(this.refreshTimer);
			this.refreshTimer = null;
		}
	}

	async refreshTree() {
		this.clearRefreshTimer();
		if (this.isRefreshing) {
			return;
		}

		this.isRefreshing = true;
		const entries: ZkEntry[] = collectZkEntries(this.app);

		try {
			const tree = buildZkTree(entries);
			const renderedLines: RenderedZkLine[] = tree.length ? renderZkTree(tree) : [];
			const emptyState = renderedLines.length ? "" : EMPTY_STATE_TEXT;

			for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_ZK_TREE)) {
				const view = leaf.view;

				if (view instanceof ZkTreeView) {
					view.setTree(renderedLines, emptyState);
				}
			}
		} finally {
			this.isRefreshing = false;
		}

		// Schedule overview note update if auto-update is enabled
		if (this.settings.autoUpdateOverview) {
			this.scheduleOverviewUpdate();
		}
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async updateOverviewNote() {
		// Guard: if path is empty, do nothing
		if (!this.settings.overviewNotePath.trim()) {
			return;
		}

		// Collect entries and render tree
		const entries = collectZkEntries(this.app);
		const tree = buildZkTree(entries);
		const lines = renderZkTree(tree);

		// Generate markdown content
		const markdown = generateMarkdownTree(lines);

		// Write to file (create if doesn't exist, overwrite if exists)
		const path = this.settings.overviewNotePath.trim();
		const file = this.app.vault.getAbstractFileByPath(path);

		if (file instanceof TFile) {
			await this.app.vault.modify(file, markdown);
		} else if (!file) {
			await this.app.vault.create(path, markdown);
		} else {
			// Path exists but is not a file (folder)
			new Notice(`Cannot write overview: "${path}" is a folder`);
		}
	}

	private scheduleOverviewUpdate() {
		// Only schedule if auto-update is enabled
		if (!this.settings.autoUpdateOverview) {
			return;
		}

		// Debounce: clear existing timer
		if (this.overviewUpdateTimer !== null) {
			window.clearTimeout(this.overviewUpdateTimer);
		}

		// Wait 2 seconds after changes settle
		this.overviewUpdateTimer = window.setTimeout(() => {
			this.overviewUpdateTimer = null;
			void this.updateOverviewNote();
		}, 2000);
	}

	private clearOverviewUpdateTimer() {
		if (this.overviewUpdateTimer !== null) {
			window.clearTimeout(this.overviewUpdateTimer);
			this.overviewUpdateTimer = null;
		}
	}
}
