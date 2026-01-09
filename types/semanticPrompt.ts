/**
 * Types for semantic prompt assistant system
 */

import { ExcalidrawElement } from "@excalidraw/excalidraw/types/element/types";
import { ImageMetadata } from "./canvas";

// ============================================================================
// Core Prompt Template Types
// ============================================================================

/**
 * Template variable definitions
 */
export interface PromptVariables {
  scene_description: string;
  placement_instructions: string;
  lighting_style: string;
  product_style: string;
  environment_details: string;
  composition_rules: string;
  atmosphere: string;
  technical_specs: string;
  color_palette: string;
  materials: string;
  [key: string]: string; // Allow custom variables
}

/**
 * Prompt template with placeholders
 */
export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  template: string;
  category: 'environment' | 'product' | 'composition' | 'improvement' | 'custom';
  variables: (keyof PromptVariables)[];
  defaults?: Partial<PromptVariables>;
}

// ============================================================================
// Annotation Semantic Types
// ============================================================================

/**
 * Semantic role for canvas annotations
 */
export type AnnotationRole =
  | 'placement_indicator'   // Arrow pointing to placement location
  | 'emphasis'             // Circle highlighting area
  | 'instruction'          // Text with instructions
  | 'measurement'          // Dimension or scale indicator
  | 'reference'            // General reference marker
  | 'constraint'           // Boundary or limit indicator
  | 'unknown';             // Unclassified annotation

/**
 * Parsed semantic annotation
 */
export interface SemanticAnnotation {
  id: string;
  type: ExcalidrawElement['type'];
  role: AnnotationRole;
  content?: string;          // Text content if text element
  position: { x: number; y: number };
  targetImageId?: string;    // Related image if detected
  confidence: number;        // 0-1 confidence in role classification
  metadata: {
    color?: string;
    size?: number;
    isHighlighted?: boolean;
  };
}

/**
 * Spatial relationship between annotation and image
 */
export type SpatialRelation =
  | 'points_to'
  | 'encircles'
  | 'adjacent_to'
  | 'overlaps'
  | 'near'
  | 'above'
  | 'below'
  | 'left_of'
  | 'right_of';

export interface AnnotationImageRelation {
  annotationId: string;
  imageId: string;
  relation: SpatialRelation;
  confidence: number;
}

// ============================================================================
// Product Metadata Types
// ============================================================================

/**
 * Extended product metadata
 */
export interface ProductMetadata {
  category?: string;         // e.g., "furniture", "electronics", "decor"
  subcategory?: string;      // e.g., "sofa", "laptop", "vase"
  materials?: string[];      // e.g., ["leather", "wood", "metal"]
  colors?: string[];         // e.g., ["navy blue", "silver"]
  style?: string;            // e.g., "modern", "vintage", "minimalist"
  dimensions?: {
    width?: number;
    height?: number;
    depth?: number;
    unit?: 'cm' | 'in' | 'm';
  };
  features?: string[];       // Notable features
  tags?: string[];           // Custom tags
}

/**
 * Extended image metadata with product info
 */
export interface EnhancedImageMetadata extends ImageMetadata {
  productMetadata?: ProductMetadata;
}

// ============================================================================
// Environment & Style Types
// ============================================================================

/**
 * Lighting preset
 */
export interface LightingPreset {
  id: string;
  name: string;
  description: string;
  prompt: string;            // Lighting description for prompt
  keywords: string[];        // Helper keywords
}

/**
 * Style preset
 */
export interface StylePreset {
  id: string;
  name: string;
  description: string;
  prompt: string;            // Style description for prompt
  keywords: string[];
  category: 'photography' | 'artistic' | 'commercial' | 'technical';
}

/**
 * Environment context
 */
export interface EnvironmentContext {
  type?: string;             // e.g., "living room", "outdoor", "studio"
  lighting?: string;         // Derived from preset or user input
  ambiance?: string;         // e.g., "cozy", "professional", "dramatic"
  timeOfDay?: string;        // e.g., "morning", "golden hour", "night"
  weather?: string;          // e.g., "sunny", "overcast", "stormy"
}

// ============================================================================
// Semantic Prompt Builder Input/Output
// ============================================================================

/**
 * Input to the semantic prompt builder
 */
export interface PromptBuilderInput {
  // User input
  userDescription: string;
  userIntent?: 'compose' | 'improve' | 'create_environment' | 'create_asset';

  // Canvas state
  canvasElements?: ExcalidrawElement[];

  // Images
  environmentImage?: EnhancedImageMetadata;
  productImages?: EnhancedImageMetadata[];
  targetImage?: EnhancedImageMetadata; // For improvement

  // Semantic analysis
  annotations?: SemanticAnnotation[];
  annotationRelations?: AnnotationImageRelation[];

  // Context
  environmentContext?: EnvironmentContext;
  lightingPreset?: LightingPreset;
  stylePreset?: StylePreset;

  // Generation params
  model?: string;
  quality?: string;
  aspectRatio?: string;

  // Template selection
  templateId?: string;
}

/**
 * Output from the semantic prompt builder
 */
export interface PromptBuilderOutput {
  // Final prompt
  enhancedPrompt: string;

  // Components
  variables: PromptVariables;
  template: PromptTemplate;

  // Metadata
  confidence: number;         // Overall confidence in prompt quality
  usedAnnotations: string[];  // IDs of annotations used
  suggestions?: string[];     // Suggestions for improvement

  // Structured breakdown
  components: {
    sceneDescription: string;
    placementInstructions: string;
    technicalDetails: string;
    styleGuidance: string;
  };
}

// ============================================================================
// LLM Classification Types
// ============================================================================

/**
 * Request for LLM-based text classification
 */
export interface TextClassificationRequest {
  text: string;
  context?: 'product' | 'environment' | 'instruction' | 'style';
  existingMetadata?: Partial<ProductMetadata | EnvironmentContext>;
}

/**
 * Response from LLM text classification
 */
export interface TextClassificationResponse {
  // Structured attributes extracted
  productMetadata?: Partial<ProductMetadata>;
  environmentContext?: Partial<EnvironmentContext>;

  // Refined text
  refinedText: string;

  // Confidence scores
  confidence: {
    overall: number;
    category?: number;
    style?: number;
    materials?: number;
  };

  // Extracted entities
  entities: {
    type: 'color' | 'material' | 'style' | 'location' | 'object' | 'lighting' | 'mood';
    value: string;
    confidence: number;
  }[];
}

// ============================================================================
// Preset Definitions
// ============================================================================

export const LIGHTING_PRESETS: LightingPreset[] = [
  {
    id: 'natural_daylight',
    name: 'Natural Daylight',
    description: 'Soft natural light from windows',
    prompt: 'natural daylight streaming through windows, soft ambient lighting, gentle shadows',
    keywords: ['natural', 'daylight', 'window light', 'ambient']
  },
  {
    id: 'golden_hour',
    name: 'Golden Hour',
    description: 'Warm sunset lighting',
    prompt: 'golden hour lighting, warm sunset tones, long soft shadows, glowing atmosphere',
    keywords: ['golden hour', 'sunset', 'warm', 'glowing']
  },
  {
    id: 'studio_lighting',
    name: 'Studio Lighting',
    description: 'Professional studio setup',
    prompt: 'professional studio lighting, three-point light setup, even illumination, controlled shadows',
    keywords: ['studio', 'professional', 'three-point', 'controlled']
  },
  {
    id: 'dramatic_contrast',
    name: 'Dramatic Contrast',
    description: 'High contrast chiaroscuro',
    prompt: 'dramatic chiaroscuro lighting, deep shadows, high contrast, single key light source',
    keywords: ['dramatic', 'chiaroscuro', 'contrast', 'moody']
  },
  {
    id: 'soft_diffused',
    name: 'Soft Diffused',
    description: 'Gentle shadowless lighting',
    prompt: 'soft diffused lighting, overcast sky, minimal shadows, even illumination',
    keywords: ['soft', 'diffused', 'gentle', 'even']
  },
  {
    id: 'rim_lighting',
    name: 'Rim Lighting',
    description: 'Backlit edge highlights',
    prompt: 'rim lighting, backlit subject, glowing edges, dramatic separation from background',
    keywords: ['rim', 'backlit', 'edge', 'separation']
  }
];

export const STYLE_PRESETS: StylePreset[] = [
  {
    id: 'photorealistic',
    name: 'Photorealistic',
    description: 'Ultra-realistic photography',
    prompt: 'photorealistic, high-resolution, professional photography, sharp details, accurate colors',
    keywords: ['realistic', 'photography', 'detailed', 'accurate'],
    category: 'photography'
  },
  {
    id: 'commercial_product',
    name: 'Commercial Product',
    description: 'Commercial catalog style',
    prompt: 'commercial product photography, clean composition, marketing-ready, professional presentation',
    keywords: ['commercial', 'catalog', 'marketing', 'clean'],
    category: 'commercial'
  },
  {
    id: 'lifestyle',
    name: 'Lifestyle',
    description: 'Natural lifestyle context',
    prompt: 'lifestyle photography, natural setting, lived-in feel, authentic atmosphere',
    keywords: ['lifestyle', 'natural', 'authentic', 'casual'],
    category: 'commercial'
  },
  {
    id: 'architectural',
    name: 'Architectural',
    description: 'Architectural photography',
    prompt: 'architectural photography, geometric composition, clean lines, perspective control',
    keywords: ['architectural', 'geometric', 'lines', 'structure'],
    category: 'photography'
  },
  {
    id: 'minimalist',
    name: 'Minimalist',
    description: 'Clean minimalist aesthetic',
    prompt: 'minimalist aesthetic, clean composition, negative space, simple elegance',
    keywords: ['minimalist', 'clean', 'simple', 'negative space'],
    category: 'artistic'
  },
  {
    id: 'cinematic',
    name: 'Cinematic',
    description: 'Film-like quality',
    prompt: 'cinematic quality, film-like aesthetic, color grading, atmospheric depth',
    keywords: ['cinematic', 'film', 'atmospheric', 'graded'],
    category: 'artistic'
  }
];

export const DEFAULT_PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    id: 'product_composition',
    name: 'Product Composition',
    description: 'Compose products into environment scenes',
    category: 'composition',
    template: `Composite the product into this environment scene with the following specifications:

Scene: {scene_description}

Product Placement: {placement_instructions}

Lighting: {lighting_style}

Style & Atmosphere: {product_style}
{atmosphere}

Technical Requirements: {technical_specs}

Composition: {composition_rules}

Ensure the product integrates naturally into the scene with proper lighting, shadows, reflections, and perspective matching.`,
    variables: ['scene_description', 'placement_instructions', 'lighting_style', 'product_style', 'atmosphere', 'technical_specs', 'composition_rules']
  },
  {
    id: 'environment_generation',
    name: 'Environment Generation',
    description: 'Create new environment from description',
    category: 'environment',
    template: `Create a photorealistic environment scene:

Scene Description: {scene_description}

Environment Details: {environment_details}

Lighting: {lighting_style}

Atmosphere & Mood: {atmosphere}

Color Palette: {color_palette}

Technical Specifications: {technical_specs}`,
    variables: ['scene_description', 'environment_details', 'lighting_style', 'atmosphere', 'color_palette', 'technical_specs'],
    defaults: {
      technical_specs: 'High-resolution, sharp focus, professional photography quality'
    }
  },
  {
    id: 'image_improvement',
    name: 'Image Improvement',
    description: 'Iterate and improve existing images',
    category: 'improvement',
    template: `Improve this image with the following modifications:

{scene_description}

Maintain: Keep the overall composition and subject positioning

Enhance: {product_style}

Lighting Adjustment: {lighting_style}

Additional Details: {environment_details}`,
    variables: ['scene_description', 'product_style', 'lighting_style', 'environment_details']
  }
];
