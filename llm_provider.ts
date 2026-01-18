export interface LLMProvider {
    generateTags(content: string, existingTags?: Record<string, number>, promptTemplate?: string): Promise<string[]>;
    correctText(content: string, promptTemplate?: string): Promise<string>;
}
