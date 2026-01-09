/**
 * AI Provider Types and Interfaces
 * Defines the abstraction layer for multiple AI backends
 */

export type AIProviderType = 'gemini' | 'claude' | 'openai' | 'replicate';

export type ImageQuality = '1K' | '2K' | '4K' | 'standard' | 'hd';

export type AspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4';

export interface ImageGenerationConfig {
  quality?: ImageQuality;
  aspectRatio?: AspectRatio;
  model?: string;
  [key: string]: unknown;
}

export interface GenerateTextRequest {
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface GenerateTextResponse {
  text: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

export interface GenerateImageRequest {
  prompt: string;
  config?: ImageGenerationConfig;
}

export interface GenerateImageResponse {
  imageData: string; // base64 data URL
  format?: string;
}

export interface ComposeImageRequest {
  prompt: string;
  sketchImage?: string; // base64 data URL
  environmentImage?: string; // base64 data URL
  productImages?: string[]; // base64 data URLs
  config?: ImageGenerationConfig;
  isFirstIteration?: boolean;
}

export interface ComposeImageResponse {
  imageData: string; // base64 data URL
  format?: string;
}

export interface RefineImageRequest {
  prompt: string;
  sourceImage: string; // base64 data URL
  config?: ImageGenerationConfig;
}

export interface RefineImageResponse {
  imageData: string; // base64 data URL
  format?: string;
}

export interface ResolutionOption {
  label: string;
  width: number;
  height: number;
  aspectRatio: AspectRatio;
}

export interface ModelInfo {
  id: string;
  name: string;
  description: string;
  supportsImageGeneration: boolean;
  supportsImageEditing: boolean;
  supportsComposition: boolean;
  supportedQualities: ImageQuality[];
  supportedAspectRatios: AspectRatio[];
  maxResolution?: {
    width: number;
    height: number;
  };
}

export interface ProviderMetadata {
  name: string;
  displayName: string;
  description: string;
  costEstimate: {
    textGeneration?: string; // e.g., "$0.001/1K tokens"
    imageGeneration?: string; // e.g., "$0.02/image"
    imageEditing?: string; // e.g., "$0.03/image"
  };
  latencyEstimate: {
    textGeneration?: string; // e.g., "1-2s"
    imageGeneration?: string; // e.g., "5-10s"
    imageEditing?: string; // e.g., "8-15s"
  };
  requiresApiKey: boolean;
  envVariableName: string;
}

export interface AIProvider {
  /**
   * Get provider metadata
   */
  getMetadata(): ProviderMetadata;

  /**
   * Get available models for this provider
   */
  getAvailableModels(): ModelInfo[];

  /**
   * Generate enhanced text from prompt
   */
  generateText(request: GenerateTextRequest): Promise<GenerateTextResponse>;

  /**
   * Generate environment or standalone images from text prompt
   */
  generateEnvironment(request: GenerateImageRequest): Promise<GenerateImageResponse>;

  /**
   * Compose product into environment using sketch and reference images
   */
  composeProduct(request: ComposeImageRequest): Promise<ComposeImageResponse>;

  /**
   * Refine/improve existing image based on text prompt
   */
  refineImage(request: RefineImageRequest): Promise<RefineImageResponse>;

  /**
   * Get supported resolutions for this provider
   */
  getSupportedResolutions(): ResolutionOption[];

  /**
   * Check if the provider is properly configured
   */
  isConfigured(): boolean;
}

export interface ProviderError {
  provider: AIProviderType;
  error: Error;
  canFallback: boolean;
}
