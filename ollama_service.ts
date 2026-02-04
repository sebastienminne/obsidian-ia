import { requestUrl } from 'obsidian';
import { LLMProvider, SuggestedTag } from './llm_provider';

export class OllamaService implements LLMProvider {
    private url: string;
    private model: string;
    private temperature: number;

    constructor(url: string, model: string, temperature: number = 0.7) {
        this.url = url.replace(/\/$/, '');
        this.model = model;
        this.temperature = temperature;
    }

    updateSettings(url: string, model: string, temperature?: number) {
        this.url = url.replace(/\/$/, '');
        this.model = model;
        if (temperature !== undefined) {
            this.temperature = temperature;
        }
    }

    async generateTags(content: string, existingTags?: Record<string, number>, promptTemplate?: string): Promise<SuggestedTag[]> {
        let systemPrompt = promptTemplate || `
You are an intelligent assistant that analyzes notes to suggest metadata.
Generate a comprehensive list of at least 10 relevant tags for the provided Note Content.
Include general themes, specific entities, and context.
You MUST return the result as a JSON ARRAY of objects.
Start your response with \`[\`.
Do NOT output any conversational text.
Do NOT wrap the result in an object (like {"tags": [...]}). Return the array directly: [...].
Do NOT output markdown formatting (like \`\`\`json).
Just the raw JSON array.

IMPORTANT: Detect the language of the note content. Generate tags in the SAME language as the note content, unless the tag is a technical term standardly used in English.
The "justification" field MUST be in the SAME language as the note content.

Each object must have:
- "tag": The tag name (lowercase, no spaces, kebab-case).
- "type": Either "existing" (if it matches a provided tag) or "new".
- "justification": A short explanation (max 10 words) of why this tag is relevant.

Example output:
[
  { "tag": "productivity", "type": "existing", "justification": "Related to work efficiency" },
  { "tag": "javascript", "type": "new", "justification": "Code snippet found" }
]
`;

        if (existingTags && Object.keys(existingTags).length > 0) {
            // Sort tags by count (descending)
            const sortedTags = Object.entries(existingTags)
                .sort(([, countA], [, countB]) => countB - countA)
                .slice(0, 50) // Limit to top 50 to avoid huge prompts
                .map(([tag, count]) => `- ${tag} (${count} uses)`);

            systemPrompt += `
Here is a list of existing tags in the vault (with usage counts).
PRIORITIZE using these existing tags if they are relevant.
Mark as "type": "existing" if you use one of these.

Existing Tags (Top 50):
${sortedTags.join('\n')}
`;
        }

        const messages = [
            {
                role: 'system',
                content: systemPrompt
            },
            {
                role: 'user',
                content: `Analyze the following note structure and content.
Identify key themes, entities, topics, and specific details.
Brainstorm a comprehensive list of at least 10 tags.

Note Content:
# Meeting Minutes: Project Alpha
Date: 2023-10-27
Attendees: John, Sarah, Mike

## Agenda
1. Budget review
2. Timeline delays
3. Marketing strategy

## Discussion
- The budget is tight for Q4. We need to cut costs in the cloud infrastructure.
- Deployment to AWS is delayed by 2 weeks due to testing failures.
- Sarah proposed a new social media campaign on LinkedIn.`
            },
            {
                role: 'assistant',
                content: `[
  { "tag": "project-alpha", "type": "new", "justification": "Project name identified" },
  { "tag": "meeting-minutes", "type": "new", "justification": "Note type inferred" },
  { "tag": "budget", "type": "existing", "justification": "Key topic discussed" },
  { "tag": "finance", "type": "existing", "justification": "Related to budget discussion" },
  { "tag": "aws", "type": "new", "justification": "Specific cloud provider mentioned" },
  { "tag": "infrastructure", "type": "existing", "justification": "Context of cost cutting" },
  { "tag": "marketing", "type": "existing", "justification": "Strategy topic discussed" },
  { "tag": "social-media", "type": "new", "justification": "Campaign channel proposed" },
  { "tag": "linkedin", "type": "new", "justification": "Specific platform entity" },
  { "tag": "deployment", "type": "existing", "justification": "Process regarding delays" },
  { "tag": "testing", "type": "existing", "justification": "Cause of delay identified" },
  { "tag": "planning", "type": "existing", "justification": "General meeting context" }
]`
            },
            {
                role: 'user',
                content: `Analyze the following note structure and content.
Identify key themes, entities, topics, and specific details.
Brainstorm a comprehensive list of at least 10 tags.

Note Content:
${content.substring(0, 5000)}`
            }
        ];

        const requestBody = {
            model: this.model,
            messages: messages,
            stream: false,
            options: {
                temperature: this.temperature
            }
        };

        try {
            const response = await requestUrl({
                url: `${this.url}/api/chat`,
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
            // Chat response is in data.message.content
            let responseText = data.message?.content?.trim();

            if (!responseText) {
                // Fallback if structure is different
                responseText = data.response?.trim(); // Some versions might differ?
            }

            if (!responseText) {
                return [];
            }

            // Clean up: find the first '[' or '{'
            const firstBracket = responseText.indexOf('[');
            const firstBrace = responseText.indexOf('{');

            let parsed: unknown = null;

            // Case 1: It looks like an array
            if (firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) {
                const end = responseText.lastIndexOf(']');
                if (end !== -1) {
                    const jsonStr = responseText.substring(firstBracket, end + 1);
                    try {
                        parsed = JSON.parse(jsonStr);
                    } catch {
                        // Failed to parse, will try alternate approach
                    }
                }
            }

            // Case 2: It looks like a single object or multiple objects not in array
            if (!parsed && firstBrace !== -1) {
                const end = responseText.lastIndexOf('}');
                if (end !== -1) {
                    let jsonStr = responseText.substring(firstBrace, end + 1);
                    // Try parsing as single object
                    try {
                        const obj = JSON.parse(jsonStr);
                        parsed = obj;
                    } catch (e) {
                        // Maybe it's multiple objects like {...} {...}
                        // Try to comma separate them and wrap in []
                        const fixedStr = `[${jsonStr.replace(/}\s*{/g, '},{')}]`;
                        try {
                            parsed = JSON.parse(fixedStr);
                        } catch {
                            // Could not fix malformed JSON
                        }
                    }
                }
            }

            if (!parsed) {
                return [];
            }

            // Handle { "tags": [...] } wrapper
            if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
                const wrappedObj = parsed as Record<string, unknown>;
                if (wrappedObj.tags && Array.isArray(wrappedObj.tags)) {
                    parsed = wrappedObj.tags;
                }
            }

            if (!Array.isArray(parsed)) {
                parsed = [parsed];
            }

            // Validate structure
            return (parsed as unknown[]).map((item: unknown) => {
                const obj = item as Record<string, unknown>;
                return {
                    tag: (typeof obj.tag === 'string' ? obj.tag : String(obj.tag || '')).toLowerCase().replace(/\s+/g, '-').replace(/^#/, '') || 'unknown',
                    type: obj.type === 'existing' ? 'existing' as const : 'new' as const,
                    justification: typeof obj.justification === 'string' ? obj.justification : 'No justification provided'
                };
            }).filter((t: SuggestedTag) => t.tag !== 'unknown');

        } catch (error) {
            const err = error as Error;
            if (err.message && err.message.includes('404')) {
                throw new Error(`Ollama Model '${this.model}' not found (404). Check your settings.`);
            }
            throw error;
        }
    }

    async correctText(content: string, promptTemplate?: string): Promise<string> {
        const messages = [
            {
                role: 'system',
                content: promptTemplate || `
You are a helpful assistant that corrects spelling and grammar.
Read the following text and correct any spelling or grammatical errors.
CRITICAL INSTRUCTION: Return ONLY the corrected text.
Do NOT change the meaning of the text.
Do NOT add any conversational text (like "Here is the corrected text").
Do NOT add quotes around the output unless they were in the original text.
`
            },
            {
                role: 'user',
                content: `Text to correct:\n${content}`
            }
        ];

        const requestBody = {
            model: this.model,
            messages: messages,
            stream: false
        };

        try {
            const response = await requestUrl({
                url: `${this.url}/api/chat`,
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
            let responseText = data.message?.content?.trim();

            if (!responseText) {
                responseText = data.response?.trim();
            }

            // Clean up response if model is chatty
            if (responseText) {
                responseText = responseText.replace(/^[\s\S]*:/, ''); // Remove "Here is corrected text:"
                responseText = responseText.trim();

                // Remove wrapping quotes if the model added them but they weren't in original
                if (responseText.startsWith('"') && responseText.endsWith('"') && !content.trim().startsWith('"')) {
                    responseText = responseText.slice(1, -1);
                }
            }

            return responseText || content; // Return original if fail

        } catch (error) {
            const err = error as Error;
            if (err.message && err.message.includes('404')) {
                throw new Error(`Ollama Model '${this.model}' not found (404). Check your settings.`);
            }
            throw error;
        }
    }

    async generateSummary(content: string, promptTemplate?: string): Promise<string> {
        const messages = [
            {
                role: 'system',
                content: promptTemplate || `
You are an expert meeting secretary.
Your task is to generate a succinct meeting minutes summary from the provided note content.
STRICT INSTRUCTIONS:
1.  **Language**: The summary MUST be in the SAME LANGUAGE as the note content.
2.  **No Hallucinations**: Do NOT invent any facts. Stick STRICTLY to the provided content.
3.  **Format**:
    *   **Date**: (If found)
    *   **Attendees**: (If found)
    *   **Key Topics**: (List the main concepts)
    *   **Decisions/Action Items**: (If any)
4.  **No Tags**: Do NOT include hashtags.
5.  **Conciseness**: Keep it brief and to the point.
6.  Do NOT add conversational filler (like "Here is the summary"). Just the summary.
`
            },
            {
                role: 'user',
                content: `Generate a meeting minutes summary for the following note content:\n\n${content}`
            }
        ];

        const requestBody = {
            model: this.model,
            messages: messages,
            stream: false,
            options: {
                temperature: this.temperature // Allow some creativity for summarization
            }
        };

        try {
            const response = await requestUrl({
                url: `${this.url}/api/chat`,
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
            let responseText = data.message?.content?.trim();

            if (!responseText) {
                responseText = data.response?.trim();
            }

            if (!responseText) {
                return "";
            }

            return responseText;

        } catch (error) {
            const err = error as Error;
            if (err.message && err.message.includes('404')) {
                throw new Error(`Ollama Model '${this.model}' not found (404). Check your settings.`);
            }
            throw error;
        }
    }

    async getModels(): Promise<string[]> {
        try {
            const response = await requestUrl({
                url: `${this.url}/api/tags`,
                method: 'GET'
            });

            if (response.status !== 200) {
                return [];
            }

            // Ollama returns { models: [ { name: "llama3:latest", ... }, ... ] }
            const data = response.json;
            if (data && Array.isArray(data.models)) {
                return data.models.map((m: { name: string }) => m.name);
            }
            return [];
        } catch {
            return [];
        }
    }
}
