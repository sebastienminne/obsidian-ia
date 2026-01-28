# Local LLM (Obsidian Plugin)

This plugin uses a local Ollama instance to analyze your notes and suggest relevant tags.

## Features
- **Smart Tag Suggestions**: Analyze your note to suggest relevant tags (existing & new).
- **Meeting Minutes Generation**: Instantly generate a succinct summary of your meeting notes, with a dedicated "Add to Note Header" button.
- **Text Correction**: Correct spelling and grammar of selected text.
- **Language Aware**: Automatically detects the note's language and generates tags/summaries in the same language.
- **Privacy Focused**: All processing happens locally on your machine using **Ollama**.
- **Interactive Review**: dedicated UI to review generated content before insertion.

## Prerequisites
1. **Obsidian**: You need Obsidian installed.
2. **Ollama** (Optional): If using Ollama provider.
3. **Mac** (Optional): If using Apple Intelligence provider.

## Installation & Deployment

### Manual Installation (Development)
Since this plugin is not yet in the community store, you need to install it manually.

1. **Build the Plugin**:
   - Clone this repository.
   - Run `npm install` to install dependencies.
   - Run `npm run build` to generate the `main.js` file.

2. **Deploy to Obsidian**:
   - Create a folder named `obsidian-ollama-tagger` in your Obsidian vault's plugin directory: `.obsidian/plugins/`.
   - Copy `main.js`, `manifest.json`, and `styles.css` (if any) to that folder.
   - **Reload Obsidian** (Command + R).
   - Go to **Settings > Community Plugins** and enable "Ollama Tag Suggester".

### Configuration
1. Go to **Settings > Tag Suggester**.
2. **AI Provider**: Select "Ollama" or "Apple Intelligence".
3. **Ollama Settings**:
    - **Ollama URL**: Default `http://localhost:11434`.
    - **Model Name**: Default `llama3`.
4. **Apple Intelligence Settings**:
    - **Shortcut Name**: The name of the macOS Shortcut to run (default: "Suggest Tags").

## Usage

### 1. Suggest Tags
1. Open a note.
2. Click the **Bot Icon** in the ribbon or run **"Suggest Tags"**.
3. Select the tags you want and click "Add Selected Tags".

### 2. Generate Meeting Minutes
1. Open a note containing meeting info.
2. Run command **"Generate Meeting Minutes"**.
3. Review the summary in the popup.
4. Click **"Add to Note Header"** to insert it at the top (or copy it).

### 3. Correct Text
1. Select text in editor.
2. Right-click -> **"Correct Text"** (or use command).
3. The text will be replaced with the corrected version.

## Troubleshooting
- **"Error calling Ollama"**: Ensure Ollama is running (`ollama serve`) and the URL in settings is correct.
- **"Ollama response was not an array"**: The model might be hallucinating. Try a different model or check the console for the raw response.

### Viewing Plugin Logs
To debug issues or see what the plugin is doing behind the scenes:
1. Open Obsidian.
2. Press `Cmd + Option + I` (macOS) or `Ctrl + Shift + I` (Windows/Linux) to open the **Developer Tools**.
3. Go to the **Console** tab.
4. Look for messages starting with `Ollama Tagger` or errors in red.
