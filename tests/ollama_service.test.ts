
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
        it('should correctly parse comma-separated tags', async () => {
            (requestUrl as jest.Mock).mockResolvedValue({
                status: 200,
                json: {
                    response: 'tag1, tag2, tag3'
                }
            });

            const tags = await service.generateTags('some content', { '#tag1': 10 });
            expect(tags).toEqual(['tag1', 'tag2', 'tag3']);
        });

        it('should format tags with counts in prompt', async () => {
            (requestUrl as jest.Mock).mockResolvedValue({
                status: 200,
                json: {
                    response: 'tag1'
                }
            });

            const existingTags = {
                '#popular': 100,
                '#rare': 1
            };

            await service.generateTags('some content', existingTags);

            const calls = (requestUrl as jest.Mock).mock.calls;
            const requestBody = JSON.parse(calls[0][0].body);
            expect(requestBody.prompt).toContain('- #popular (100 uses)');
            expect(requestBody.prompt).toContain('- #rare (1 uses)');
            // Implicitly checks sort order if we were parsing carefully, but containment is good enough for now
        });

        it('should remove conversational prefixes', async () => {
            (requestUrl as jest.Mock).mockResolvedValue({
                status: 200,
                json: {
                    response: 'Here are the tags: tag1, tag2'
                }
            });

            const tags = await service.generateTags('some content');
            expect(tags).toEqual(['tag1', 'tag2']);
        });

        it('should handle newlines as separators', async () => {
            (requestUrl as jest.Mock).mockResolvedValue({
                status: 200,
                json: {
                    response: 'tag1\ntag2\ntag3'
                }
            });

            const tags = await service.generateTags('some content');
            expect(tags).toEqual(['tag1', 'tag2', 'tag3']);
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
