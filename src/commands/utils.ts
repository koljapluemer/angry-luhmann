import { Notice, TFile } from "obsidian";
import type AngryLuhmannPlugin from "../plugin";
import { generateNavigationLink, removeNavigationLinks } from "../utils/navigationLinks";

export function getUniqueNotePath(plugin: AngryLuhmannPlugin, folderPath: string, baseName: string): string {
	let name = baseName || "Untitled";
	let attempt = 0;

	while (true) {
		const candidateName = attempt === 0 ? name : `${name} ${attempt}`;
		const candidatePath = folderPath ? `${folderPath}/${candidateName}.md` : `${candidateName}.md`;
		if (!plugin.app.vault.getAbstractFileByPath(candidatePath)) {
			return candidatePath;
		}
		attempt += 1;
	}
}

export async function processNavigationLinks(plugin: AngryLuhmannPlugin, filesInOrder: TFile[]) {
	let successCount = 0;
	let errorCount = 0;

	new Notice(`Processing ${filesInOrder.length} notes...`);

	for (let i = 0; i < filesInOrder.length; i++) {
		const file = filesInOrder[i];
		const prevFile = i > 0 ? filesInOrder[i - 1] : null;
		const nextFile = i < filesInOrder.length - 1 ? filesInOrder[i + 1] : null;

		try {
			// Use Vault.process() instead of vault.modify() for atomic operations
			await plugin.app.vault.process(file, (content) => {
				const cleanedContent = removeNavigationLinks(content);
				const navLink = generateNavigationLink(prevFile, nextFile);
				return cleanedContent + navLink;
			});
			successCount++;
		} catch (error) {
			errorCount++;
			console.error(`Failed to process ${file.basename}:`, error);
		}
	}

	if (errorCount === 0) {
		new Notice(`Successfully added navigation links to ${successCount} notes`);
	} else {
		new Notice(`Added links to ${successCount} notes, ${errorCount} failed. Check console for details.`);
	}
}
