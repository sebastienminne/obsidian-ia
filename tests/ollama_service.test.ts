
import { OllamaService } from '../ollama_service';
import { requestUrl } from 'obsidian';

// Mock types for TS
jest.mock('obsidian');

describe('OllamaService', () => {
    let service: OllamaService;
    const mockUrl = 'http://localhost:11434';
    const mockModel = 'test-model';

    beforeEach(() => {
        service = new OllamaService(mockUrl, mockModel);
        (requestUrl as jest.Mock).mockClear();
    });

    describe('generateTags', () => {
        it('should correctly parse JSON array of tags', async () => {
            (requestUrl as jest.Mock).mockResolvedValue({
                status: 200,
                json: {
                    message: {
                        content: JSON.stringify([
                            { tag: 'tag1', type: 'existing', justification: 'reason 1' },
                            { tag: 'tag2', type: 'new', justification: 'reason 2' }
                        ])
                    }
                }
            });

            const tags = await service.generateTags('some content', { '#tag1': 10 });
            expect(tags).toHaveLength(2);
            expect(tags[0].tag).toBe('tag1');
            expect(tags[0].type).toBe('existing');
            expect(tags[1].type).toBe('new');
        });

        it('should format tags with counts in prompt', async () => {
            (requestUrl as jest.Mock).mockResolvedValue({
                status: 200,
                json: {
                    message: { content: JSON.stringify([{ tag: 'tag1', type: 'existing' }]) }
                }
            });

            const existingTags = {
                '#popular': 100,
                '#rare': 1
            };

            await service.generateTags('some content', existingTags);

            const calls = (requestUrl as jest.Mock).mock.calls;
            const url = calls[0][0].url;
            expect(url).toContain('/api/chat');

            const requestBody = JSON.parse(calls[0][0].body);
            const systemContent = requestBody.messages[0].content;
            expect(systemContent).toContain('- #popular (100 uses)');
            expect(systemContent).toContain('- #rare (1 uses)');
            // Implicitly checks sort order if we were parsing carefully, but containment is good enough for now
        });

        it('should include language instruction in system prompt', async () => {
            (requestUrl as jest.Mock).mockResolvedValue({
                status: 200,
                json: {
                    message: { content: JSON.stringify([{ tag: 'test', type: 'new' }]) }
                }
            });

            await service.generateTags('some content');

            const calls = (requestUrl as jest.Mock).mock.calls;
            const requestBody = JSON.parse(calls[0][0].body);
            const systemContent = requestBody.messages[0].content;

            expect(systemContent).toContain('IMPORTANT: Detect the language of the note content.');
            expect(systemContent).toContain('Generate tags in the SAME language as the note content');
        });

        it('should handle { tags: [...] } wrapper', async () => {
            (requestUrl as jest.Mock).mockResolvedValue({
                status: 200,
                json: {
                    message: {
                        content: JSON.stringify({
                            tags: [
                                { tag: 'tag1', type: 'existing', justification: 'reason 1' }
                            ]
                        })
                    }
                }
            });
            const tags = await service.generateTags('content');
            expect(tags).toHaveLength(1);
            expect(tags[0].tag).toBe('tag1');
        });

        it('should handle single object response (not array)', async () => {
            (requestUrl as jest.Mock).mockResolvedValue({
                status: 200,
                json: {
                    message: {
                        content: JSON.stringify({ tag: 'tag1', type: 'new', justification: 'reason' })
                    }
                }
            });
            const tags = await service.generateTags('content');
            expect(tags).toHaveLength(1);
            expect(tags[0].tag).toBe('tag1');
        });

        it('should recover from malformed array (missing brackets)', async () => {
            (requestUrl as jest.Mock).mockResolvedValue({
                status: 200,
                json: {
                    message: {
                        content: '{"tag": "tag1", "type": "existing"} {"tag": "tag2", "type": "new"}'
                    }
                }
            });
            const tags = await service.generateTags('content');
            expect(tags).toHaveLength(2);
            expect(tags[0].tag).toBe('tag1');
            expect(tags[1].tag).toBe('tag2');
        });

        it('should handle invalid JSON gracefully', async () => {
            (requestUrl as jest.Mock).mockResolvedValue({
                status: 200,
                json: {
                    message: { content: 'Not JSON' }
                }
            });
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            const tags = await service.generateTags('some content');
            expect(tags).toEqual([]);
            consoleSpy.mockRestore();
        });
    });

    describe('correctText', () => {
        it('should return corrected text', async () => {
            (requestUrl as jest.Mock).mockResolvedValue({
                status: 200,
                json: {
                    response: 'Corrected text'
                }
            });

            const text = await service.correctText('Bad text');
            expect(text).toBe('Corrected text');
        });

        it('should remove enclosing quotes if added by model', async () => {
            (requestUrl as jest.Mock).mockResolvedValue({
                status: 200,
                json: {
                    response: '"Corrected text"'
                }
            });

            const text = await service.correctText('Bad text');
            expect(text).toBe('Corrected text');
        });
    });
});
