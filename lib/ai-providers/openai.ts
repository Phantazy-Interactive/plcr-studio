/**
 * OpenAI AI Provider
 * Implements the AI provider interface for OpenAI (GPT + DALL-E)
 */

import OpenAI from 'openai';
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
} from './types';

export class OpenAIProvider extends BaseAIProvider {
  private client: OpenAI | null = null;

  constructor(apiKey?: string) {
    super(apiKey || process.env.OPENAI_API_KEY);
    if (this.apiKey) {
      this.client = new OpenAI({ apiKey: this.apiKey });
    }
  }

  getMetadata(): ProviderMetadata {
    return {
      name: 'openai',
      displayName: 'OpenAI',
      description: 'OpenAI\'s GPT for text and DALL-E for image generation',
      costEstimate: {
        textGeneration: '$0.15/1M input tokens, $0.60/1M output tokens (GPT-4o)',
        imageGeneration: '$0.040/image (DALL-E 3 standard), $0.080/image (HD)',
        imageEditing: '$0.020/image (DALL-E 2 edits)',
      },
      latencyEstimate: {
        textGeneration: '2-4s',
        imageGeneration: '10-30s',
        imageEditing: '15-40s',
      },
      requiresApiKey: true,
      envVariableName: 'OPENAI_API_KEY',
    };
  }

  getAvailableModels(): ModelInfo[] {
    return [
      {
        id: 'gpt-4o',
        name: 'GPT-4o',
        description: 'Advanced text generation with vision capabilities',
        supportsImageGeneration: false,
        supportsImageEditing: false,
        supportsComposition: false,
        supportedQualities: [],
        supportedAspectRatios: [],
      },
      {
        id: 'dall-e-3',
        name: 'DALL-E 3',
        description: 'Latest image generation model with high quality output',
        supportsImageGeneration: true,
        supportsImageEditing: false,
        supportsComposition: false,
        supportedQualities: ['standard', 'hd'],
        supportedAspectRatios: ['1:1', '16:9', '9:16'],
        maxResolution: { width: 1024, height: 1792 },
      },
      {
        id: 'dall-e-2',
        name: 'DALL-E 2',
        description: 'Previous generation with image editing support',
        supportsImageGeneration: true,
        supportsImageEditing: true,
        supportsComposition: true,
        supportedQualities: ['standard'],
        supportedAspectRatios: ['1:1'],
        maxResolution: { width: 1024, height: 1024 },
      },
    ];
  }

  async generateText(request: GenerateTextRequest): Promise<GenerateTextResponse> {
    this.ensureApiKey();

    try {
      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

      if (request.systemPrompt) {
        messages.push({
          role: 'system',
          content: request.systemPrompt,
        });
      }

      messages.push({
        role: 'user',
        content: request.prompt,
      });

      const response = await this.client!.chat.completions.create({
        model: 'gpt-4o',
        messages,
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens ?? 1024,
      });

      const text = response.choices[0]?.message?.content || '';

      return {
        text,
        usage: {
          inputTokens: response.usage?.prompt_tokens || 0,
          outputTokens: response.usage?.completion_tokens || 0,
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
      const model = request.config?.model || 'dall-e-3';
      const quality = request.config?.quality === 'hd' ? 'hd' : 'standard';
      const aspectRatio = request.config?.aspectRatio || '1:1';

      // Map aspect ratio to DALL-E size format
      let size: '1024x1024' | '1792x1024' | '1024x1792' = '1024x1024';
      if (model === 'dall-e-3') {
        if (aspectRatio === '16:9') {
          size = '1792x1024';
        } else if (aspectRatio === '9:16') {
          size = '1024x1792';
        }
      }

      const response = await this.client!.images.generate({
        model,
        prompt: request.prompt,
        n: 1,
        size,
        quality: model === 'dall-e-3' ? quality : undefined,
        response_format: 'b64_json',
      });

      const imageData = response.data[0]?.b64_json;
      if (!imageData) {
        throw new Error('No image data in response');
      }

      return {
        imageData: `data:image/png;base64,${imageData}`,
        format: 'image/png',
      };
    } catch (error) {
      this.handleError(error, 'environment generation failed');
    }
  }

  async composeProduct(request: ComposeImageRequest): Promise<ComposeImageResponse> {
    this.ensureApiKey();

    // DALL-E 2 supports image editing with masks
    // For composition, we'll use the edit endpoint
    try {
      // Note: DALL-E edit requires PNG format and a mask
      // This is a simplified implementation
      // In production, you'd need to generate a proper mask from the sketch

      if (!request.environmentImage) {
        throw new Error('Environment image is required for composition with OpenAI');
      }

      // Convert base64 to blob for upload
      const imageBlob = await this.base64ToBlob(request.environmentImage);

      // For composition, we create a simple mask (you'd typically generate this from the sketch)
      // Creating a transparent mask as a placeholder
      const maskBlob = await this.createTransparentMask(1024, 1024);

      const response = await this.client!.images.edit({
        model: 'dall-e-2',
        image: imageBlob as any,
        mask: maskBlob as any,
        prompt: request.prompt,
        n: 1,
        size: '1024x1024',
        response_format: 'b64_json',
      });

      const imageData = response.data[0]?.b64_json;
      if (!imageData) {
        throw new Error('No image data in response');
      }

      return {
        imageData: `data:image/png;base64,${imageData}`,
        format: 'image/png',
      };
    } catch (error) {
      this.handleError(error, 'product composition failed');
    }
  }

  async refineImage(request: RefineImageRequest): Promise<RefineImageResponse> {
    this.ensureApiKey();

    try {
      // Convert base64 to blob for upload
      const imageBlob = await this.base64ToBlob(request.sourceImage);

      // Create a transparent mask (full image editing)
      const maskBlob = await this.createTransparentMask(1024, 1024);

      const response = await this.client!.images.edit({
        model: 'dall-e-2',
        image: imageBlob as any,
        mask: maskBlob as any,
        prompt: request.prompt,
        n: 1,
        size: '1024x1024',
        response_format: 'b64_json',
      });

      const imageData = response.data[0]?.b64_json;
      if (!imageData) {
        throw new Error('No image data in response');
      }

      return {
        imageData: `data:image/png;base64,${imageData}`,
        format: 'image/png',
      };
    } catch (error) {
      this.handleError(error, 'image refinement failed');
    }
  }

  getSupportedResolutions(): ResolutionOption[] {
    return [
      {
        label: 'Square (1024×1024)',
        width: 1024,
        height: 1024,
        aspectRatio: '1:1',
      },
      {
        label: 'Landscape (1792×1024)',
        width: 1792,
        height: 1024,
        aspectRatio: '16:9',
      },
      {
        label: 'Portrait (1024×1792)',
        width: 1024,
        height: 1792,
        aspectRatio: '9:16',
      },
    ];
  }

  /**
   * Convert base64 data URL to Blob
   */
  private async base64ToBlob(dataUrl: string): Promise<Blob> {
    const base64 = this.extractBase64(dataUrl);
    const mimeType = this.getMimeType(dataUrl);

    // Convert base64 to binary
    const binary = atob(base64);
    const array = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      array[i] = binary.charCodeAt(i);
    }

    return new Blob([array], { type: mimeType });
  }

  /**
   * Create a transparent PNG mask
   */
  private async createTransparentMask(width: number, height: number): Promise<Blob> {
    // Create a minimal transparent PNG
    // In production, this should be generated properly from canvas
    const canvas = typeof document !== 'undefined'
      ? document.createElement('canvas')
      : null;

    if (!canvas) {
      // Server-side fallback - create minimal PNG data
      // This is a very basic implementation
      throw new Error('Mask generation requires canvas API');
    }

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }

    // Fill with transparent pixels
    ctx.clearRect(0, 0, width, height);

    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create mask blob'));
        }
      }, 'image/png');
    });
  }
}
