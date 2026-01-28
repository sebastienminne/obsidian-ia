import { insertMeetingMinutes } from '../text_utils';

describe('insertMeetingMinutes', () => {
    const minutes = "# Meeting Minutes\n- Point 1";

    it('should prepend to empty file', () => {
        const result = insertMeetingMinutes('', minutes);
        expect(result).toBe(`## Meeting Minutes Summary\n${minutes}`);
    });

    it('should prepend to file with text but no frontmatter', () => {
        const content = "# Title\nSome content";
        const result = insertMeetingMinutes(content, minutes);
        expect(result).toBe(`## Meeting Minutes Summary\n${minutes}\n\n${content}`);
    });

    it('should insert after frontmatter', () => {
        const content = "---\ntags: [a]\n---\n# Title";
        const result = insertMeetingMinutes(content, minutes);
        const expected = `---\ntags: [a]\n---\n\n## Meeting Minutes Summary\n${minutes}\n# Title`;
        expect(result).toBe(expected);
    });

    it('should handle complex frontmatter', () => {
        const content = "---\nkey: value\nlist:\n  - item\n---\nBody";
        const result = insertMeetingMinutes(content, minutes);
        expect(result).toContain("key: value");
        expect(result).toContain("## Meeting Minutes Summary");
        expect(result).toContain(minutes);
        expect(result.indexOf(minutes)).toBeGreaterThan(result.indexOf("---"));
    });
});
