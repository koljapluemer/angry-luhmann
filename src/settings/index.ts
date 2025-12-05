import { App, PluginSettingTab, Setting } from "obsidian";
import type AngryLuhmannPlugin from "../plugin";

export interface AngryLuhmannSettings {
	overviewNotePath: string;
	autoUpdateOverview: boolean;
}

export const DEFAULT_SETTINGS: AngryLuhmannSettings = {
	overviewNotePath: "",
	autoUpdateOverview: false,
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
	}
}
