import { App, Plugin, TAbstractFile, TFile } from "obsidian";
import { registerCommands } from "./commands";
import { EMPTY_STATE_TEXT, VIEW_TYPE_ZK_TREE } from "./constants";
import { AngryLuhmannSettingTab, AngryLuhmannSettings, DEFAULT_SETTINGS } from "./settings";
import { ZkTreeView } from "./treeView";
import { collectZkEntries } from "./zkData";
import { RenderedZkLine, ZkEntry, buildZkTree, renderZkTree } from "./zkTree";

export default class AngryLuhmannPlugin extends Plugin {
	private refreshTimer: number | null = null;
	private isRefreshing = false;
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

		this.app.workspace.onLayoutReady(() => {
			this.initLeaf();
			this.scheduleRefresh();
		});
	}

	onunload() {
		this.clearRefreshTimer();
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
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
