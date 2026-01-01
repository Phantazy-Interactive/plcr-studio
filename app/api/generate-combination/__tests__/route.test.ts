import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../route';
import { NextRequest } from 'next/server';

const mockGenerateContent = vi.fn();

vi.mock('@google/genai', () => {
  return {
    GoogleGenAI: vi.fn(function(this: any) {
      this.models = {
        generateContent: mockGenerateContent,
      };
    }),
  };
});

describe('/api/iterate', () => {
  const mockSketchImage = 'data:image/png;base64,sketchdata';
  const mockEnvironmentImage = 'data:image/png;base64,environmentdata';

  beforeEach(() => {
    vi.clearAllMocks();
    mockGenerateContent.mockReset();
    process.env.GEMINI_API_KEY = 'test-api-key';
  });

  describe('Request Validation', () => {
    it('should return 400 if sketchImage is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/iterate', {
        method: 'POST',
        body: JSON.stringify({
          environmentImage: mockEnvironmentImage,
          prompt: 'test prompt',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.status).toBe('error');
      expect(data.message).toContain('Missing required parameters');
    });

    it('should return 500 if GEMINI_API_KEY is not configured', async () => {
      delete process.env.GEMINI_API_KEY;

      const request = new NextRequest('http://localhost:3000/api/iterate', {
        method: 'POST',
        body: JSON.stringify({
          sketchImage: mockSketchImage,
          environmentImage: mockEnvironmentImage,
          prompt: 'test',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.status).toBe('error');
      expect(data.message).toBe('GEMINI_API_KEY not configured');
    });
  });

  describe('Successful Generation', () => {
    it('should return success response with generatedImage', async () => {
      mockGenerateContent.mockResolvedValue({
        candidates: [{
          content: {
            parts: [{
              inlineData: {
                mimeType: 'image/png',
                data: 'generatedimagedata',
              },
            }],
          },
          finishReason: 'STOP',
        }],
      });

      const request = new NextRequest('http://localhost:3000/api/iterate', {
        method: 'POST',
        body: JSON.stringify({
          sketchImage: mockSketchImage,
          environmentImage: mockEnvironmentImage,
          prompt: 'Composite product',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('success');
      expect(data.generatedImage).toBe('data:image/png;base64,generatedimagedata');
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      mockGenerateContent.mockRejectedValue(new Error('API Error'));

      const request = new NextRequest('http://localhost:3000/api/iterate', {
        method: 'POST',
        body: JSON.stringify({
          sketchImage: mockSketchImage,
          environmentImage: mockEnvironmentImage,
          prompt: 'test',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.status).toBe('error');
      expect(data.message).toBe('API Error');
    });
  });
});
