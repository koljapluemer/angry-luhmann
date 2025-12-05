import { App, Modal } from "obsidian";

export class ConfirmationModal extends Modal {
	private message: string;
	private onConfirm: () => void;
	private onCancel?: () => void;

	constructor(app: App, message: string, onConfirm: () => void, onCancel?: () => void) {
		super(app);
		this.message = message;
		this.onConfirm = onConfirm;
		this.onCancel = onCancel;
	}

	onOpen() {
		const { contentEl } = this;

		contentEl.createEl("h2", { text: "Confirm Action" });
		contentEl.createEl("p", { text: this.message });

		const buttonContainer = contentEl.createDiv({ cls: "modal-button-container" });

		const confirmBtn = buttonContainer.createEl("button", {
			text: "Confirm",
			cls: "mod-cta",
		});
		confirmBtn.addEventListener("click", () => {
			this.close();
			this.onConfirm();
		});

		const cancelBtn = buttonContainer.createEl("button", { text: "Cancel" });
		cancelBtn.addEventListener("click", () => {
			this.close();
			if (this.onCancel) this.onCancel();
		});
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
