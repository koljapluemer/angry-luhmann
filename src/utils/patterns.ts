import type { TFile } from "obsidian";
import { minimatch } from "minimatch";

/**
 * Determines if a file should be included based on patterns and mode
 */
export function shouldIncludeFile(
	file: TFile,
	patterns: string,
	useIncludeMode: boolean
): boolean {
	// No patterns = include all in exclude mode, none in include mode
	if (!patterns.trim()) {
		return !useIncludeMode;
	}

	const patternList = patterns
		.split("\n")
		.map((p) => p.trim())
		.filter((p) => p.length > 0);

	if (patternList.length === 0) {
		return !useIncludeMode;
	}

	const filePath = file.path;
	const matchesAnyPattern = patternList.some((pattern) =>
		minimatch(filePath, pattern)
	);

	// Include mode: include if matches
	// Exclude mode: include if NOT matches
	return useIncludeMode ? matchesAnyPattern : !matchesAnyPattern;
}

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
