import { App, CachedMetadata, Notice, Plugin, TAbstractFile, TFile } from "obsidian";
import { registerCommands } from "./commands";
import { EMPTY_STATE_TEXT, VIEW_TYPE_ZK_TREE } from "./utils/constants";
import { AngryLuhmannSettingTab, AngryLuhmannSettings, DEFAULT_SETTINGS } from "./settings";
import { ZkTreeView } from "./ui/views/TreeView";
import { RenderedZkLine, ZkEntry } from "./core/types";
import { buildZkTree, renderZkTree } from "./core/tree";
import { generateMarkdownTree } from "./core/overview";
import { ZkEntryCache } from "./core/ZkEntryCache";

export default class AngryLuhmannPlugin extends Plugin {
	private refreshTimer: number | null = null;
	private overviewUpdateTimer: number | null = null;
	private isRefreshing = false;
	settings: AngryLuhmannSettings;
	zkCache: ZkEntryCache;

	async onload() {
		await this.loadSettings();

		// Initialize the cache
		this.zkCache = new ZkEntryCache(this.app);

		this.registerView(VIEW_TYPE_ZK_TREE, (leaf) => new ZkTreeView(leaf));

		// Use metadataCache "changed" instead of vault create/modify
		// This ensures we read metadata AFTER it's updated, not before
		this.registerEvent(this.app.metadataCache.on("changed", (file, data, cache) => this.onMetadataChanged(file, cache)));
		this.registerEvent(this.app.vault.on("delete", (file) => this.onFileDelete(file)));
		this.registerEvent(this.app.vault.on("rename", (file, oldPath) => this.onFileRename(file, oldPath)));
		this.registerEvent(this.app.metadataCache.on("resolved", () => this.scheduleRefresh()));

		this.addSettingTab(new AngryLuhmannSettingTab(this.app, this));
		registerCommands(this);

		this.app.workspace.onLayoutReady(() => {
			// Build initial cache
			this.zkCache.rebuild(this.settings.excludePatterns, this.settings.useIncludeMode);

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

		// Detach all leaves of this view type
		this.app.workspace.detachLeavesOfType(VIEW_TYPE_ZK_TREE);
	}

	private initLeaf() {
		if (this.app.workspace.getLeavesOfType(VIEW_TYPE_ZK_TREE).length === 0) {
			const leftLeaf = this.app.workspace.getLeftLeaf(false);
			leftLeaf?.setViewState({ type: VIEW_TYPE_ZK_TREE, active: true });
		}
	}

	private onMetadataChanged(file: TFile, cache: CachedMetadata) {
		if (this.isRefreshing) {
			return;
		}

		if (file.extension === "md") {
			// Pass the cache directly - it's guaranteed fresh
			this.zkCache.updateFile(file, cache);
			this.scheduleRefresh();
		}
	}

	private onFileDelete(file: TAbstractFile) {
		if (this.isRefreshing) {
			return;
		}

		if (file instanceof TFile && file.extension === "md") {
			this.zkCache.removeFile(file.path);
			this.scheduleRefresh();
		}
	}

	private onFileRename(file: TAbstractFile, oldPath: string) {
		if (this.isRefreshing) {
			return;
		}

		if (file instanceof TFile && file.extension === "md") {
			this.zkCache.renameFile(oldPath, file);
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
		const entries: ZkEntry[] = this.zkCache.getEntries();

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

		// Use cached entries (no second vault scan)
		const entries = this.zkCache.getEntries();
		const tree = buildZkTree(entries);
		const lines = renderZkTree(tree);

		// Generate markdown content
		const markdown = generateMarkdownTree(lines, this.settings.overviewNoteStyle);

		// Write to file (create if doesn't exist, overwrite if exists)
		const path = this.settings.overviewNotePath.trim();
		const file = this.app.vault.getAbstractFileByPath(path);

		if (file instanceof TFile) {
			// Read existing content to preserve frontmatter
			const existingContent = await this.app.vault.read(file);
			const newContent = this.preserveFrontmatter(existingContent, markdown);
			await this.app.vault.modify(file, newContent);
		} else if (!file) {
			await this.app.vault.create(path, markdown);
		} else {
			// Path exists but is not a file (folder)
			new Notice(`Cannot write overview: "${path}" is a folder`);
		}
	}

	private preserveFrontmatter(existingContent: string, newBody: string): string {
		// Check if content has frontmatter (starts with ---)
		if (!existingContent.startsWith('---')) {
			return newBody;
		}

		// Find the end of frontmatter (second occurrence of ---)
		const frontmatterEnd = existingContent.indexOf('---', 3);
		if (frontmatterEnd === -1) {
			// Malformed frontmatter, just return new body
			return newBody;
		}

		// Extract frontmatter including the closing ---
		const frontmatter = existingContent.substring(0, frontmatterEnd + 3);

		// Combine frontmatter with new body
		return `${frontmatter}\n\n${newBody}`;
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
