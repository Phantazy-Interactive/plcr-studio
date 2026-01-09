/**
 * Google Gemini AI Provider
 * Implements the AI provider interface for Google Gemini
 */

import { GoogleGenAI } from '@google/genai';
import { BaseAIProvider } from './base';
import type {
  ProviderMetadata,
  ModelInfo,
  GenerateTextRequest,
  GenerateTextResponse,
  GenerateImageRequest,
  GenerateImageResponse,
  ComposeImageRequest,
  ComposeImageResponse,
  RefineImageRequest,
  RefineImageResponse,
  ResolutionOption,
  ImageQuality,
  AspectRatio,
} from './types';

export class GeminiProvider extends BaseAIProvider {
  private client: GoogleGenAI | null = null;

  constructor(apiKey?: string) {
    super(apiKey || process.env.GEMINI_API_KEY);
    if (this.apiKey) {
      this.client = new GoogleGenAI({ apiKey: this.apiKey });
    }
  }

  getMetadata(): ProviderMetadata {
    return {
      name: 'gemini',
      displayName: 'Google Gemini',
      description: 'Google\'s multimodal AI with advanced image generation capabilities',
      costEstimate: {
        textGeneration: '$0.00015/1K input tokens, $0.00060/1K output tokens',
        imageGeneration: '$0.02-$0.10/image (varies by resolution)',
        imageEditing: '$0.03-$0.12/image (varies by resolution)',
      },
      latencyEstimate: {
        textGeneration: '1-3s',
        imageGeneration: '5-15s',
        imageEditing: '8-20s',
      },
      requiresApiKey: true,
      envVariableName: 'GEMINI_API_KEY',
    };
  }

  getAvailableModels(): ModelInfo[] {
    return [
      {
        id: 'gemini-2.0-flash-exp',
        name: 'Gemini 2.0 Flash',
        description: 'Fast text generation for prompt enhancement',
        supportsImageGeneration: false,
        supportsImageEditing: false,
        supportsComposition: false,
        supportedQualities: [],
        supportedAspectRatios: [],
      },
      {
        id: 'gemini-2.5-flash-image',
        name: 'Gemini 2.5 Flash Image',
        description: 'Fast image generation at 1024px resolution',
        supportsImageGeneration: true,
        supportsImageEditing: true,
        supportsComposition: true,
        supportedQualities: ['1K'],
        supportedAspectRatios: ['1:1', '16:9', '9:16', '4:3', '3:4'],
        maxResolution: { width: 1024, height: 1024 },
      },
      {
        id: 'gemini-3-pro-image-preview',
        name: 'Gemini 3 Pro Image',
        description: 'High-quality image generation with up to 4K resolution',
        supportsImageGeneration: true,
        supportsImageEditing: true,
        supportsComposition: true,
        supportedQualities: ['1K', '2K', '4K'],
        supportedAspectRatios: ['1:1', '16:9', '9:16', '4:3', '3:4'],
        maxResolution: { width: 4096, height: 4096 },
      },
    ];
  }

  async generateText(request: GenerateTextRequest): Promise<GenerateTextResponse> {
    this.ensureApiKey();

    try {
      const response = await this.client!.models.generateContent({
        model: 'gemini-2.0-flash-exp',
        contents: [
          {
            role: 'user',
            parts: [{ text: request.systemPrompt || '' }, { text: request.prompt }],
          },
        ],
        config: {
          temperature: request.temperature ?? 0.7,
          maxOutputTokens: request.maxTokens ?? 1024,
        },
      });

      const text = response.candidates?.[0]?.content?.parts?.[0]?.text || '';

      return {
        text,
        usage: {
          inputTokens: response.usageMetadata?.promptTokenCount || 0,
          outputTokens: response.usageMetadata?.candidatesTokenCount || 0,
        },
      };
    } catch (error) {
      this.handleError(error, 'text generation failed');
    }
  }

  async generateEnvironment(
    request: GenerateImageRequest
  ): Promise<GenerateImageResponse> {
    this.ensureApiKey();

    try {
      const model = request.config?.model || 'gemini-2.5-flash-image';
      const quality = request.config?.quality || '1K';
      const aspectRatio = request.config?.aspectRatio || '1:1';

      const config: any = {
        responseModalities: ['Image'],
      };

      // Pro model supports quality parameter
      if (model === 'gemini-3-pro-image-preview') {
        config.quality = quality;
      }

      // Add aspect ratio if supported
      if (aspectRatio !== '1:1') {
        config.aspectRatio = aspectRatio;
      }

      const response = await this.client!.models.generateContent({
        model,
        contents: [
          {
            role: 'user',
            parts: [{ text: request.prompt }],
          },
        ],
        config,
      });

      const imagePart = response.candidates?.[0]?.content?.parts?.find(
        (part: any) => part.inlineData
      );

      if (!imagePart?.inlineData) {
        throw new Error('No image data in response');
      }

      const mimeType = imagePart.inlineData.mimeType || 'image/png';
      const imageData = `data:${mimeType};base64,${imagePart.inlineData.data}`;

      return { imageData, format: mimeType };
    } catch (error) {
      this.handleError(error, 'environment generation failed');
    }
  }

  async composeProduct(request: ComposeImageRequest): Promise<ComposeImageResponse> {
    this.ensureApiKey();

    try {
      const model = request.config?.model || 'gemini-2.5-flash-image';
      const quality = request.config?.quality || '1K';
      const aspectRatio = request.config?.aspectRatio || '1:1';

      const parts: any[] = [{ text: request.prompt }];

      // Add sketch image if provided
      if (request.sketchImage) {
        parts.push({
          inlineData: {
            mimeType: this.getMimeType(request.sketchImage),
            data: this.extractBase64(request.sketchImage),
          },
        });
      }

      // Add environment image if provided
      if (request.environmentImage) {
        parts.push({
          inlineData: {
            mimeType: this.getMimeType(request.environmentImage),
            data: this.extractBase64(request.environmentImage),
          },
        });
      }

      // Add product images if provided
      if (request.productImages && request.productImages.length > 0) {
        for (const productImage of request.productImages) {
          parts.push({
            inlineData: {
              mimeType: this.getMimeType(productImage),
              data: this.extractBase64(productImage),
            },
          });
        }
      }

      const config: any = {
        responseModalities: ['Image'],
      };

      // Pro model supports quality parameter
      if (model === 'gemini-3-pro-image-preview') {
        config.quality = quality;
      }

      // Add aspect ratio if supported
      if (aspectRatio !== '1:1') {
        config.aspectRatio = aspectRatio;
      }

      const response = await this.client!.models.generateContent({
        model,
        contents: [{ role: 'user', parts }],
        config,
      });

      const imagePart = response.candidates?.[0]?.content?.parts?.find(
        (part: any) => part.inlineData
      );

      if (!imagePart?.inlineData) {
        throw new Error('No image data in response');
      }

      const mimeType = imagePart.inlineData.mimeType || 'image/png';
      const imageData = `data:${mimeType};base64,${imagePart.inlineData.data}`;

      return { imageData, format: mimeType };
    } catch (error) {
      this.handleError(error, 'product composition failed');
    }
  }

  async refineImage(request: RefineImageRequest): Promise<RefineImageResponse> {
    this.ensureApiKey();

    try {
      const model = request.config?.model || 'gemini-2.5-flash-image';
      const quality = request.config?.quality || '1K';
      const aspectRatio = request.config?.aspectRatio || '1:1';

      const parts: any[] = [
        { text: request.prompt },
        {
          inlineData: {
            mimeType: this.getMimeType(request.sourceImage),
            data: this.extractBase64(request.sourceImage),
          },
        },
      ];

      const config: any = {
        responseModalities: ['Image'],
      };

      // Pro model supports quality parameter
      if (model === 'gemini-3-pro-image-preview') {
        config.quality = quality;
      }

      // Add aspect ratio if supported
      if (aspectRatio !== '1:1') {
        config.aspectRatio = aspectRatio;
      }

      const response = await this.client!.models.generateContent({
        model,
        contents: [{ role: 'user', parts }],
        config,
      });

      const imagePart = response.candidates?.[0]?.content?.parts?.find(
        (part: any) => part.inlineData
      );

      if (!imagePart?.inlineData) {
        throw new Error('No image data in response');
      }

      const mimeType = imagePart.inlineData.mimeType || 'image/png';
      const imageData = `data:${mimeType};base64,${imagePart.inlineData.data}`;

      return { imageData, format: mimeType };
    } catch (error) {
      this.handleError(error, 'image refinement failed');
    }
  }

  getSupportedResolutions(): ResolutionOption[] {
    return [
      {
        label: '1K (1024×1024)',
        width: 1024,
        height: 1024,
        aspectRatio: '1:1',
      },
      {
        label: '2K (2048×2048)',
        width: 2048,
        height: 2048,
        aspectRatio: '1:1',
      },
      {
        label: '4K (4096×4096)',
        width: 4096,
        height: 4096,
        aspectRatio: '1:1',
      },
      {
        label: '16:9 HD',
        width: 1920,
        height: 1080,
        aspectRatio: '16:9',
      },
      {
        label: '16:9 4K',
        width: 3840,
        height: 2160,
        aspectRatio: '16:9',
      },
    ];
  }
}
