import { App, ItemView, Notice, Plugin, PluginSettingTab, Setting, TAbstractFile, TFile, WorkspaceLeaf } from "obsidian";
import { RenderedZkLine, ZkEntry, buildZkTree, renderZkTree } from "./zkTree";

const VIEW_TYPE_ZK_TREE = "luhmann-zk-tree";
const EMPTY_STATE_TEXT = "No zk-id notes found. Use refresh to recheck.";
const DEBUG_NOTE_PATH = "angry-luhmann-debug.md";

interface AngryLuhmannSettings {
	useDebugNote: boolean;
}

const DEFAULT_SETTINGS: AngryLuhmannSettings = {
	useDebugNote: false,
};

class ZkTreeView extends ItemView {
	private treeLines: RenderedZkLine[] = [];
	private emptyState = EMPTY_STATE_TEXT;
	private treeEl: HTMLElement | null = null;
	private refreshHandler: (() => Promise<void>) | null;

	constructor(leaf: WorkspaceLeaf, refreshHandler: () => Promise<void>) {
		super(leaf);
		this.refreshHandler = refreshHandler;
	}

	getViewType(): string {
		return VIEW_TYPE_ZK_TREE;
	}

	getDisplayText(): string {
		return "Zettelkasten";
	}

	getIcon(): string {
		return "git-branch";
	}

	setTree(lines: RenderedZkLine[], emptyState: string) {
		this.treeLines = lines;
		this.emptyState = emptyState;
		this.renderTree();
	}

	async onOpen() {
		this.contentEl.empty();
		this.contentEl.addClass("zk-tree-pane");

		const toolbar = this.contentEl.createDiv({ cls: "zk-tree-toolbar" });
		const refreshButton = toolbar.createEl("button", { text: "Refresh" });
		refreshButton.addEventListener("click", () => {
			if (this.refreshHandler) {
				void this.refreshHandler();
			}
		});

		this.treeEl = this.contentEl.createDiv({ cls: "zk-tree" });
		this.renderTree();
	}

	async onClose() {
		this.treeEl = null;
	}

	private renderTree() {
		if (!this.treeEl) {
			return;
		}

		this.treeEl.empty();
		if (this.treeLines.length === 0) {
			this.treeEl.setText(this.emptyState);
			return;
		}

		for (const line of this.treeLines) {
			const lineEl = this.treeEl.createDiv({ cls: "zk-line" });
			lineEl.createSpan({ text: line.prefix, cls: "zk-prefix" });
			const link = lineEl.createEl("a", { text: line.name, cls: "zk-link" });
			link.addEventListener("click", (evt) => {
				evt.preventDefault();
				this.app.workspace.openLinkText(line.file.path, "", false);
			});
		}
	}
}

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
		const entries: ZkEntry[] = [];
		const errors: string[] = [];

		try {
			for (const file of this.app.vault.getMarkdownFiles()) {
				if (file.path === DEBUG_NOTE_PATH) {
					continue;
				}

				const cache = this.app.metadataCache.getFileCache(file);
				const zkId = cache?.frontmatter?.["zk-id"];

				if (typeof zkId === "string" || typeof zkId === "number") {
					entries.push({ id: String(zkId), file });
				}
			}

			const warn = (message: string) => {
				errors.push(message);
				new Notice(message);
			};
			const tree = buildZkTree(entries, warn);
			const renderedLines = tree.length ? renderZkTree(tree) : [];
			const treeText = renderedLines.length ? "" : EMPTY_STATE_TEXT;

		for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_ZK_TREE)) {
			const view = leaf.view;

			if (view instanceof ZkTreeView) {
				view.setTree(renderedLines, treeText);
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
		const path = DEBUG_NOTE_PATH;
		const existing = this.app.vault.getAbstractFileByPath(path);

		if (!existing) {
			await this.app.vault.create(path, content);
			return;
		}

		if (existing instanceof TFile) {
			await this.app.vault.modify(existing, content);
		} else {
			new Notice(`Cannot write debug note: "${path}" exists and is not a file.`);
		}
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

async saveSettings() {
		await this.saveData(this.settings);
	}
}

class AngryLuhmannSettingTab extends PluginSettingTab {
	plugin: AngryLuhmannPlugin;

	constructor(app: App, plugin: AngryLuhmannPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName("Use Debug Note")
			.setDesc("Create/refresh angry-luhmann-debug.md with zk-ids and errors.")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.useDebugNote)
					.onChange(async (value) => {
						this.plugin.settings.useDebugNote = value;
						await this.plugin.saveSettings();
						if (value) {
							await this.plugin.refreshTree();
						}
					})
			);
	}
}
