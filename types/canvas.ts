export type ImageType = 'environment' | 'product' | 'generated' | 'asset';

export type AIProviderType = 'gemini' | 'claude' | 'openai' | 'replicate';

export type ImageQuality = '1K' | '2K' | '4K' | 'standard' | 'hd';

export type AspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4';

export interface ImageMetadata {
  id: string;
  type: ImageType;
  dataUrl: string;           // For display in Excalidraw
  highResDataUrl: string;    // Original high-res for API calls
  excalidrawFileId: string;  // File ID in Excalidraw's file system
  excalidrawElementId: string; // Element ID on canvas
  addedAt: number;
  width: number;
  height: number;
  isLocked: boolean;
  name?: string;
  provider?: AIProviderType; // AI provider used to generate this image
  model?: string;            // Model used to generate this image
}

export interface GenerationHistoryItem {
  id: string;
  generatedImageUrl: string;
  prompt: string;
  timestamp: number;
  sourceImages: {
    environmentId: string;
    productIds: string[];
  };
  provider?: AIProviderType;
  model?: string;
}

export interface GenerateImageParams {
  prompt?: string;
  preserveEnvironment?: boolean;
  provider?: AIProviderType;
  model?: string;
  quality?: ImageQuality;
  aspectRatio?: AspectRatio;
}

export interface CanvasWorkspaceState {
  hasEnvironment: boolean;
  showInitialDialog: boolean;
  imageMetadata: Map<string, ImageMetadata>;
  isGenerating: boolean;
  generationHistory: GenerationHistoryItem[];
  excalidrawAPI: any | null; // ExcalidrawImperativeAPI type
}
