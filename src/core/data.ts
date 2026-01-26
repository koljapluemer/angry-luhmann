import { TFile } from "obsidian";
import { ZkEntry } from "./types";
import { ZkEntryCache } from "./ZkEntryCache";

/**
 * Check if a note has a valid zk-id placement in the tree.
 * Returns true only if the note has a properly formatted zk-id AND
 * (for non-top-level notes) a valid parent exists.
 *
 * @param cache - The ZkEntryCache for O(1) parent lookup
 * @param file - The file to check
 */
export function hasValidZkPlacement(cache: ZkEntryCache, file: TFile): boolean {
	return cache.hasValidZkPlacement(file);
}

/**
 * Collect all ZK entries from the cache.
 *
 * @param cache - The ZkEntryCache to get entries from
 */
export function collectZkEntries(cache: ZkEntryCache): ZkEntry[] {
	return cache.getEntries();
}

/**
 * Find the next available top-level ID.
 *
 * @param cache - The ZkEntryCache to use
 */
export function findNextTopLevelId(cache: ZkEntryCache): number {
	return cache.findNextTopLevelId();
}

/**
 * List all entries that can be used as parents.
 *
 * @param cache - The ZkEntryCache to use
 */
export function listPlacableParents(cache: ZkEntryCache): ZkEntry[] {
	return cache.listPlacableParents();
}

/**
 * Find the next child ID for a given parent.
 *
 * @param parentId - The parent's zk-id
 * @param cache - The ZkEntryCache to use
 */
export function findNextChildId(parentId: string, cache: ZkEntryCache): string {
	return cache.findNextChildId(parentId);
}

/**
 * Find the next following ID (sibling after current).
 *
 * @param currentId - The current note's zk-id
 * @param cache - The ZkEntryCache to use
 */
export function findNextFollowingId(currentId: string, cache: ZkEntryCache): string | null {
	return cache.findNextFollowingId(currentId);
}

/**
 * Check if a zkId exists in the cache.
 *
 * @param cache - The ZkEntryCache to use
 * @param zkId - The zk-id to check for
 */
export function hasNoteWithZkId(cache: ZkEntryCache, zkId: string): boolean {
	return cache.hasZkId(zkId);
}
