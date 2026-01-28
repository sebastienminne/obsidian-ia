/**
 * Inserts meeting minutes into the note content.
 * It tries to insert after the frontmatter if present, otherwise at the top.
 * 
 * @param originalContent The full content of the note.
 * @param minutes The meeting minutes summary to insert.
 * @returns The new content with minutes inserted.
 */
export function insertMeetingMinutes(originalContent: string, minutes: string): string {
    const trimmedContent = originalContent.trim();

    // Check for frontmatter
    const frontmatterRegex = /^---\n([\s\S]*?)\n---\n/;
    const match = trimmedContent.match(frontmatterRegex);

    if (match) {
        // Found frontmatter, insert after it
        const frontmatterEndIndex = match[0].length;
        const before = originalContent.substring(0, frontmatterEndIndex);
        const after = originalContent.substring(frontmatterEndIndex);

        // Ensure there is a newline after frontmatter before minutes
        return `${before}\n## Meeting Minutes Summary\n${minutes}\n${after}`;
    } else {
        // No frontmatter, insert at top
        if (originalContent.length > 0) {
            return `## Meeting Minutes Summary\n${minutes}\n\n${originalContent}`;
        } else {
            return `## Meeting Minutes Summary\n${minutes}`;
        }
    }
}
