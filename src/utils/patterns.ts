import type { TFile } from "obsidian";
import { minimatch } from "minimatch";

/**
 * Checks if a file path matches any of the exclude patterns
 */
export function isFileExcluded(file: TFile, excludePatterns: string): boolean {
	if (!excludePatterns.trim()) {
		return false;
	}

	const patterns = excludePatterns
		.split("\n")
		.map((p) => p.trim())
		.filter((p) => p.length > 0);

	if (patterns.length === 0) {
		return false;
	}

	const filePath = file.path;

	for (const pattern of patterns) {
		if (minimatch(filePath, pattern)) {
			return true;
		}
	}

	return false;
}
