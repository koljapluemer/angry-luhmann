import { App, CachedMetadata, TFile } from "obsidian";
import { Minimatch } from "minimatch";
import { CachedEntry, ZkEntry, ZK_ID_PATTERN } from "./types";

/**
 * Centralized cache for ZK entries.
 * Provides O(1) lookup and incremental updates to avoid full vault scans.
 */
export class ZkEntryCache {
	private app: App;

	// O(1) lookup maps
	private entriesById: Map<string, CachedEntry> = new Map();
	private entriesByPath: Map<string, CachedEntry> = new Map();

	// Cached derived data (invalidated on change)
	private allEntriesCache: ZkEntry[] | null = null;
	private maxTopLevelIdCache: number | null = null;

	// Compiled patterns (rebuilt on settings change only)
	private compiledPatterns: Minimatch[] = [];
	private patternsString = "";
	private useIncludeMode = false;

	constructor(app: App) {
		this.app = app;
	}

	/**
	 * Full rebuild of the cache. Call on startup and when patterns change.
	 */
	rebuild(patterns: string, useIncludeMode: boolean): void {
		// Update and compile patterns if changed
		if (patterns !== this.patternsString || useIncludeMode !== this.useIncludeMode) {
			this.patternsString = patterns;
			this.useIncludeMode = useIncludeMode;
			this.compilePatterns();
		}

		// Clear all caches
		this.entriesById.clear();
		this.entriesByPath.clear();
		this.invalidateDerivedData();

		// Scan all markdown files
		for (const file of this.app.vault.getMarkdownFiles()) {
			this.processFile(file);
		}
	}

	/**
	 * Incremental update: add or update a single file.
	 * @param file - The file to update
	 * @param cache - Optional pre-fetched metadata cache (avoids stale reads)
	 */
	updateFile(file: TFile, cache?: CachedMetadata | null): void {
		// Remove old entry if exists
		const oldEntry = this.entriesByPath.get(file.path);
		if (oldEntry) {
			this.entriesById.delete(oldEntry.id);
			this.entriesByPath.delete(file.path);
		}

		// Process the file (may add new entry)
		this.processFile(file, cache);

		// Invalidate derived data
		this.invalidateDerivedData();
	}

	/**
	 * Incremental update: remove a file.
	 */
	removeFile(path: string): void {
		const entry = this.entriesByPath.get(path);
		if (entry) {
			this.entriesById.delete(entry.id);
			this.entriesByPath.delete(path);
			this.invalidateDerivedData();
		}
	}

	/**
	 * Handle file rename: remove old path and add new file.
	 */
	renameFile(oldPath: string, newFile: TFile): void {
		this.removeFile(oldPath);
		this.updateFile(newFile);
	}

	/**
	 * Update patterns and mode. Triggers full rebuild if changed.
	 */
	updatePatterns(patterns: string, useIncludeMode: boolean): void {
		if (patterns !== this.patternsString || useIncludeMode !== this.useIncludeMode) {
			this.rebuild(patterns, useIncludeMode);
		}
	}

	/**
	 * Get all entries as an array (cached).
	 */
	getEntries(): ZkEntry[] {
		if (this.allEntriesCache === null) {
			this.allEntriesCache = Array.from(this.entriesById.values());
		}
		return this.allEntriesCache;
	}

	/**
	 * O(1) check if a zkId exists in the cache.
	 */
	hasZkId(zkId: string): boolean {
		return this.entriesById.has(zkId);
	}

	/**
	 * O(1) lookup by zkId.
	 */
	getEntryByZkId(zkId: string): CachedEntry | undefined {
		return this.entriesById.get(zkId);
	}

	/**
	 * O(1) lookup by file path.
	 */
	getEntryByPath(path: string): CachedEntry | undefined {
		return this.entriesByPath.get(path);
	}

	/**
	 * Find the next available top-level ID.
	 * Uses cached max value for O(1) after first computation.
	 */
	findNextTopLevelId(): number {
		if (this.maxTopLevelIdCache === null) {
			let maxId = -1;

			for (const entry of this.entriesById.values()) {
				if (!ZK_ID_PATTERN.test(entry.id)) {
					continue;
				}

				const [firstPart] = entry.id.split(".");
				const topLevel = Number(firstPart);

				if (!Number.isNaN(topLevel)) {
					maxId = Math.max(maxId, topLevel);
				}
			}

			this.maxTopLevelIdCache = maxId;
		}

		return this.maxTopLevelIdCache + 1;
	}

	/**
	 * Find the next child ID for a given parent.
	 */
	findNextChildId(parentId: string): string {
		const depth = parentId.split(".").length + 1;
		let maxChild = -1;

		for (const entry of this.entriesById.values()) {
			if (!entry.id.startsWith(`${parentId}.`)) {
				continue;
			}

			const parts = entry.id.split(".");
			if (parts.length !== depth) {
				continue;
			}

			const last = Number(parts[parts.length - 1]);
			if (!Number.isNaN(last)) {
				maxChild = Math.max(maxChild, last);
			}
		}

		return `${parentId}.${maxChild + 1}`;
	}

	/**
	 * Find the next following ID (sibling after current).
	 */
	findNextFollowingId(currentId: string): string | null {
		if (!ZK_ID_PATTERN.test(currentId)) {
			return null;
		}

		const used = new Set(this.entriesById.keys());
		const parts = currentId.split(".");
		const parentParts = parts.slice(0, -1);
		const parentPrefix = parentParts.length ? `${parentParts.join(".")}.` : "";
		const currentNumber = Number(parts[parts.length - 1]);

		if (Number.isNaN(currentNumber)) {
			return null;
		}

		let candidate = currentNumber + 1;
		let nextId = `${parentPrefix}${candidate}`;

		while (used.has(nextId)) {
			candidate += 1;
			nextId = `${parentPrefix}${candidate}`;
		}

		return nextId;
	}

	/**
	 * Get list of all entries that can be used as parents.
	 */
	listPlacableParents(): ZkEntry[] {
		return this.getEntries();
	}

	/**
	 * Check if a note has valid ZK placement.
	 * Uses O(1) parent lookup instead of full vault scan.
	 */
	hasValidZkPlacement(file: TFile): boolean {
		const cache = this.app.metadataCache.getFileCache(file);
		const zkId = cache?.frontmatter?.["zk-id"];

		if (zkId === undefined) {
			return false;
		}

		const idStr = String(zkId).trim();

		// "-1" means explicitly outside ZK
		if (idStr === "-1") {
			return false;
		}

		// Must match the pattern
		if (!ZK_ID_PATTERN.test(idStr)) {
			return false;
		}

		// Top-level notes are valid if pattern matches
		const parts = idStr.split(".");
		if (parts.length === 1) {
			return true;
		}

		// Non-top-level notes need a valid parent - O(1) lookup!
		const parentId = parts.slice(0, -1).join(".");
		return this.hasZkId(parentId);
	}

	// Private methods

	private compilePatterns(): void {
		this.compiledPatterns = [];

		if (!this.patternsString.trim()) {
			return;
		}

		const patternList = this.patternsString
			.split("\n")
			.map((p) => p.trim())
			.filter((p) => p.length > 0);

		for (const pattern of patternList) {
			try {
				this.compiledPatterns.push(new Minimatch(pattern));
			} catch {
				// Skip invalid patterns
			}
		}
	}

	private shouldIncludeFile(file: TFile): boolean {
		// No patterns = include all in exclude mode, none in include mode
		if (this.compiledPatterns.length === 0) {
			return !this.useIncludeMode;
		}

		const filePath = file.path;
		const matchesAnyPattern = this.compiledPatterns.some((pattern) =>
			pattern.match(filePath)
		);

		// Include mode: include if matches
		// Exclude mode: include if NOT matches
		return this.useIncludeMode ? matchesAnyPattern : !matchesAnyPattern;
	}

	private processFile(file: TFile, providedCache?: CachedMetadata | null): void {
		// Skip non-markdown files
		if (file.extension !== "md") {
			return;
		}

		// Skip files based on pattern mode
		if (!this.shouldIncludeFile(file)) {
			return;
		}

		// Use provided cache if available, otherwise fetch (may be stale)
		const cache = providedCache ?? this.app.metadataCache.getFileCache(file);
		const zkId = cache?.frontmatter?.["zk-id"];

		if (typeof zkId === "string" || typeof zkId === "number") {
			const idStr = String(zkId).trim();

			// Skip entries marked as outside ZK (zk-id: -1)
			if (idStr === "-1") {
				return;
			}

			const entry: CachedEntry = {
				id: idStr,
				file,
				path: file.path
			};

			this.entriesById.set(idStr, entry);
			this.entriesByPath.set(file.path, entry);
		}
	}

	private invalidateDerivedData(): void {
		this.allEntriesCache = null;
		this.maxTopLevelIdCache = null;
	}
}
