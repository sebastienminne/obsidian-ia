import { requestUrl, RequestUrlParam } from 'obsidian';
import { LLMProvider } from './llm_provider';

export class OllamaService implements LLMProvider {
    private url: string;
    private model: string;

    constructor(url: string, model: string) {
        this.url = url;
        this.model = model;
    }

    updateSettings(url: string, model: string) {
        this.url = url;
        this.model = model;
    }

    async generateTags(content: string, existingTags?: Record<string, number>, promptTemplate?: string): Promise<string[]> {
        let systemPrompt = promptTemplate || `
You are a helpful assistant that suggests tags for Obsidian notes.
Read the following note content and suggest 5-10 relevant tags.
CRITICAL INSTRUCTION: Return ONLY a list of tags separated by commas.
Do NOT use JSON.
Do NOT return any conversational text.
Example output: productivity, obsidian, coding, javascript
`;

        if (existingTags && Object.keys(existingTags).length > 0) {
            // Sort tags by count (descending)
            const sortedTags = Object.entries(existingTags)
                .sort(([, countA], [, countB]) => countB - countA)
                .slice(0, 50) // Limit to top 50 to avoid huge prompts
                .map(([tag, count]) => `- ${tag} (${count} uses)`);

            systemPrompt += `
Here is a list of existing tags in the vault (with usage counts).
PRIORITIZE using these existing tags, especially those with high usage counts, if they are relevant.
Create new tags only if absolutely necessary.

Existing Tags (Top 50):
${sortedTags.join('\n')}
`;
        }

        const prompt = `
${systemPrompt}

Note Content:
${content.substring(0, 5000)} 
`;

        const requestBody = {
            model: this.model,
            prompt: prompt,
            stream: false
        };

        try {
            const response = await requestUrl({
                url: `${this.url}/api/generate`,
                method: 'POST',
                body: JSON.stringify(requestBody),
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.status !== 200) {
                throw new Error(`Ollama API returned status ${response.status}`);
            }

            const data = response.json;
            let responseText = data.response.trim();

            console.log("Raw Ollama Response:", responseText);

            // Clean up response: remove any "Here are the tags:" prefixes if they exist
            // We assume the model might still be chatty, so we look for the last line or just try to split.

            // Strategy: Split by comma or newline
            // Remove common conversational prefixes
            responseText = responseText.replace(/^[\s\S]*:/, ''); // Remove "Here are tags:"

            const tags = responseText.split(/[,|\n]/)
                .map((t: string) => t.trim())
                .filter((t: string) => t.length > 0)
                .filter((t: string) => !t.startsWith('-')) // Remove bullet points if model used list format
                .map((t: string) => t.replace(/^["']|["']$/g, '')) // Remove quotes
                .map((t: string) => t.toLowerCase().replace(/\s+/g, '-')); // Normalize

            // Filter out obviously bad tags (too long, or sentences)
            const validTags = tags.filter((t: string) => t.length < 50 && !t.includes(' '));

            return validTags;

        } catch (error) {
            console.error("Error calling Ollama:", error);
            throw error;
        }
    }

    async correctText(content: string, promptTemplate?: string): Promise<string> {
        const prompt = (promptTemplate || `
You are a helpful assistant that corrects spelling and grammar.
Read the following text and correct any spelling or grammatical errors.
CRITICAL INSTRUCTION: Return ONLY the corrected text.
Do NOT change the meaning of the text.
Do NOT add any conversational text (like "Here is the corrected text").
Do NOT add quotes around the output unless they were in the original text.
`) + `

Text to correct:
${content}
`;

        const requestBody = {
            model: this.model,
            prompt: prompt,
            stream: false
        };

        try {
            const response = await requestUrl({
                url: `${this.url}/api/generate`,
                method: 'POST',
                body: JSON.stringify(requestBody),
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.status !== 200) {
                throw new Error(`Ollama API returned status ${response.status}`);
            }

            const data = response.json;
            let responseText = data.response.trim();

            // Clean up response if model is chatty
            responseText = responseText.replace(/^[\s\S]*:/, ''); // Remove "Here is corrected text:"
            responseText = responseText.trim();

            // Remove wrapping quotes if the model added them but they weren't in original
            if (responseText.startsWith('"') && responseText.endsWith('"') && !content.trim().startsWith('"')) {
                responseText = responseText.slice(1, -1);
            }

            return responseText;

        } catch (error) {
            console.error("Error calling Ollama for correction:", error);
            throw error;
        }
    }
}
