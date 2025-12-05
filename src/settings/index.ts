import { App, PluginSettingTab } from "obsidian";
import type AngryLuhmannPlugin from "../plugin";

export interface AngryLuhmannSettings {
}

export const DEFAULT_SETTINGS: AngryLuhmannSettings = {
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
	}
}
