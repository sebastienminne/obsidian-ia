import { App, Modal, Setting, Notice } from 'obsidian';

export class TagSuggestionModal extends Modal {
    private suggestions: any[]; // Using any to avoid importing SuggestedTag here if lazy, but better to import
    private onSubmit: (selectedTags: string[]) => void;
    private selectedTags: Set<string>;

    constructor(app: App, suggestions: any[], onSubmit: (selectedTags: string[]) => void) {
        super(app);
        this.suggestions = suggestions;
        this.onSubmit = onSubmit;
        this.selectedTags = new Set(suggestions.map(s => s.tag)); // Default to all selected
    }

    onOpen() {
        const { contentEl } = this;

        contentEl.createEl('h2', { text: 'Suggested Tags' });

        const tagsContainer = contentEl.createDiv({ cls: 'tag-suggestions-container' });
        tagsContainer.style.display = 'flex';
        tagsContainer.style.flexDirection = 'column';
        tagsContainer.style.gap = '10px';
        tagsContainer.style.marginBottom = '20px';

        // Group suggestions
        const existingTags = this.suggestions.filter(s => s.type === 'existing');
        const newTags = this.suggestions.filter(s => s.type === 'new');

        if (existingTags.length > 0) {
            tagsContainer.createEl('h3', { text: 'Existing Tags', cls: 'tag-group-header' });
            this.createTagList(tagsContainer, existingTags);
        }

        if (newTags.length > 0) {
            tagsContainer.createEl('h3', { text: 'New Tags', cls: 'tag-group-header' });
            this.createTagList(tagsContainer, newTags);
        }

        new Setting(contentEl)
            .addButton(btn => btn
                .setButtonText('Add Selected Tags')
                .setCta()
                .onClick(() => {
                    this.close();
                    this.onSubmit(Array.from(this.selectedTags));
                }));
    }

    createTagList(container: HTMLElement, tags: any[]) {
        tags.forEach(item => {
            const setting = new Setting(container)
                .setName(item.tag)
                .setDesc(item.justification) // Shows description in small text
                .addToggle(toggle => toggle
                    .setValue(true)
                    .onChange(value => {
                        if (value) {
                            this.selectedTags.add(item.tag);
                        } else {
                            this.selectedTags.delete(item.tag);
                        }
                    }));

            // Add tooltip for better visibility if needed
            setting.settingEl.title = item.justification;
        });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

export class SummaryModal extends Modal {
    private summary: string;
    private onAddToNote: () => void; // Callback for adding to note

    constructor(app: App, summary: string, onAddToNote: () => void) {
        super(app);
        this.summary = summary;
        this.onAddToNote = onAddToNote;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.createEl('h2', { text: 'Meeting Minutes Summary' });

        const summaryContainer = contentEl.createDiv({ cls: 'summary-container' });
        summaryContainer.style.marginBottom = '20px';
        summaryContainer.style.whiteSpace = 'pre-wrap';
        summaryContainer.style.userSelect = 'text';
        summaryContainer.createEl('p', { text: this.summary });

        const buttonContainer = contentEl.createDiv({ cls: 'summary-buttons' });
        buttonContainer.style.display = 'flex';
        buttonContainer.style.justifyContent = 'flex-end'; // Right align
        buttonContainer.style.gap = '10px'; // Space between buttons
        buttonContainer.style.marginTop = '20px';

        // Add to Note Button
        const addToNoteBtn = buttonContainer.createEl('button', { text: 'Add to Note Header' });
        addToNoteBtn.addEventListener('click', () => {
            this.onAddToNote();
            this.close();
        });

        // Copy Button
        const copyBtn = buttonContainer.createEl('button', { text: 'Copy to Clipboard' });
        copyBtn.classList.add('mod-cta'); // Make it primary
        copyBtn.addEventListener('click', async () => {
            await navigator.clipboard.writeText(this.summary);
            new Notice('Summary copied to clipboard!');
            this.close();
        });

        // Close Button
        const closeBtn = buttonContainer.createEl('button', { text: 'Close' });
        closeBtn.addEventListener('click', () => {
            this.close();
        });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
