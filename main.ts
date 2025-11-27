import { App, Notice, Plugin, TAbstractFile, TFile } from "obsidian";
import { registerCommands } from "./commands";
import { DEBUG_NOTE_PATH, EMPTY_STATE_TEXT, VIEW_TYPE_ZK_TREE } from "./constants";
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

		this.registerView(VIEW_TYPE_ZK_TREE, (leaf) => new ZkTreeView(leaf, () => this.refreshTree()));

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
		this.app.workspace.detachLeavesOfType(VIEW_TYPE_ZK_TREE);
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

		if (file instanceof TFile && file.path === DEBUG_NOTE_PATH) {
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
		const entries: ZkEntry[] = collectZkEntries(this.app, DEBUG_NOTE_PATH);
		const errors: string[] = [];

		try {
			const warn = (message: string) => {
				errors.push(message);
				new Notice(message);
			};
			const tree = buildZkTree(entries, warn);
			const renderedLines: RenderedZkLine[] = tree.length ? renderZkTree(tree) : [];
			const emptyState = renderedLines.length ? "" : EMPTY_STATE_TEXT;

			for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_ZK_TREE)) {
				const view = leaf.view;

				if (view instanceof ZkTreeView) {
					view.setTree(renderedLines, emptyState);
				}
			}

			if (this.settings.useDebugNote) {
				await this.writeDebugNote(entries, errors);
			}
		} finally {
			this.isRefreshing = false;
		}
	}

	private async writeDebugNote(entries: ZkEntry[], errors: string[]) {
		const lines: string[] = [
			"# Angry Luhmann Debug",
			"",
			"## zk-id notes",
		];

		if (entries.length === 0) {
			lines.push("- None");
		} else {
			for (const entry of entries) {
				lines.push(`- ${entry.file.basename}: ${entry.id}`);
			}
		}

		lines.push("", "## Errors");

		if (errors.length === 0) {
			lines.push("- None");
		} else {
			for (const message of errors) {
				lines.push(`- ${message}`);
			}
		}

		const content = lines.join("\n");
		const existing = this.app.vault.getAbstractFileByPath(DEBUG_NOTE_PATH);

		if (!existing) {
			await this.app.vault.create(DEBUG_NOTE_PATH, content);
			return;
		}

		if (existing instanceof TFile) {
			await this.app.vault.modify(existing, content);
		} else {
			new Notice(`Cannot write debug note: "${DEBUG_NOTE_PATH}" exists and is not a file.`);
		}
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
