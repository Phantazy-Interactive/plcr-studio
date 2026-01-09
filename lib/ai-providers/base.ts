/**
 * Base AI Provider Class
 * Provides common utilities for all AI providers
 */

import type {
  AIProvider,
  ProviderMetadata,
  ModelInfo,
  ResolutionOption,
  AspectRatio,
} from './types';

export abstract class BaseAIProvider implements AIProvider {
  protected apiKey: string | undefined;

  constructor(apiKey?: string) {
    this.apiKey = apiKey;
  }

  abstract getMetadata(): ProviderMetadata;
  abstract getAvailableModels(): ModelInfo[];
  abstract generateText(request: any): Promise<any>;
  abstract generateEnvironment(request: any): Promise<any>;
  abstract composeProduct(request: any): Promise<any>;
  abstract refineImage(request: any): Promise<any>;
  abstract getSupportedResolutions(): ResolutionOption[];

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Validate and normalize base64 data URL
   */
  protected normalizeDataUrl(dataUrl: string): string {
    if (!dataUrl) {
      throw new Error('Data URL is required');
    }

    // If it's already a data URL, return as is
    if (dataUrl.startsWith('data:')) {
      return dataUrl;
    }

    // If it's raw base64, add the data URL prefix
    return `data:image/png;base64,${dataUrl}`;
  }

  /**
   * Extract base64 data from data URL
   */
  protected extractBase64(dataUrl: string): string {
    if (dataUrl.startsWith('data:')) {
      const base64Match = dataUrl.match(/base64,(.+)/);
      return base64Match ? base64Match[1] : dataUrl;
    }
    return dataUrl;
  }

  /**
   * Get MIME type from data URL
   */
  protected getMimeType(dataUrl: string): string {
    const match = dataUrl.match(/data:([^;]+);/);
    return match ? match[1] : 'image/png';
  }

  /**
   * Calculate resolution from aspect ratio and quality
   */
  protected calculateResolution(
    aspectRatio: AspectRatio,
    quality: string
  ): { width: number; height: number } {
    const baseSize = quality === '4K' ? 3840 : quality === '2K' ? 2048 : 1024;

    const ratios: Record<AspectRatio, { width: number; height: number }> = {
      '1:1': { width: baseSize, height: baseSize },
      '16:9': {
        width: Math.round(baseSize * 1.33),
        height: Math.round((baseSize * 1.33) / 1.778),
      },
      '9:16': {
        width: Math.round(baseSize / 1.778),
        height: Math.round(baseSize * 1.33),
      },
      '4:3': {
        width: Math.round(baseSize * 1.15),
        height: Math.round((baseSize * 1.15) / 1.333),
      },
      '3:4': {
        width: Math.round(baseSize / 1.333),
        height: Math.round(baseSize * 1.15),
      },
    };

    return ratios[aspectRatio] || ratios['1:1'];
  }

  /**
   * Ensure API key is available
   */
  protected ensureApiKey(): string {
    if (!this.apiKey) {
      const metadata = this.getMetadata();
      throw new Error(
        `${metadata.displayName} API key not configured. Please set ${metadata.envVariableName} in your environment variables.`
      );
    }
    return this.apiKey;
  }

  /**
   * Handle provider-specific errors
   */
  protected handleError(error: unknown, context: string): never {
    const metadata = this.getMetadata();
    if (error instanceof Error) {
      throw new Error(`${metadata.displayName} ${context}: ${error.message}`);
    }
    throw new Error(`${metadata.displayName} ${context}: Unknown error`);
  }
}
