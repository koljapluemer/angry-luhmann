import { App, PluginSettingTab, Setting } from "obsidian";
import type AngryLuhmannPlugin from "./main";

export interface AngryLuhmannSettings {
	useDebugNote: boolean;
}

export const DEFAULT_SETTINGS: AngryLuhmannSettings = {
	useDebugNote: false,
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
			.setName("Use Debug Note")
			.setDesc("Create/refresh angry-luhmann-debug.md with zk-ids and errors.")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.useDebugNote)
					.onChange(async (value) => {
						this.plugin.settings.useDebugNote = value;
						await this.plugin.saveSettings();
						if (value) {
							await this.plugin.refreshTree();
						}
					})
			);
	}
}
