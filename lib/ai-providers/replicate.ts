/**
 * Replicate AI Provider
 * Implements the AI provider interface for Replicate (SDXL and other open-source models)
 */

import Replicate from 'replicate';
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

export class ReplicateProvider extends BaseAIProvider {
  private client: Replicate | null = null;

  constructor(apiKey?: string) {
    super(apiKey || process.env.REPLICATE_API_TOKEN);
    if (this.apiKey) {
      this.client = new Replicate({ auth: this.apiKey });
    }
  }

  getMetadata(): ProviderMetadata {
    return {
      name: 'replicate',
      displayName: 'Replicate',
      description: 'Run open-source models like SDXL, Stable Diffusion, and more',
      costEstimate: {
        textGeneration: '$0.001/prediction (Llama 3)',
        imageGeneration: '$0.0055-$0.01/image (SDXL)',
        imageEditing: '$0.01-$0.02/image (IP-Adapter)',
      },
      latencyEstimate: {
        textGeneration: '3-8s',
        imageGeneration: '15-45s',
        imageEditing: '20-60s',
      },
      requiresApiKey: true,
      envVariableName: 'REPLICATE_API_TOKEN',
    };
  }

  getAvailableModels(): ModelInfo[] {
    return [
      {
        id: 'stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b',
        name: 'SDXL 1.0',
        description: 'Stable Diffusion XL - high quality open-source image generation',
        supportsImageGeneration: true,
        supportsImageEditing: false,
        supportsComposition: false,
        supportedQualities: ['standard', 'hd'],
        supportedAspectRatios: ['1:1', '16:9', '9:16', '4:3', '3:4'],
        maxResolution: { width: 1024, height: 1024 },
      },
      {
        id: 'stability-ai/stable-diffusion:db21e45d3f7023abc2a46ee38a23973f6dce16bb082a930b0c49861f96d1e5bf',
        name: 'Stable Diffusion 2.1',
        description: 'Previous generation Stable Diffusion model',
        supportsImageGeneration: true,
        supportsImageEditing: true,
        supportsComposition: false,
        supportedQualities: ['standard'],
        supportedAspectRatios: ['1:1'],
        maxResolution: { width: 768, height: 768 },
      },
      {
        id: 'tencentarc/gfpgan:9283608cc6b7be6b65a8e44983db012355fde4132009bf99d976b2f0896856a3',
        name: 'GFPGAN',
        description: 'Face restoration and enhancement',
        supportsImageGeneration: false,
        supportsImageEditing: true,
        supportsComposition: false,
        supportedQualities: ['standard'],
        supportedAspectRatios: ['1:1'],
      },
    ];
  }

  async generateText(request: GenerateTextRequest): Promise<GenerateTextResponse> {
    this.ensureApiKey();

    try {
      const prompt = request.systemPrompt
        ? `${request.systemPrompt}\n\n${request.prompt}`
        : request.prompt;

      const output = await this.client!.run(
        'meta/meta-llama-3-70b-instruct' as any,
        {
          input: {
            prompt,
            max_tokens: request.maxTokens ?? 1024,
            temperature: request.temperature ?? 0.7,
          },
        }
      );

      // Output is an array of text chunks
      const text = Array.isArray(output) ? output.join('') : String(output);

      return {
        text,
        usage: {
          inputTokens: 0, // Replicate doesn't provide token counts
          outputTokens: 0,
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
      const model =
        request.config?.model ||
        'stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b';
      const aspectRatio = request.config?.aspectRatio || '1:1';

      // Calculate dimensions based on aspect ratio
      const dimensions = this.calculateResolution(
        aspectRatio,
        request.config?.quality || 'standard'
      );

      const output = await this.client!.run(model as any, {
        input: {
          prompt: request.prompt,
          width: dimensions.width,
          height: dimensions.height,
          num_outputs: 1,
          guidance_scale: 7.5,
          num_inference_steps: 50,
        },
      });

      // Output is typically an array of URLs
      const imageUrl = Array.isArray(output) ? output[0] : String(output);

      // Download the image and convert to base64
      const imageData = await this.downloadAndConvertToBase64(imageUrl);

      return {
        imageData,
        format: 'image/png',
      };
    } catch (error) {
      this.handleError(error, 'environment generation failed');
    }
  }

  async composeProduct(request: ComposeImageRequest): Promise<ComposeImageResponse> {
    this.ensureApiKey();

    try {
      // Use img2img for composition
      if (!request.environmentImage) {
        throw new Error('Environment image is required for composition with Replicate');
      }

      const model =
        request.config?.model ||
        'stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b';

      const output = await this.client!.run(model as any, {
        input: {
          prompt: request.prompt,
          image: request.environmentImage,
          num_outputs: 1,
          guidance_scale: 7.5,
          num_inference_steps: 50,
          strength: 0.8, // How much to transform the input image
        },
      });

      const imageUrl = Array.isArray(output) ? output[0] : String(output);
      const imageData = await this.downloadAndConvertToBase64(imageUrl);

      return {
        imageData,
        format: 'image/png',
      };
    } catch (error) {
      this.handleError(error, 'product composition failed');
    }
  }

  async refineImage(request: RefineImageRequest): Promise<RefineImageResponse> {
    this.ensureApiKey();

    try {
      const model =
        request.config?.model ||
        'stability-ai/stable-diffusion:db21e45d3f7023abc2a46ee38a23973f6dce16bb082a930b0c49861f96d1e5bf';

      const output = await this.client!.run(model as any, {
        input: {
          prompt: request.prompt,
          image: request.sourceImage,
          num_outputs: 1,
          guidance_scale: 7.5,
          num_inference_steps: 50,
          strength: 0.5, // Lower strength for refinement
        },
      });

      const imageUrl = Array.isArray(output) ? output[0] : String(output);
      const imageData = await this.downloadAndConvertToBase64(imageUrl);

      return {
        imageData,
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
        label: 'Landscape (1024×768)',
        width: 1024,
        height: 768,
        aspectRatio: '4:3',
      },
      {
        label: 'Portrait (768×1024)',
        width: 768,
        height: 1024,
        aspectRatio: '3:4',
      },
      {
        label: 'Wide (1024×576)',
        width: 1024,
        height: 576,
        aspectRatio: '16:9',
      },
      {
        label: 'Tall (576×1024)',
        width: 576,
        height: 1024,
        aspectRatio: '9:16',
      },
    ];
  }

  /**
   * Download image from URL and convert to base64 data URL
   */
  private async downloadAndConvertToBase64(url: string): Promise<string> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to download image: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64 = buffer.toString('base64');

      return `data:image/png;base64,${base64}`;
    } catch (error) {
      throw new Error(
        `Failed to download and convert image: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}
