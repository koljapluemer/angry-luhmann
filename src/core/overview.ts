import { RenderedZkLine } from "./types";
import { OverviewNoteStyle } from "../settings";

export function generateMarkdownTree(lines: RenderedZkLine[], style: OverviewNoteStyle): string {
	if (lines.length === 0) {
		return "";
	}

	const treeLines = lines.map((line) => {
		const link = `[[${line.file.basename}]]`;

		if (style === "bullet") {
			const indent = "\t".repeat(line.depth);
			return `${indent}- ${link}`;
		} else {
			const indent = "\t".repeat(line.depth);
			return `${indent}${link}`;
		}
	});

	return treeLines.join("\n");
}
