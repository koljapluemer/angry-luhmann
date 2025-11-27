import { App, SuggestModal } from "obsidian";
import { ZkEntry } from "./zkTree";

interface ParentSuggestion {
	display: string;
	entry: ZkEntry;
}

export class PlaceChildModal extends SuggestModal<ParentSuggestion> {
	private entries: ZkEntry[];
	private onChoose: (entry: ZkEntry) => void;
	limit = 20;

	constructor(app: App, entries: ZkEntry[], onChoose: (entry: ZkEntry) => void) {
		super(app);
		this.entries = entries;
		this.onChoose = onChoose;
		this.setPlaceholder("Search zk-id notes...");
	}

	getSuggestions(query: string): ParentSuggestion[] {
		const lower = query.toLowerCase();
		const filtered = this.entries.filter((entry) => {
			if (!lower) return true;
			return entry.file.basename.toLowerCase().includes(lower) || entry.id.toLowerCase().includes(lower);
		});

		return filtered.slice(0, this.limit).map((entry) => ({
			display: `${entry.id} — ${entry.file.basename}`,
			entry,
		}));
	}

	renderSuggestion(value: ParentSuggestion, el: HTMLElement) {
		el.setText(value.display);
	}

	onChooseSuggestion(item: ParentSuggestion) {
		this.onChoose(item.entry);
	}
}
