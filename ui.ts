import { App, Modal, Setting } from 'obsidian';

export class TagSuggestionModal extends Modal {
    private suggestions: string[];
    private onSubmit: (selectedTags: string[]) => void;
    private selectedTags: Set<string>;

    constructor(app: App, suggestions: string[], onSubmit: (selectedTags: string[]) => void) {
        super(app);
        this.suggestions = suggestions;
        this.onSubmit = onSubmit;
        this.selectedTags = new Set(suggestions); // Default to all selected
    }

    onOpen() {
        const { contentEl } = this;

        contentEl.createEl('h2', { text: 'Suggested Tags' });

        const tagsContainer = contentEl.createDiv({ cls: 'tag-suggestions-container' });
        // Add some basic styling
        tagsContainer.style.display = 'flex';
        tagsContainer.style.flexDirection = 'column';
        tagsContainer.style.gap = '10px';
        tagsContainer.style.marginBottom = '20px';

        this.suggestions.forEach(tag => {
            new Setting(tagsContainer)
                .setName(tag)
                .addToggle(toggle => toggle
                    .setValue(true)
                    .onChange(value => {
                        if (value) {
                            this.selectedTags.add(tag);
                        } else {
                            this.selectedTags.delete(tag);
                        }
                    }));
        });

        new Setting(contentEl)
            .addButton(btn => btn
                .setButtonText('Add Selected Tags')
                .setCta()
                .onClick(() => {
                    this.close();
                    this.onSubmit(Array.from(this.selectedTags));
                }));
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
