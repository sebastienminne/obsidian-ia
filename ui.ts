import { App, Modal, Setting, Notice } from 'obsidian';
import { SuggestedTag } from './llm_provider';

export class TagSuggestionModal extends Modal {
    private suggestions: SuggestedTag[];
    private onSubmit: (selectedTags: string[]) => void;
    private selectedTags: Set<string>;

    constructor(app: App, suggestions: SuggestedTag[], onSubmit: (selectedTags: string[]) => void) {
        super(app);
        this.suggestions = suggestions;
        this.onSubmit = onSubmit;
        this.selectedTags = new Set(suggestions.map(s => s.tag)); // Default to all selected
    }

    onOpen() {
        const { contentEl } = this;

        new Setting(contentEl).setName('Suggested tags').setHeading();

        const tagsContainer = contentEl.createDiv({ cls: 'tag-suggestions-container' });

        // Group suggestions
        const existingTags = this.suggestions.filter(s => s.type === 'existing');
        const newTags = this.suggestions.filter(s => s.type === 'new');

        if (existingTags.length > 0) {
            new Setting(tagsContainer).setName('Existing tags').setHeading();
            this.createTagList(tagsContainer, existingTags);
        }

        if (newTags.length > 0) {
            new Setting(tagsContainer).setName('New tags').setHeading();
            this.createTagList(tagsContainer, newTags);
        }

        new Setting(contentEl)
            .addButton(btn => btn
                .setButtonText('Add selected tags')
                .setCta()
                .onClick(() => {
                    this.close();
                    this.onSubmit(Array.from(this.selectedTags));
                }));
    }

    createTagList(container: HTMLElement, tags: SuggestedTag[]) {
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
        new Setting(contentEl).setName('Meeting minutes summary').setHeading();

        const summaryContainer = contentEl.createDiv({ cls: 'summary-container' });
        summaryContainer.createEl('p', { text: this.summary });

        const buttonContainer = contentEl.createDiv({ cls: 'summary-buttons' });

        // Add to Note Button
        const addToNoteBtn = buttonContainer.createEl('button', { text: 'Add to note header' });
        addToNoteBtn.addEventListener('click', () => {
            this.onAddToNote();
            this.close();
        });

        // Copy Button
        const copyBtn = buttonContainer.createEl('button', { text: 'Copy to clipboard' });
        copyBtn.classList.add('mod-cta'); // Make it primary
        copyBtn.addEventListener('click', () => {
            void (async () => {
                await navigator.clipboard.writeText(this.summary);
                new Notice('Summary copied to clipboard!');
                this.close();
            })();
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
