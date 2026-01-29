import { App, Editor, MarkdownView, Menu, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { LLMProvider } from './llm_provider';
import { OllamaService } from './ollama_service';
import { TagSuggestionModal, SummaryModal } from './ui';
import { insertMeetingMinutes } from './text_utils';

interface OllamaTaggerSettings {
    ollamaUrl: string;
    modelName: string;
    tagSuggestionPrompt: string;
    spellCorrectionPrompt: string;
    meetingMinutesPrompt: string;
    creativity: number;
}

const DEFAULT_SETTINGS: OllamaTaggerSettings = {
    ollamaUrl: 'http://localhost:11434',
    modelName: 'llama3',
    tagSuggestionPrompt: '',
    spellCorrectionPrompt: '',
    meetingMinutesPrompt: '',
    creativity: 0.7
}

export default class OllamaTaggerPlugin extends Plugin {
    settings: OllamaTaggerSettings;
    llmProvider: LLMProvider;

    async onload() {
        await this.loadSettings();

        this.initializeProvider();

        // This creates an icon in the left ribbon.
        // This creates an icon in the left ribbon.
        this.addRibbonIcon('bot', 'Local LLM Actions', (evt: MouseEvent) => {
            const menu = new Menu();

            menu.addItem((item) =>
                item
                    .setTitle('Suggest tags')
                    .setIcon('tag')
                    .onClick(() => {
                        void this.suggestTags();
                    })
            );

            menu.addItem((item) =>
                item
                    .setTitle('Correct text')
                    .setIcon('check-circle')
                    .onClick(() => {
                        const view = this.app.workspace.getActiveViewOfType(MarkdownView);
                        if (view) {
                            void this.handleCorrection(view.editor);
                        } else {
                            new Notice("No active editor");
                        }
                    })
            );

            menu.addItem((item) =>
                item
                    .setTitle('Generate meeting minutes')
                    .setIcon('file-text')
                    .onClick(() => {
                        const view = this.app.workspace.getActiveViewOfType(MarkdownView);
                        if (view) {
                            void this.generateMeetingMinutes(view.editor, view);
                        } else {
                            new Notice("No active editor");
                        }
                    })
            );

            menu.showAtMouseEvent(evt);
        });

        // This adds a simple command that can be triggered anywhere
        this.addCommand({
            id: 'suggest-tags-ollama',
            name: 'Suggest tags',
            editorCallback: (editor: Editor, view: MarkdownView) => {
                void this.suggestTags(editor, view);
            }
        });

        new Notice("Local LLM v1.1.0 Loaded");

        // Add context menu item for correction
        this.registerEvent(
            this.app.workspace.on("editor-menu", (menu, editor, view) => {
                menu.addItem((item) => {
                    item
                        .setTitle("Correct text")
                        .setIcon("check-circle")
                        .onClick(() => {
                            void this.handleCorrection(editor);
                        });
                });
                menu.addItem((item) => {
                    item
                        .setTitle("Generate meeting minutes")
                        .setIcon("file-text")
                        .onClick(() => {
                            if (view instanceof MarkdownView) {
                                void this.generateMeetingMinutes(editor, view);
                            }
                        });
                });
            })
        );

        this.addCommand({
            id: 'correct-text-ollama',
            name: 'Correct selected text',
            editorCallback: (editor: Editor, view: MarkdownView) => {
                void this.handleCorrection(editor);
            }
        });

        this.addCommand({
            id: 'generate-meeting-minutes',
            name: 'Generate meeting minutes',
            editorCallback: (editor: Editor, view: MarkdownView) => {
                void this.generateMeetingMinutes(editor, view);
            }
        });
        // This adds a settings tab so the user can configure various aspects of the plugin
        this.addSettingTab(new OllamaTaggerSettingTab(this.app, this));
    }

    async handleCorrection(editor: Editor) {
        const selection = editor.getSelection();
        if (!selection) {
            new Notice("Veuillez sélectionner du texte à corriger.");
            return;
        }

        new Notice("Correction en cours...");
        try {
            const corrected = await this.llmProvider.correctText(selection, this.settings.spellCorrectionPrompt);
            editor.replaceSelection(corrected);
            new Notice("Texte corrigé !");
        } catch (error) {
            new Notice("Erreur lors de la correction : " + error.message);
        }
    }

    initializeProvider() {
        this.llmProvider = new OllamaService(this.settings.ollamaUrl, this.settings.modelName);
    }

    onunload() {

    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
        this.initializeProvider(); // Re-init provider on save
    }

    async suggestTags(editor?: Editor, view?: MarkdownView) {
        if (!view) {
            view = this.app.workspace.getActiveViewOfType(MarkdownView);
        }
        if (!view) {
            new Notice('No active Markdown view');
            return;
        }

        const content = view.getViewData();

        new Notice(`Generating tag suggestions using Ollama...`);

        try {
            // Define extended interface for internal API
            interface ExtendedMetadataCache {
                getTags(): Record<string, number>;
            }
            const allTags = (this.app.metadataCache as unknown as ExtendedMetadataCache).getTags();

            // Pass the entire record { '#tag': count } to the provider
            const suggestedTags = await this.llmProvider.generateTags(content, allTags, this.settings.tagSuggestionPrompt);
            new TagSuggestionModal(this.app, suggestedTags, (selectedTags) => {
                this.addTagsToNote(view!, selectedTags);
            }).open();
        } catch (error) {
            new Notice('Error generating tags: ' + error.message);
            console.error(error);
        }
    }

    async generateMeetingMinutes(editor: Editor, view: MarkdownView) {
        if (!view) {
            new Notice('No active Markdown view');
            return;
        }

        const content = view.getViewData();
        new Notice(`Generating meeting minutes...`);

        try {
            const summary = await this.llmProvider.generateSummary(content, this.settings.meetingMinutesPrompt);
            if (summary) {
                new SummaryModal(this.app, summary, () => {
                    this.handleAddToNote(view, summary);
                }).open();
            } else {
                new Notice("Failed to generate summary.");
            }
        } catch (error) {
            new Notice('Error generating summary: ' + error.message);
            console.error(error);
        }
    }

    handleAddToNote(view: MarkdownView, summary: string) {
        const currentContent = view.getViewData();
        const newContent = insertMeetingMinutes(currentContent, summary);
        view.setViewData(newContent, false);
        new Notice("Meeting minutes added to note!");
    }

    addTagsToNote(view: MarkdownView, tags: string[]) {
        // Add tags to frontmatter or append to file
        this.app.fileManager.processFrontMatter(view.file, (frontmatter) => {
            if (!frontmatter['tags']) {
                frontmatter['tags'] = [];
            }
            // Handle if tags is a string or array
            let currentTags = frontmatter['tags'];
            if (typeof currentTags === 'string') {
                currentTags = [currentTags];
            }

            // Add new tags avoiding duplicates
            tags.forEach(tag => {
                if (!currentTags.includes(tag)) {
                    currentTags.push(tag);
                }
            });
            frontmatter['tags'] = currentTags;
        });
    }
}

class OllamaTaggerSettingTab extends PluginSettingTab {
    plugin: OllamaTaggerPlugin;

    constructor(app: App, plugin: OllamaTaggerPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;

        containerEl.empty();

        new Setting(containerEl).setName('Local LLM settings').setHeading();

        new Setting(containerEl)
            .setName('Ollama URL')
            .setDesc('The URL of your local Ollama instance')
            .addText(text => text
                .setPlaceholder('http://localhost:11434')
                .setValue(this.plugin.settings.ollamaUrl)
                .onChange(async (value) => {
                    this.plugin.settings.ollamaUrl = value;
                    await this.plugin.saveSettings();
                }));


        // Better approach for Async Dropdown in Obsidian Settings:
        const modelSetting = new Setting(containerEl)
            .setName('Model name')
            .setDesc('Select the model to use.');

        modelSetting.addDropdown(dropdown => {
            dropdown.addOption('', 'Loading models...');
            dropdown.setValue('');
        });

        // Load models asynchronously
        (async () => {
            let models: string[] = [];
            try {
                if (this.plugin.llmProvider && this.plugin.llmProvider.getModels) {
                    models = await this.plugin.llmProvider.getModels();
                }
            } catch (e) {
                console.error("Failed to load models in settings:", e);
            }

            // Sort models
            models.sort();

            const dropdownComponent = (modelSetting.components[0] as any);

            // Clear options (select element)
            if (dropdownComponent && dropdownComponent.selectEl) {
                dropdownComponent.selectEl.innerHTML = ''; // Clear loading

                if (models.length === 0) {
                    const opt = dropdownComponent.selectEl.createEl('option');
                    opt.text = "No models found (check URL)";
                    opt.value = "";
                    // Keep current value if possible, so user isn't stuck
                    if (this.plugin.settings.modelName) {
                        const currentOpt = dropdownComponent.selectEl.createEl('option');
                        currentOpt.text = this.plugin.settings.modelName + " (current)";
                        currentOpt.value = this.plugin.settings.modelName;
                        dropdownComponent.setValue(this.plugin.settings.modelName);
                    }
                } else {
                    models.forEach(m => {
                        const opt = dropdownComponent.selectEl.createEl('option');
                        opt.text = m;
                        opt.value = m;
                    });

                    // Auto-select logic
                    if (!this.plugin.settings.modelName && models.length === 1) {
                        this.plugin.settings.modelName = models[0];
                        await this.plugin.saveSettings();
                    }

                    // Ensure current setting is selected
                    dropdownComponent.setValue(this.plugin.settings.modelName);
                }

                dropdownComponent.onChange(async (value: string) => {
                    this.plugin.settings.modelName = value;
                    await this.plugin.saveSettings();
                });
            }
        })();

        const detailsEl = containerEl.createEl('details');
        detailsEl.addClass('fine-tuning-details');
        detailsEl.createEl('summary', { text: 'Fine tuning' });

        new Setting(detailsEl)
            .setName('Creativity (temperature)')
            .setDesc('Adjust how creative or precise the model should be. Lower values are more deterministic, higher values are more creative/random.')
            .addSlider(slider => slider
                .setLimits(0, 1, 0.1)
                .setValue(this.plugin.settings.creativity)
                .setDynamicTooltip()
                .onChange(async (value) => {
                    this.plugin.settings.creativity = value;
                    await this.plugin.saveSettings();
                    this.plugin.initializeProvider();
                }));

        new Setting(detailsEl)
            .setName('Tag suggestion prompt')
            .setDesc('Custom system prompt for tag generation. Leave empty to use default.')
            .addTextArea(text => text
                .setPlaceholder('Default prompt will be used if empty...')
                .setValue(this.plugin.settings.tagSuggestionPrompt)
                .onChange(async (value) => {
                    this.plugin.settings.tagSuggestionPrompt = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(detailsEl)
            .setName('Spell correction prompt')
            .setDesc('Custom system prompt for text correction. Leave empty to use default.')
            .addTextArea(text => text
                .setPlaceholder('Default prompt will be used if empty...')
                .setValue(this.plugin.settings.spellCorrectionPrompt)
                .onChange(async (value) => {
                    this.plugin.settings.spellCorrectionPrompt = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(detailsEl)
            .setName('Meeting minutes prompt')
            .setDesc('Custom system prompt for meeting minutes generation.')
            .addTextArea(text => text
                .setPlaceholder('Default prompt will be used if empty...')
                .setValue(this.plugin.settings.meetingMinutesPrompt)
                .onChange(async (value) => {
                    this.plugin.settings.meetingMinutesPrompt = value;
                    await this.plugin.saveSettings();
                }));
    }
}
