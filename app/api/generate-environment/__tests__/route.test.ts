import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../route';
import { NextRequest } from 'next/server';

// Create mock function for generateContent
const mockGenerateContent = vi.fn();

// Mock Google GenAI
vi.mock('@google/genai', () => {
  return {
    GoogleGenAI: vi.fn(function(this: any) {
      this.models = {
        generateContent: mockGenerateContent,
      };
    }),
  };
});

describe('/api/generate-environment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGenerateContent.mockReset();
    process.env.GEMINI_API_KEY = 'test-api-key';
  });

  describe('Request Validation', () => {
    it('should return 400 if prompt is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/generate-environment', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.status).toBe('error');
      expect(data.message).toBe('Missing prompt');
    });

    it('should return 500 if GEMINI_API_KEY is not configured', async () => {
      delete process.env.GEMINI_API_KEY;

      const request = new NextRequest('http://localhost:3000/api/generate-environment', {
        method: 'POST',
        body: JSON.stringify({ prompt: 'test prompt' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.status).toBe('error');
      expect(data.message).toBe('GEMINI_API_KEY not configured');
    });
  });

  describe('Model and Config Parameters', () => {
    it('should use default model when not specified', async () => {
      mockGenerateContent.mockResolvedValue({
        candidates: [{
          content: { parts: [{ text: 'Enhanced prompt' }] },
        }],
      });

      const request = new NextRequest('http://localhost:3000/api/generate-environment', {
        method: 'POST',
        body: JSON.stringify({ prompt: 'test room' }),
      });

      await POST(request);

      // Check that the image generation call used the default model
      expect(mockGenerateContent).toHaveBeenCalledTimes(2); // Once for enhancement, once for image
      const imageGenerationCall = mockGenerateContent.mock.calls[1][0];
      expect(imageGenerationCall.model).toBe('gemini-2.5-flash-image');
    });

    it('should use custom model when specified', async () => {
      mockGenerateContent.mockResolvedValue({
        candidates: [{
          content: { parts: [{ text: 'Enhanced prompt' }] },
        }],
      });

      const request = new NextRequest('http://localhost:3000/api/generate-environment', {
        method: 'POST',
        body: JSON.stringify({
          prompt: 'test room',
          model: 'gemini-3-pro-image-preview',
        }),
      });

      await POST(request);

      const imageGenerationCall = mockGenerateContent.mock.calls[1][0];
      expect(imageGenerationCall.model).toBe('gemini-3-pro-image-preview');
    });

    it('should include imageConfig when quality and aspectRatio are provided', async () => {
      mockGenerateContent.mockResolvedValue({
        candidates: [{
          content: { parts: [{ text: 'Enhanced prompt' }] },
        }],
      });

      const request = new NextRequest('http://localhost:3000/api/generate-environment', {
        method: 'POST',
        body: JSON.stringify({
          prompt: 'test room',
          quality: '2K',
          aspectRatio: '16:9',
        }),
      });

      await POST(request);

      const imageGenerationCall = mockGenerateContent.mock.calls[1][0];
      expect(imageGenerationCall.config.imageConfig).toEqual({
        imageSize: '2K',
        aspectRatio: '16:9',
      });
    });
  });

  describe('Successful Generation', () => {
    it('should return success response with imageUrl and enhancedPrompt', async () => {
      mockGenerateContent
        .mockResolvedValueOnce({
          // Prompt enhancement response
          candidates: [{
            content: {
              parts: [{ text: 'A photorealistic, high-resolution modern living room' }],
            },
          }],
        })
        .mockResolvedValueOnce({
          // Image generation response
          candidates: [{
            content: {
              parts: [{
                inlineData: {
                  mimeType: 'image/png',
                  data: 'base64encodedimagedata',
                },
              }],
            },
            finishReason: 'STOP',
          }],
        });

      const request = new NextRequest('http://localhost:3000/api/generate-environment', {
        method: 'POST',
        body: JSON.stringify({ prompt: 'modern living room' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('success');
      expect(data.imageUrl).toBe('data:image/png;base64,base64encodedimagedata');
      expect(data.enhancedPrompt).toBe('A photorealistic, high-resolution modern living room');
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      mockGenerateContent.mockRejectedValue(new Error('API Error'));

      const request = new NextRequest('http://localhost:3000/api/generate-environment', {
        method: 'POST',
        body: JSON.stringify({ prompt: 'test room' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.status).toBe('error');
      expect(data.message).toBe('API Error');
    });

    it('should handle IMAGE_OTHER finish reason', async () => {
      mockGenerateContent
        .mockResolvedValueOnce({
          candidates: [{ content: { parts: [{ text: 'Enhanced' }] } }],
        })
        .mockResolvedValueOnce({
          candidates: [{
            finishReason: 'IMAGE_OTHER',
            finishMessage: 'Image generation blocked',
          }],
        });

      const request = new NextRequest('http://localhost:3000/api/generate-environment', {
        method: 'POST',
        body: JSON.stringify({ prompt: 'test room' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.status).toBe('error');
      expect(data.message).toBe('Image generation blocked');
    });
  });
});
