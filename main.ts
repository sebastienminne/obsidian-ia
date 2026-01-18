import { App, Editor, MarkdownView, Menu, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { LLMProvider } from './llm_provider';
import { OllamaService } from './ollama_service';
import { TagSuggestionModal } from './ui';

interface OllamaTaggerSettings {
    ollamaUrl: string;
    modelName: string;
    tagSuggestionPrompt: string;
    spellCorrectionPrompt: string;
}

const DEFAULT_SETTINGS: OllamaTaggerSettings = {
    ollamaUrl: 'http://localhost:11434',
    modelName: 'llama3',
    tagSuggestionPrompt: '',
    spellCorrectionPrompt: ''
}

export default class OllamaTaggerPlugin extends Plugin {
    settings: OllamaTaggerSettings;
    llmProvider: LLMProvider;

    async onload() {
        await this.loadSettings();

        this.initializeProvider();

        // This creates an icon in the left ribbon.
        // This creates an icon in the left ribbon.
        const ribbonIconEl = this.addRibbonIcon('tag', 'Ollama Actions', (evt: MouseEvent) => {
            const menu = new Menu();

            menu.addItem((item) =>
                item
                    .setTitle('Suggest Tags')
                    .setIcon('tag')
                    .onClick(() => {
                        this.suggestTags();
                    })
            );

            menu.addItem((item) =>
                item
                    .setTitle('Correct Text')
                    .setIcon('check-circle')
                    .onClick(() => {
                        const view = this.app.workspace.getActiveViewOfType(MarkdownView);
                        if (view) {
                            this.handleCorrection(view.editor);
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
            name: 'Suggest Tags',
            editorCallback: (editor: Editor, view: MarkdownView) => {
                this.suggestTags(editor, view);
            }
        });

        console.log("Ollama Tagger: Plugin Loaded");
        new Notice("Ollama Tagger v1.1.0 Loaded");

        // Add context menu item for correction
        this.registerEvent(
            this.app.workspace.on("editor-menu", (menu, editor, view) => {
                console.log("Ollama Tagger: Editor menu triggered");
                menu.addItem((item) => {
                    item
                        .setTitle("Corriger")
                        .setIcon("check-circle")
                        .onClick(async () => {
                            this.handleCorrection(editor);
                        });
                });
            })
        );

        this.addCommand({
            id: 'correct-text-ollama',
            name: 'Correct Selected Text',
            editorCallback: (editor: Editor, view: MarkdownView) => {
                this.handleCorrection(editor);
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
            const allTags = (this.app.metadataCache as any).getTags();
            const existingTags = Object.keys(allTags);
            const suggestedTags = await this.llmProvider.generateTags(content, existingTags, this.settings.tagSuggestionPrompt);
            new TagSuggestionModal(this.app, suggestedTags, (selectedTags) => {
                this.addTagsToNote(view, selectedTags);
            }).open();
        } catch (error) {
            new Notice('Error generating tags: ' + error.message);
            console.error(error);
        }
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

        containerEl.createEl('h2', { text: 'Tag Suggester Settings' });

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

        new Setting(containerEl)
            .setName('Model Name')
            .setDesc('The name of the model to use (e.g., llama3, mistral)')
            .addText(text => text
                .setPlaceholder('llama3')
                .setValue(this.plugin.settings.modelName)
                .onChange(async (value) => {
                    this.plugin.settings.modelName = value;
                    await this.plugin.saveSettings();
                }));

        containerEl.createEl('h3', { text: 'Custom Prompts' });

        new Setting(containerEl)
            .setName('Tag Suggestion Prompt')
            .setDesc('Custom system prompt for tag generation. Leave empty to use default.')
            .addTextArea(text => text
                .setPlaceholder('Default prompt will be used if empty...')
                .setValue(this.plugin.settings.tagSuggestionPrompt)
                .onChange(async (value) => {
                    this.plugin.settings.tagSuggestionPrompt = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Spell Correction Prompt')
            .setDesc('Custom system prompt for text correction. Leave empty to use default.')
            .addTextArea(text => text
                .setPlaceholder('Default prompt will be used if empty...')
                .setValue(this.plugin.settings.spellCorrectionPrompt)
                .onChange(async (value) => {
                    this.plugin.settings.spellCorrectionPrompt = value;
                    await this.plugin.saveSettings();
                }));
    }
}
