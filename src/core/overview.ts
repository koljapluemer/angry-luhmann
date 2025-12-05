import { RenderedZkLine } from "./types";

export function generateMarkdownTree(lines: RenderedZkLine[]): string {
	if (lines.length === 0) {
		return "";
	}

	const treeLines = lines.map((line) => {
		const link = `[[${line.file.basename}]]`;
		const indent = "\t".repeat(line.depth);
		return `${indent}${link}`;
	});

	return treeLines.join("\n");
}
