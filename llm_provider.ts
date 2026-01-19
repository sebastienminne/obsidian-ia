export interface SuggestedTag {
    tag: string;
    type: 'existing' | 'new';
    justification: string;
}

export interface LLMProvider {
    generateTags(content: string, existingTags?: Record<string, number>, promptTemplate?: string): Promise<SuggestedTag[]>;
    correctText(content: string, promptTemplate?: string): Promise<string>;
    getModels?(): Promise<string[]>;
}
