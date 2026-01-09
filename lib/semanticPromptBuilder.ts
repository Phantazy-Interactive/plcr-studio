/**
 * Semantic Prompt Builder
 * Automatically composes generation prompts based on UI state, annotations, and metadata
 */

import {
  PromptBuilderInput,
  PromptBuilderOutput,
  PromptVariables,
  PromptTemplate,
  DEFAULT_PROMPT_TEMPLATES,
  ProductMetadata,
  EnvironmentContext,
  LIGHTING_PRESETS,
  STYLE_PRESETS,
} from "@/types/semanticPrompt";
import { extractSemanticAnnotations, annotationsToText } from "./annotationParser";

// ============================================================================
// Template Engine
// ============================================================================

/**
 * Replace template variables with actual values
 */
export function renderTemplate(template: string, variables: PromptVariables): string {
  let rendered = template;

  // Replace all variables in format {variable_name}
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{${key}\\}`, 'g');
    rendered = rendered.replace(regex, value || '');
  }

  // Clean up empty lines
  rendered = rendered
    .split('\n')
    .filter(line => line.trim().length > 0 || line === '')
    .join('\n')
    .replace(/\n{3,}/g, '\n\n');

  return rendered.trim();
}

/**
 * Get template by ID or intent
 */
export function getTemplate(
  templateId?: string,
  intent?: PromptBuilderInput['userIntent']
): PromptTemplate {
  if (templateId) {
    const template = DEFAULT_PROMPT_TEMPLATES.find(t => t.id === templateId);
    if (template) return template;
  }

  // Default based on intent
  switch (intent) {
    case 'compose':
      return DEFAULT_PROMPT_TEMPLATES.find(t => t.id === 'product_composition')!;
    case 'improve':
      return DEFAULT_PROMPT_TEMPLATES.find(t => t.id === 'image_improvement')!;
    case 'create_environment':
      return DEFAULT_PROMPT_TEMPLATES.find(t => t.id === 'environment_generation')!;
    default:
      return DEFAULT_PROMPT_TEMPLATES[0]; // Default to product composition
  }
}

// ============================================================================
// Variable Extraction
// ============================================================================

/**
 * Extract scene description from user input and environment
 */
function extractSceneDescription(input: PromptBuilderInput): string {
  const parts: string[] = [];

  // User's description is primary
  if (input.userDescription) {
    parts.push(input.userDescription);
  }

  // Add environment context if available
  if (input.environmentContext) {
    const ctx = input.environmentContext;
    if (ctx.type) parts.push(`Setting: ${ctx.type}`);
    if (ctx.ambiance) parts.push(`Ambiance: ${ctx.ambiance}`);
    if (ctx.timeOfDay) parts.push(`Time: ${ctx.timeOfDay}`);
    if (ctx.weather) parts.push(`Weather: ${ctx.weather}`);
  }

  return parts.join('. ');
}

/**
 * Extract placement instructions from annotations
 */
function extractPlacementInstructions(input: PromptBuilderInput): string {
  const instructions: string[] = [];

  // Parse annotations if available
  if (input.annotations && input.annotationRelations) {
    const annotationText = annotationsToText(input.annotations, input.annotationRelations);
    if (annotationText) {
      instructions.push(annotationText);
    }
  }

  // Add product-specific placement from metadata
  if (input.productImages) {
    for (const product of input.productImages) {
      if (product.productMetadata?.category) {
        const category = product.productMetadata.category;
        const defaultPlacement = getDefaultPlacement(category);
        if (defaultPlacement) {
          instructions.push(defaultPlacement);
        }
      }
    }
  }

  // Fallback to generic instruction
  if (instructions.length === 0) {
    instructions.push('Place the product naturally in the scene with proper integration');
  }

  return instructions.join('. ');
}

/**
 * Get default placement instruction for product category
 */
function getDefaultPlacement(category: string): string {
  const placements: Record<string, string> = {
    furniture: 'Position on the floor or against appropriate surfaces with realistic shadows',
    electronics: 'Place on suitable surfaces (desk, table, shelf) with proper perspective',
    decor: 'Position at appropriate height and location for the item type',
    lighting: 'Mount or place according to fixture type with realistic light emission',
    art: 'Hang on wall or place on easel at appropriate viewing height',
    plants: 'Position on floor or elevated surface with natural lighting',
  };

  return placements[category.toLowerCase()] || '';
}

/**
 * Extract lighting style from presets and context
 */
function extractLightingStyle(input: PromptBuilderInput): string {
  // Preset takes priority
  if (input.lightingPreset) {
    return input.lightingPreset.prompt;
  }

  // Fall back to environment context
  if (input.environmentContext?.lighting) {
    return input.environmentContext.lighting;
  }

  // Default
  return 'Natural ambient lighting with soft shadows';
}

/**
 * Extract product style description
 */
function extractProductStyle(input: PromptBuilderInput): string {
  const styles: string[] = [];

  // Style preset
  if (input.stylePreset) {
    styles.push(input.stylePreset.prompt);
  }

  // Product metadata styles
  if (input.productImages) {
    for (const product of input.productImages) {
      if (product.productMetadata?.style) {
        styles.push(`${product.productMetadata.style} aesthetic`);
      }
    }
  }

  // Default
  if (styles.length === 0) {
    styles.push('Photorealistic, professional quality');
  }

  return styles.join(', ');
}

/**
 * Extract environment details
 */
function extractEnvironmentDetails(input: PromptBuilderInput): string {
  const details: string[] = [];

  // From environment metadata
  if (input.environmentImage?.productMetadata) {
    const meta = input.environmentImage.productMetadata;
    if (meta.features) {
      details.push(...meta.features);
    }
  }

  // From context
  if (input.environmentContext) {
    const ctx = input.environmentContext;
    if (ctx.type) details.push(ctx.type);
    if (ctx.ambiance) details.push(`${ctx.ambiance} atmosphere`);
  }

  return details.join(', ');
}

/**
 * Extract composition rules
 */
function extractCompositionRules(input: PromptBuilderInput): string {
  const rules: string[] = [
    'Maintain realistic perspective and scale',
    'Ensure proper shadow and reflection integration',
    'Match lighting direction and color temperature',
  ];

  // Add style-specific rules
  if (input.stylePreset) {
    const preset = input.stylePreset;
    if (preset.category === 'commercial') {
      rules.push('Clean, professional composition suitable for marketing');
    } else if (preset.category === 'artistic') {
      rules.push('Creative composition with artistic intent');
    }
  }

  return rules.join('. ');
}

/**
 * Extract atmosphere description
 */
function extractAtmosphere(input: PromptBuilderInput): string {
  const elements: string[] = [];

  if (input.environmentContext?.ambiance) {
    elements.push(input.environmentContext.ambiance);
  }

  if (input.stylePreset) {
    elements.push(input.stylePreset.description);
  }

  return elements.join(', ');
}

/**
 * Extract technical specifications
 */
function extractTechnicalSpecs(input: PromptBuilderInput): string {
  const specs: string[] = [
    'High-resolution output',
    'Sharp focus and detail',
  ];

  // Add quality-specific specs
  if (input.quality === '2K') {
    specs.push('2048px base resolution');
  } else if (input.quality === '4K') {
    specs.push('4096px base resolution');
  }

  // Add model-specific notes
  if (input.model?.includes('gemini-3-pro')) {
    specs.push('Professional-grade output quality');
  }

  // Add style-specific technical requirements
  if (input.stylePreset?.category === 'commercial') {
    specs.push('Commercial photography standards');
  }

  return specs.join(', ');
}

/**
 * Extract color palette
 */
function extractColorPalette(input: PromptBuilderInput): string {
  const colors: string[] = [];

  // From product metadata
  if (input.productImages) {
    for (const product of input.productImages) {
      if (product.productMetadata?.colors) {
        colors.push(...product.productMetadata.colors);
      }
    }
  }

  if (colors.length > 0) {
    return `Color palette: ${colors.join(', ')}`;
  }

  return 'Natural, balanced color palette';
}

/**
 * Extract materials description
 */
function extractMaterials(input: PromptBuilderInput): string {
  const materials: Set<string> = new Set();

  // From product metadata
  if (input.productImages) {
    for (const product of input.productImages) {
      if (product.productMetadata?.materials) {
        product.productMetadata.materials.forEach(m => materials.add(m));
      }
    }
  }

  if (materials.size > 0) {
    return `Materials: ${Array.from(materials).join(', ')}`;
  }

  return '';
}

/**
 * Build all prompt variables from input
 */
export function buildPromptVariables(input: PromptBuilderInput): PromptVariables {
  return {
    scene_description: extractSceneDescription(input),
    placement_instructions: extractPlacementInstructions(input),
    lighting_style: extractLightingStyle(input),
    product_style: extractProductStyle(input),
    environment_details: extractEnvironmentDetails(input),
    composition_rules: extractCompositionRules(input),
    atmosphere: extractAtmosphere(input),
    technical_specs: extractTechnicalSpecs(input),
    color_palette: extractColorPalette(input),
    materials: extractMaterials(input),
  };
}

// ============================================================================
// Main Prompt Builder
// ============================================================================

/**
 * Build enhanced prompt from UI state
 */
export async function buildSemanticPrompt(
  input: PromptBuilderInput
): Promise<PromptBuilderOutput> {
  // 1. Extract semantic annotations if canvas elements provided
  let annotations = input.annotations;
  let annotationRelations = input.annotationRelations;

  if (input.canvasElements && input.productImages && !annotations) {
    const images = [
      ...(input.environmentImage ? [input.environmentImage] : []),
      ...input.productImages,
    ];
    const extracted = extractSemanticAnnotations(input.canvasElements, images);
    annotations = extracted.annotations;
    annotationRelations = extracted.relations;
  }

  // Update input with extracted annotations
  const enrichedInput: PromptBuilderInput = {
    ...input,
    annotations,
    annotationRelations,
  };

  // 2. Select template
  const template = getTemplate(input.templateId, input.userIntent);

  // 3. Build variables
  const variables = buildPromptVariables(enrichedInput);

  // Apply template defaults
  if (template.defaults) {
    for (const [key, value] of Object.entries(template.defaults)) {
      if (!variables[key] || variables[key].trim().length === 0) {
        variables[key] = value;
      }
    }
  }

  // 4. Render template
  const enhancedPrompt = renderTemplate(template.template, variables);

  // 5. Calculate confidence
  const confidence = calculateConfidence(enrichedInput, variables);

  // 6. Generate suggestions
  const suggestions = generateSuggestions(enrichedInput, variables);

  // 7. Extract used annotations
  const usedAnnotations = annotations ? annotations.map(a => a.id) : [];

  // 8. Build component breakdown
  const components = {
    sceneDescription: variables.scene_description,
    placementInstructions: variables.placement_instructions,
    technicalDetails: `${variables.technical_specs}\n${variables.composition_rules}`,
    styleGuidance: `${variables.product_style}\n${variables.lighting_style}\n${variables.atmosphere}`,
  };

  return {
    enhancedPrompt,
    variables,
    template,
    confidence,
    usedAnnotations,
    suggestions,
    components,
  };
}

// ============================================================================
// Quality Assessment
// ============================================================================

/**
 * Calculate confidence score for the generated prompt
 */
function calculateConfidence(input: PromptBuilderInput, variables: PromptVariables): number {
  let score = 0.5; // Base score

  // User provided description
  if (input.userDescription && input.userDescription.length > 10) {
    score += 0.2;
  }

  // Has annotations
  if (input.annotations && input.annotations.length > 0) {
    score += 0.1;
  }

  // Has product metadata
  if (input.productImages?.some(p => p.productMetadata)) {
    score += 0.1;
  }

  // Has lighting preset
  if (input.lightingPreset) {
    score += 0.05;
  }

  // Has style preset
  if (input.stylePreset) {
    score += 0.05;
  }

  return Math.min(score, 1.0);
}

/**
 * Generate suggestions for improving the prompt
 */
function generateSuggestions(
  input: PromptBuilderInput,
  variables: PromptVariables
): string[] {
  const suggestions: string[] = [];

  // Check for missing elements
  if (!input.lightingPreset && !input.environmentContext?.lighting) {
    suggestions.push('Consider selecting a lighting preset for more consistent results');
  }

  if (!input.stylePreset) {
    suggestions.push('Add a style preset to better define the visual aesthetic');
  }

  if (input.productImages && !input.productImages.some(p => p.productMetadata)) {
    suggestions.push('Add product metadata (category, materials, style) for better integration');
  }

  if (!input.annotations || input.annotations.length === 0) {
    suggestions.push('Use arrows and text annotations to specify exact placement locations');
  }

  if (input.userDescription.length < 20) {
    suggestions.push('Provide a more detailed scene description for better results');
  }

  return suggestions;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create a simple prompt for basic use cases (backwards compatibility)
 */
export function createSimplePrompt(description: string): string {
  return `Composite the product(s) into the environment scene. ${description}. Ensure realistic lighting, shadows, reflections, and perspective matching.`;
}

/**
 * Get preset by ID
 */
export function getLightingPreset(id: string) {
  return LIGHTING_PRESETS.find(p => p.id === id);
}

export function getStylePreset(id: string) {
  return STYLE_PRESETS.find(p => p.id === id);
}

/**
 * Validate prompt input
 */
export function validatePromptInput(input: PromptBuilderInput): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!input.userDescription || input.userDescription.trim().length === 0) {
    errors.push('User description is required');
  }

  if (input.userIntent === 'compose') {
    if (!input.environmentImage) {
      errors.push('Environment image is required for composition');
    }
    if (!input.productImages || input.productImages.length === 0) {
      errors.push('At least one product image is required for composition');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
