/**
 * Anthropic Claude AI Provider
 * Implements the AI provider interface for Claude
 */

import Anthropic from '@anthropic-ai/sdk';
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

export class ClaudeProvider extends BaseAIProvider {
  private client: Anthropic | null = null;

  constructor(apiKey?: string) {
    super(apiKey || process.env.ANTHROPIC_API_KEY);
    if (this.apiKey) {
      this.client = new Anthropic({ apiKey: this.apiKey });
    }
  }

  getMetadata(): ProviderMetadata {
    return {
      name: 'claude',
      displayName: 'Anthropic Claude',
      description: 'Claude with advanced vision and image understanding capabilities',
      costEstimate: {
        textGeneration: '$3.00/1M input tokens, $15.00/1M output tokens (Sonnet)',
        imageGeneration: 'Not directly supported - uses vision for image analysis',
        imageEditing: 'Not directly supported - uses vision for guidance',
      },
      latencyEstimate: {
        textGeneration: '2-5s',
        imageGeneration: 'N/A',
        imageEditing: 'N/A',
      },
      requiresApiKey: true,
      envVariableName: 'ANTHROPIC_API_KEY',
    };
  }

  getAvailableModels(): ModelInfo[] {
    return [
      {
        id: 'claude-3-5-sonnet-20241022',
        name: 'Claude 3.5 Sonnet',
        description: 'Advanced vision model for image analysis and guidance',
        supportsImageGeneration: false,
        supportsImageEditing: false,
        supportsComposition: false,
        supportedQualities: [],
        supportedAspectRatios: [],
      },
      {
        id: 'claude-3-opus-20240229',
        name: 'Claude 3 Opus',
        description: 'Most capable model for complex vision tasks',
        supportsImageGeneration: false,
        supportsImageEditing: false,
        supportsComposition: false,
        supportedQualities: [],
        supportedAspectRatios: [],
      },
    ];
  }

  async generateText(request: GenerateTextRequest): Promise<GenerateTextResponse> {
    this.ensureApiKey();

    try {
      const response = await this.client!.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: request.maxTokens ?? 1024,
        temperature: request.temperature ?? 0.7,
        system: request.systemPrompt,
        messages: [
          {
            role: 'user',
            content: request.prompt,
          },
        ],
      });

      const textContent = response.content.find((block) => block.type === 'text');
      const text = textContent && textContent.type === 'text' ? textContent.text : '';

      return {
        text,
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
        },
      };
    } catch (error) {
      this.handleError(error, 'text generation failed');
    }
  }

  async generateEnvironment(
    request: GenerateImageRequest
  ): Promise<GenerateImageResponse> {
    // Claude doesn't natively support image generation
    // This would require integration with a separate image generation service
    // For now, we'll throw an informative error
    throw new Error(
      'Claude does not natively support image generation. ' +
        'Consider using Gemini, OpenAI, or Replicate for image generation tasks.'
    );
  }

  async composeProduct(request: ComposeImageRequest): Promise<ComposeImageResponse> {
    this.ensureApiKey();

    // Claude can analyze images and provide detailed composition guidance
    // This implementation uses Claude's vision to generate a detailed prompt
    // that could be passed to another provider for actual image generation
    try {
      const content: Anthropic.MessageParam['content'] = [
        {
          type: 'text',
          text: `Analyze these images and provide a detailed prompt for composing the product into the environment.

Base request: ${request.prompt}

Please provide a detailed, technical prompt that describes:
1. The lighting conditions and how the product should match
2. Perspective and camera angle
3. Shadows and reflections
4. Color grading and tone matching
5. Integration details (placement, scale, orientation)`,
        },
      ];

      // Add images to content
      if (request.sketchImage) {
        content.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: this.getMimeType(request.sketchImage) as any,
            data: this.extractBase64(request.sketchImage),
          },
        });
      }

      if (request.environmentImage) {
        content.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: this.getMimeType(request.environmentImage) as any,
            data: this.extractBase64(request.environmentImage),
          },
        });
      }

      if (request.productImages && request.productImages.length > 0) {
        for (const productImage of request.productImages) {
          content.push({
            type: 'image',
            source: {
              type: 'base64',
              media_type: this.getMimeType(productImage) as any,
              data: this.extractBase64(productImage),
            },
          });
        }
      }

      const response = await this.client!.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2048,
        messages: [
          {
            role: 'user',
            content,
          },
        ],
      });

      const textContent = response.content.find((block) => block.type === 'text');
      const enhancedPrompt = textContent && textContent.type === 'text' ? textContent.text : '';

      // Note: This returns a guidance prompt, not an actual image
      // In a real implementation, this would be passed to another provider
      throw new Error(
        `Claude analyzed the images and provided guidance:\n\n${enhancedPrompt}\n\n` +
          'However, Claude cannot generate images directly. ' +
          'Please use Gemini, OpenAI, or Replicate as your provider for image composition.'
      );
    } catch (error) {
      this.handleError(error, 'image analysis failed');
    }
  }

  async refineImage(request: RefineImageRequest): Promise<RefineImageResponse> {
    this.ensureApiKey();

    // Similar to composeProduct, Claude can analyze and provide guidance
    try {
      const response = await this.client!.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2048,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze this image and provide detailed guidance for the following modification:\n\n${request.prompt}\n\nProvide specific, technical instructions for:
1. What should be changed
2. How to maintain consistency with the original
3. Lighting and color adjustments needed
4. Any technical considerations`,
              },
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: this.getMimeType(request.sourceImage) as any,
                  data: this.extractBase64(request.sourceImage),
                },
              },
            ],
          },
        ],
      });

      const textContent = response.content.find((block) => block.type === 'text');
      const guidance = textContent && textContent.type === 'text' ? textContent.text : '';

      throw new Error(
        `Claude analyzed the image and provided guidance:\n\n${guidance}\n\n` +
          'However, Claude cannot edit images directly. ' +
          'Please use Gemini, OpenAI, or Replicate as your provider for image editing.'
      );
    } catch (error) {
      this.handleError(error, 'image analysis failed');
    }
  }

  getSupportedResolutions(): ResolutionOption[] {
    // Claude doesn't generate images, so return empty array
    return [];
  }
}
