
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

            const tags = await service.generateTags('some content');
            expect(tags).toEqual(['tag1', 'tag2', 'tag3']);
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
