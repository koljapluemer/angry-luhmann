import { TFile } from "obsidian";

// Regex to match navigation link patterns anywhere in the content
const NAV_LINK_PATTERN = /^.*?(←\[\[.+?\]\]( \| \[\[.+?\]\]→)?|\[\[.+?\]\]→).*?$/gm;

export function removeNavigationLinks(content: string): string {
	return content.replace(NAV_LINK_PATTERN, "").trim();
}

export function generateNavigationLink(prevFile: TFile | null, nextFile: TFile | null): string {
	const parts: string[] = [];

	if (prevFile) {
		parts.push(`←[[${prevFile.basename}]]`);
	}

	if (nextFile) {
		parts.push(`[[${nextFile.basename}]]→`);
	}

	if (parts.length === 0) {
		return "";
	}

	return "\n\n" + parts.join(" | ");
}
