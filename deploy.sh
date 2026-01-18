#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting deployment of Local LLM...${NC}"

# 1. Build the plugin
echo "Building plugin..."
npm run build

# Check if build was successful
if [ $? -ne 0 ]; then
    echo -e "${RED}Build failed. Exiting.${NC}"
    exit 1
fi

# 2. Get Vault Path
VAULT_PATH="$1"

# If argument not provided, try to find common paths or ask user
if [ -z "$VAULT_PATH" ]; then
    # Check if we can find a vault in standard locations (just a guess, usually not safe to guess)
    # So we ask the user.
    echo "Please enter the absolute path to your Obsidian Vault:"
    read -r VAULT_PATH
fi

# Expand tilde if present
VAULT_PATH="${VAULT_PATH/#\~/$HOME}"

# Validate vault path
if [ ! -d "$VAULT_PATH" ]; then
    echo -e "${RED}Error: Directory '$VAULT_PATH' does not exist.${NC}"
    exit 1
fi

# Check if it looks like a vault (has .obsidian folder)
if [ ! -d "$VAULT_PATH/.obsidian" ]; then
    echo -e "${RED}Warning: '$VAULT_PATH' does not appear to be an Obsidian vault (no .obsidian folder found).${NC}"
    echo "Do you want to proceed anyway? (y/n)"
    read -r CONFIRM
    if [ "$CONFIRM" != "y" ]; then
        echo "Aborting."
        exit 1
    fi
    # Create .obsidian/plugins if it doesn't exist (unlikely for a real vault but possible for a new folder)
    mkdir -p "$VAULT_PATH/.obsidian/plugins"
fi

PLUGIN_DIR="$VAULT_PATH/.obsidian/plugins/obsidian-ollama-tagger"

# 3. Create plugin directory
echo "Creating plugin directory at $PLUGIN_DIR..."
mkdir -p "$PLUGIN_DIR"

# 4. Copy files
echo "Copying files..."
cp main.js manifest.json "$PLUGIN_DIR/"

if [ -f "styles.css" ]; then
    cp styles.css "$PLUGIN_DIR/"
fi

echo -e "${GREEN}Deployment complete!${NC}"
echo "---------------------------------------------------"
echo "1. Open Obsidian."
echo "2. Go to Settings > Community Plugins."
echo "3. Reload plugins (or restart Obsidian)."
echo "4. Enable 'Ollama Tag Suggester'."
echo "---------------------------------------------------"
