import { ItemView, WorkspaceLeaf } from "obsidian";
import { EMPTY_STATE_TEXT, VIEW_TYPE_ZK_TREE } from "./constants";
import { RenderedZkLine } from "./zkTree";

export class ZkTreeView extends ItemView {
	private treeLines: RenderedZkLine[] = [];
	private emptyState = EMPTY_STATE_TEXT;
	private treeEl: HTMLElement | null = null;
	private collapsedPaths = new Set<string>();

	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
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

		this.treeEl = this.contentEl.createDiv({ cls: "zk-tree" });
		this.renderTree();

		// Update active file highlighting when active file changes
		this.registerEvent(
			this.app.workspace.on("active-leaf-change", () => {
				this.updateActiveFile();
			})
		);
	}

	private updateActiveFile() {
		if (!this.treeEl) {
			return;
		}

		const activeFile = this.app.workspace.getActiveFile();
		if (!activeFile) {
			return;
		}

		// Step 1: Auto-expand parent nodes if needed
		const needsRerender = this.expandParentsForFile(activeFile.path);

		if (needsRerender) {
			// Parents were collapsed, need full re-render
			this.renderTree();
		} else {
			// Just update CSS classes (more efficient)
			const allItems = this.treeEl.querySelectorAll('.tree-item-self');
			allItems.forEach((item) => {
				const path = item.getAttribute('data-path');
				if (path === activeFile.path) {
					item.addClass('is-active');
				} else {
					item.removeClass('is-active');
				}
			});
		}

		// Step 2: Scroll to the active element
		this.scrollToActiveFile();
	}

	private getZkId(filePath: string): string | null {
		const file = this.app.vault.getAbstractFileByPath(filePath);
		if (!file) {
			return null;
		}

		const cache = this.app.metadataCache.getFileCache(file as any);
		const zkId = cache?.frontmatter?.["zk-id"];

		if (typeof zkId === "string" || typeof zkId === "number") {
			return String(zkId).trim();
		}

		return null;
	}

	private getParentZkIds(zkId: string): string[] {
		const parts = zkId.split(".");
		const parents: string[] = [];

		// Build parent chain: "1.2.3" -> ["1", "1.2"]
		for (let i = 1; i < parts.length; i++) {
			parents.push(parts.slice(0, i).join("."));
		}

		return parents;
	}

	private getFilePathByZkId(zkId: string): string | null {
		// Search through treeLines for matching zk-id
		for (const line of this.treeLines) {
			const lineZkId = this.getZkId(line.file.path);
			if (lineZkId === zkId) {
				return line.file.path;
			}
		}
		return null;
	}

	private expandParentsForFile(filePath: string): boolean {
		const zkId = this.getZkId(filePath);
		if (!zkId) {
			return false;
		}

		const parentZkIds = this.getParentZkIds(zkId);
		let needsRerender = false;

		// For each parent zk-id, find its file path and ensure it's not collapsed
		for (const parentZkId of parentZkIds) {
			const parentPath = this.getFilePathByZkId(parentZkId);
			if (parentPath && this.collapsedPaths.has(parentPath)) {
				this.collapsedPaths.delete(parentPath);
				needsRerender = true;
			}
		}

		return needsRerender;
	}

	private scrollToActiveFile() {
		if (!this.treeEl) {
			return;
		}

		// Use requestAnimationFrame to ensure DOM is fully rendered
		requestAnimationFrame(() => {
			const activeElement = this.treeEl?.querySelector('.tree-item-self.is-active');
			if (activeElement) {
				activeElement.scrollIntoView({
					behavior: 'smooth',
					block: 'nearest',
					inline: 'nearest'
				});
			}
		});
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

		const activeFile = this.app.workspace.getActiveFile();

		let i = 0;
		while (i < this.treeLines.length) {
			const line = this.treeLines[i];
			i = this.renderItem(line, i, activeFile, this.treeEl);
		}
	}

	private renderItem(
		line: RenderedZkLine,
		startIndex: number,
		activeFile: any,
		container: HTMLElement
	): number {
		const isActive = activeFile?.path === line.file.path;
		const isCollapsed = this.collapsedPaths.has(line.file.path);
		const treeItem = container.createDiv({ cls: "tree-item nav-file" });

		// Obsidian's indentation formula:
		// margin-inline-start: depth * -17px
		// padding-inline-start: 24px + (depth * 17px)
		const marginInlineStart = line.depth * -17;
		const paddingInlineStart = 24 + (line.depth * 17);

		// Create the item itself
		const treeItemSelf = treeItem.createDiv({
			cls: `tree-item-self nav-file-title is-clickable ${isActive ? "is-active" : ""} ${
				line.hasChildren ? "mod-collapsible" : ""
			}`,
			attr: {
				"data-path": line.file.path,
				style: `margin-inline-start: ${marginInlineStart}px !important; padding-inline-start: ${paddingInlineStart}px !important;`
			}
		});

		// Add collapse icon if has children
		if (line.hasChildren) {
			const collapseIcon = treeItemSelf.createDiv({
				cls: `tree-item-icon collapse-icon ${isCollapsed ? "is-collapsed" : ""}`
			});
			collapseIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon right-triangle"><path d="M3 8L12 17L21 8"></path></svg>`;

			collapseIcon.addEventListener("click", (evt) => {
				evt.stopPropagation();
				this.toggleCollapse(line.file.path);
			});
		}

		// Add file name
		const treeItemInner = treeItemSelf.createDiv({
			cls: "tree-item-inner nav-file-title-content",
			text: line.name
		});

		// Click to open file
		treeItemSelf.addEventListener("click", async (evt) => {
			const file = this.app.vault.getAbstractFileByPath(line.file.path);
			if (file) {
				await this.app.workspace.getLeaf(false).openFile(file as any);
			}
		});

		// Handle children
		let nextIndex = startIndex + 1;
		if (line.hasChildren && !isCollapsed) {
			const childrenContainer = treeItem.createDiv({ cls: "tree-item-children" });

			// Render children until we hit a sibling or parent
			while (
				nextIndex < this.treeLines.length &&
				this.treeLines[nextIndex].depth > line.depth
			) {
				const childLine = this.treeLines[nextIndex];
				if (childLine.depth === line.depth + 1) {
					// Direct child
					nextIndex = this.renderItem(
						childLine,
						nextIndex,
						activeFile,
						childrenContainer
					);
				} else {
					// Skip descendants (will be rendered by their parent)
					nextIndex++;
				}
			}
		} else if (line.hasChildren && isCollapsed) {
			// Skip all descendants
			const targetDepth = line.depth;
			while (
				nextIndex < this.treeLines.length &&
				this.treeLines[nextIndex].depth > targetDepth
			) {
				nextIndex++;
			}
		}

		return nextIndex;
	}

	private toggleCollapse(path: string) {
		if (this.collapsedPaths.has(path)) {
			this.collapsedPaths.delete(path);
		} else {
			this.collapsedPaths.add(path);
		}
		this.renderTree();
	}
}
