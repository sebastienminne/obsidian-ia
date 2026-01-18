# Obsidian Ollama Tag Suggester

This plugin uses a local Ollama instance to analyze your notes and suggest relevant tags.

## Features
- **Multi-Provider Support**: Choose between **Ollama** (Local) or **Apple Intelligence** (Experimental).
- **AI-Powered Suggestions**: Uses local LLMs to understand your note's context.
- **Privacy Focused**: All processing happens locally on your machine.
- **Interactive Review**: Review suggested tags before adding them to your note.

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
1. Open a note in Obsidian.
2. Click the **Tag Icon** in the left ribbon OR run the command **"Suggest Tags with Ollama"** (Cmd/Ctrl + P).
3. A modal will appear with suggested tags.
4. Uncheck any tags you don't want.
5. Click **"Add Selected Tags"**.
6. The tags will be added to your note's Frontmatter (YAML header).

## Troubleshooting
- **"Error calling Ollama"**: Ensure Ollama is running (`ollama serve`) and the URL in settings is correct.
- **"Ollama response was not an array"**: The model might be hallucinating. Try a different model or check the console for the raw response.

### Viewing Plugin Logs
To debug issues or see what the plugin is doing behind the scenes:
1. Open Obsidian.
2. Press `Cmd + Option + I` (macOS) or `Ctrl + Shift + I` (Windows/Linux) to open the **Developer Tools**.
3. Go to the **Console** tab.
4. Look for messages starting with `Ollama Tagger` or errors in red.
