import { ItemView, WorkspaceLeaf } from "obsidian";
import { EMPTY_STATE_TEXT, VIEW_TYPE_ZK_TREE } from "./constants";
import { RenderedZkLine } from "./zkTree";

export class ZkTreeView extends ItemView {
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
