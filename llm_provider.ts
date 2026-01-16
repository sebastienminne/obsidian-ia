export interface LLMProvider {
    generateTags(content: string, existingTags?: string[], promptTemplate?: string): Promise<string[]>;
    correctText(content: string, promptTemplate?: string): Promise<string>;
}
