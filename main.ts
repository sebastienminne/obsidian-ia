import { App, Editor, MarkdownView, Menu, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { LLMProvider } from './llm_provider';
import { OllamaService } from './ollama_service';
import { t } from './lang/helpers';
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
        this.addRibbonIcon('bot', t('RIBBON_ICON_TITLE'), (evt: MouseEvent) => {
            const menu = new Menu();

            menu.addItem((item) =>
                item
                    .setTitle(t('MENU_SUGGEST_TAGS'))
                    .setIcon('tag')
                    .onClick(() => {
                        void this.suggestTags();
                    })
            );

            menu.addItem((item) =>
                item
                    .setTitle(t('MENU_CORRECT_TEXT'))
                    .setIcon('check-circle')
                    .onClick(() => {
                        const view = this.app.workspace.getActiveViewOfType(MarkdownView);
                        if (view) {
                            void this.handleCorrection(view.editor);
                        } else {
                            new Notice(t('NOTICE_NO_EDITOR'));
                        }
                    })
            );

            menu.addItem((item) =>
                item
                    .setTitle(t('MENU_GENERATE_MINUTES'))
                    .setIcon('file-text')
                    .onClick(() => {
                        const view = this.app.workspace.getActiveViewOfType(MarkdownView);
                        if (view) {
                            void this.generateMeetingMinutes(view.editor, view);
                        } else {
                            new Notice(t('NOTICE_NO_EDITOR'));
                        }
                    })
            );

            menu.showAtMouseEvent(evt);
        });

        // This adds a simple command that can be triggered anywhere
        this.addCommand({
            id: 'suggest-tags-ollama',
            name: t('COMMAND_SUGGEST_TAGS'),
            editorCallback: (editor: Editor, view: MarkdownView) => {
                void this.suggestTags(editor, view);
            }
        });

        new Notice(t('NOTICE_PLUGIN_LOADED'));

        // Add context menu item for correction
        this.registerEvent(
            this.app.workspace.on("editor-menu", (menu, editor, view) => {
                menu.addItem((item) => {
                    item
                        .setTitle(t('MENU_CORRECT_TEXT'))
                        .setIcon("check-circle")
                        .onClick(() => {
                            void this.handleCorrection(editor);
                        });
                });
                menu.addItem((item) => {
                    item
                        .setTitle(t('MENU_GENERATE_MINUTES'))
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
            name: t('COMMAND_CORRECT_TEXT'),
            editorCallback: (editor: Editor, view: MarkdownView) => {
                void this.handleCorrection(editor);
            }
        });

        this.addCommand({
            id: 'generate-meeting-minutes',
            name: t('COMMAND_GENERATE_MINUTES'),
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
            new Notice(t('NOTICE_SELECT_TEXT'));
            return;
        }

        new Notice(t('NOTICE_CORRECTING'));
        try {
            const corrected = await this.llmProvider.correctText(selection, this.settings.spellCorrectionPrompt);
            editor.replaceSelection(corrected);
            new Notice(t('NOTICE_CORRECTED'));
        } catch (error) {
            new Notice(t('NOTICE_ERROR_CORRECTION') + error.message);
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
            new Notice(t('NOTICE_NO_VIEW'));
            return;
        }

        const content = view.getViewData();

        new Notice(t('NOTICE_GENERATING_TAGS'));

        try {
            // Define extended interface for internal API
            interface ExtendedMetadataCache {
                getTags(): Record<string, number>;
            }
            const allTags = (this.app.metadataCache as unknown as ExtendedMetadataCache).getTags();

            // Pass the entire record { '#tag': count } to the provider
            const suggestedTags = await this.llmProvider.generateTags(content, allTags, this.settings.tagSuggestionPrompt);
            new TagSuggestionModal(this.app, suggestedTags, (selectedTags) => {
                void this.addTagsToNote(view, selectedTags);
            }).open();
        } catch (error) {
            const err = error as Error;
            new Notice(t('NOTICE_ERROR_TAGS') + err.message);
        }
    }

    async generateMeetingMinutes(editor: Editor, view: MarkdownView) {
        if (!view) {
            new Notice(t('NOTICE_NO_VIEW'));
            return;
        }

        const content = view.getViewData();
        new Notice(t('NOTICE_GENERATING_MINUTES'));

        try {
            const summary = await this.llmProvider.generateSummary(content, this.settings.meetingMinutesPrompt);
            if (summary) {
                new SummaryModal(this.app, summary, () => {
                    this.handleAddToNote(view, summary);
                }).open();
            } else {
                new Notice(t('NOTICE_FAILED_SUMMARY'));
            }
        } catch (error) {
            const err = error as Error;
            new Notice(t('NOTICE_ERROR_SUMMARY') + err.message);
        }
    }

    handleAddToNote(view: MarkdownView, summary: string) {
        const currentContent = view.getViewData();
        const newContent = insertMeetingMinutes(currentContent, summary);
        view.setViewData(newContent, false);
        new Notice(t('NOTICE_MINUTES_ADDED'));
    }

    async addTagsToNote(view: MarkdownView, tags: string[]) {
        // Add tags to frontmatter or append to file
        await this.app.fileManager.processFrontMatter(view.file, (frontmatter) => {
            if (!frontmatter['tags']) {
                frontmatter['tags'] = [];
            }
            // Handle if tags is a string or array
            let currentTags = frontmatter['tags'];
            if (typeof currentTags === 'string') {
                currentTags = [currentTags];
            }

            // Ensure tags are properly stringified and formatted before adding
            const formattedTags = tags.map(tag => {
                // Ensure tag is a string, convert if necessary, then format
                const tagString = typeof tag === 'string' ? tag : String(tag || '');
                return tagString.toLowerCase().replace(/\s+/g, '-').replace(/^#/, '') || 'unknown';
            });

            // Add new tags avoiding duplicates
            formattedTags.forEach(tag => {
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

        new Setting(containerEl).setName(t('SETTING_CONNECTION_HEADING')).setHeading();

        new Setting(containerEl)
            .setName(t('SETTING_SERVER_URL'))
            .setDesc(t('SETTING_SERVER_URL_DESC'))
            .addText(text => text
                .setPlaceholder('Example: http://localhost:11434')
                .setValue(this.plugin.settings.ollamaUrl)
                .onChange(async (value) => {
                    this.plugin.settings.ollamaUrl = value;
                    await this.plugin.saveSettings();
                }));


        // Better approach for Async Dropdown in Obsidian Settings:
        const modelSetting = new Setting(containerEl)
            .setName(t('SETTING_MODEL_NAME'))
            .setDesc(t('SETTING_MODEL_DESC'));

        modelSetting.addDropdown(dropdown => {
            dropdown.addOption('', t('DROPDOWN_LOADING'));
            dropdown.setValue('');
        });

        // Load models asynchronously and rebuild dropdown
        void (async () => {
            let models: string[] = [];
            try {
                if (this.plugin.llmProvider && this.plugin.llmProvider.getModels) {
                    models = await this.plugin.llmProvider.getModels();
                }
            } catch {
                // Silently fail - user will see "No models found" in dropdown
            }

            // Sort models
            models.sort();

            // Rebuild the dropdown with loaded models
            modelSetting.clear();
            modelSetting.addDropdown(dropdown => {
                if (models.length === 0) {
                    dropdown.addOption('', t('DROPDOWN_NO_MODELS'));
                    if (this.plugin.settings.modelName) {
                        dropdown.addOption(this.plugin.settings.modelName, this.plugin.settings.modelName + ' (current)');
                        dropdown.setValue(this.plugin.settings.modelName);
                    } else {
                        dropdown.setValue('');
                    }
                } else {
                    models.forEach(m => {
                        dropdown.addOption(m, m);
                    });

                    // Auto-select logic
                    if (!this.plugin.settings.modelName && models.length === 1) {
                        this.plugin.settings.modelName = models[0];
                        void this.plugin.saveSettings();
                    }

                    // Ensure current setting is selected
                    dropdown.setValue(this.plugin.settings.modelName || models[0]);
                }

                dropdown.onChange(async (value: string) => {
                    this.plugin.settings.modelName = value;
                    await this.plugin.saveSettings();
                });
            });
        })();

        const detailsEl = containerEl.createEl('details');
        detailsEl.addClass('fine-tuning-details');
        detailsEl.createEl('summary', { text: t('SETTING_FINE_TUNING') });

        new Setting(detailsEl)
            .setName(t('SETTING_CREATIVITY'))
            .setDesc(t('SETTING_CREATIVITY_DESC'))
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
            .setName(t('SETTING_TAG_PROMPT'))
            .setDesc(t('SETTING_TAG_PROMPT_DESC'))
            .addTextArea(text => text
                .setPlaceholder(t('SETTING_PROMPT_PLACEHOLDER'))
                .setValue(this.plugin.settings.tagSuggestionPrompt)
                .onChange(async (value) => {
                    this.plugin.settings.tagSuggestionPrompt = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(detailsEl)
            .setName(t('SETTING_SPELL_PROMPT'))
            .setDesc(t('SETTING_SPELL_PROMPT_DESC'))
            .addTextArea(text => text
                .setPlaceholder(t('SETTING_PROMPT_PLACEHOLDER'))
                .setValue(this.plugin.settings.spellCorrectionPrompt)
                .onChange(async (value) => {
                    this.plugin.settings.spellCorrectionPrompt = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(detailsEl)
            .setName(t('SETTING_MINUTES_PROMPT'))
            .setDesc(t('SETTING_MINUTES_PROMPT_DESC'))
            .addTextArea(text => text
                .setPlaceholder(t('SETTING_PROMPT_PLACEHOLDER'))
                .setValue(this.plugin.settings.meetingMinutesPrompt)
                .onChange(async (value) => {
                    this.plugin.settings.meetingMinutesPrompt = value;
                    await this.plugin.saveSettings();
                }));
    }
}
