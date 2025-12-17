import { App, PluginSettingTab, Setting } from "obsidian";
import type AngryLuhmannPlugin from "../plugin";

export type OverviewNoteStyle = "indent" | "bullet";

export interface AngryLuhmannSettings {
	overviewNotePath: string;
	autoUpdateOverview: boolean;
	overviewNoteStyle: OverviewNoteStyle;
	excludePatterns: string;
	useIncludeMode: boolean;
}

export const DEFAULT_SETTINGS: AngryLuhmannSettings = {
	overviewNotePath: "",
	autoUpdateOverview: false,
	overviewNoteStyle: "indent",
	excludePatterns: "",
	useIncludeMode: false,
};

export class AngryLuhmannSettingTab extends PluginSettingTab {
	plugin: AngryLuhmannPlugin;

	constructor(app: App, plugin: AngryLuhmannPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName("ZK Overview note path")
			.setDesc("Path to a note that will show the tree visualization (e.g., 'ZK Overview.md')")
			.addText((text) =>
				text
					.setPlaceholder("e.g., ZK Overview.md")
					.setValue(this.plugin.settings.overviewNotePath)
					.onChange(async (value) => {
						this.plugin.settings.overviewNotePath = value;
						await this.plugin.saveSettings();
						if (value.trim()) {
							await this.plugin.updateOverviewNote();
						}
					})
			);

		new Setting(containerEl)
			.setName("Update ZK Overview note automatically")
			.setDesc("When enabled, the overview note updates automatically after changes. When disabled, only updates on plugin load and manual refresh command.")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.autoUpdateOverview)
					.onChange(async (value) => {
						this.plugin.settings.autoUpdateOverview = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Overview note style")
			.setDesc("Choose how to format the tree structure in the overview note.")
			.addDropdown((dropdown) =>
				dropdown
					.addOption("indent", "Indent")
					.addOption("bullet", "Bullet points")
					.setValue(this.plugin.settings.overviewNoteStyle)
					.onChange(async (value: OverviewNoteStyle) => {
						this.plugin.settings.overviewNoteStyle = value;
						await this.plugin.saveSettings();
						if (this.plugin.settings.overviewNotePath.trim()) {
							await this.plugin.updateOverviewNote();
						}
					})
			);

		new Setting(containerEl)
			.setName("Use include mode (whitelist)")
			.setDesc("When enabled, only files matching the patterns below are included. When disabled, matching files are excluded.")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.useIncludeMode)
					.onChange(async (value) => {
						this.plugin.settings.useIncludeMode = value;
						await this.plugin.saveSettings();
						await this.plugin.refreshTree();
						this.display(); // Re-render to update description
					})
			);

		const getDescription = (useIncludeMode: boolean) => {
			if (useIncludeMode) {
				return "Glob patterns (one per line) to include notes in Zettelkasten. Only matching notes are included. Examples: Projects/**, Research/*.md";
			} else {
				return "Glob patterns (one per line) to exclude notes from Zettelkasten entirely. Examples: Templates/**, Daily/*, **draft*.md";
			}
		};

		const getPlaceholder = (useIncludeMode: boolean) => {
			if (useIncludeMode) {
				return "Projects/**\nResearch/*.md";
			} else {
				return "Templates/**\nDaily/*\n**draft*.md";
			}
		};

		new Setting(containerEl)
			.setName("Filter patterns")
			.setDesc(getDescription(this.plugin.settings.useIncludeMode))
			.addTextArea((text) =>
				text
					.setPlaceholder(getPlaceholder(this.plugin.settings.useIncludeMode))
					.setValue(this.plugin.settings.excludePatterns)
					.onChange(async (value) => {
						this.plugin.settings.excludePatterns = value;
						await this.plugin.saveSettings();
						await this.plugin.refreshTree();
					})
			);
	}
}
