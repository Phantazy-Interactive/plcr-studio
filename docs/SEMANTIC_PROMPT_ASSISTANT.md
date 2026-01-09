# Semantic Prompt Assistant - Integration Guide

## Overview

The Semantic Prompt Assistant automatically composes enhanced generation prompts by analyzing:
- User environment descriptions
- Canvas annotations (arrows, circles, text)
- Product metadata (category, materials, style)
- Lighting and style presets

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      User Interface                          │
│  ┌────────────────┐  ┌──────────────┐  ┌─────────────────┐ │
│  │ Canvas + Annotations │  Product Metadata │  Style Presets │ │
│  └────────────────┘  └──────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              useSemanticPrompt Hook                          │
│  • Collects UI state                                        │
│  • Calls semantic prompt builder                            │
│  • Returns structured prompt output                         │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│           Semantic Prompt Builder                            │
│  ┌──────────────────────┐  ┌──────────────────────┐        │
│  │ Annotation Parser     │  │ Template Engine       │        │
│  │ • Parse Excalidraw    │  │ • Variable extraction │        │
│  │ • Classify roles      │  │ • Template rendering  │        │
│  │ • Spatial analysis    │  │ • Confidence scoring  │        │
│  └──────────────────────┘  └──────────────────────┘        │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              PromptPreviewDialog                             │
│  • Show enhanced prompt                                     │
│  • Allow editing                                            │
│  • Display confidence & breakdown                           │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              Generation API                                  │
│  • /api/generate-combination                                │
│  • /api/generate-environment                                │
│  • /api/generate-improvement                                │
└─────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Type System (`/types/semanticPrompt.ts`)

Defines all types for the semantic prompt system:

```typescript
// Template variables
interface PromptVariables {
  scene_description: string;
  placement_instructions: string;
  lighting_style: string;
  product_style: string;
  // ... more variables
}

// Semantic annotations
interface SemanticAnnotation {
  id: string;
  role: 'placement_indicator' | 'emphasis' | 'instruction' | ...;
  content?: string;
  position: { x: number; y: number };
  targetImageId?: string;
  confidence: number;
}

// Product metadata
interface ProductMetadata {
  category?: string;
  materials?: string[];
  colors?: string[];
  style?: string;
  // ... more fields
}
```

### 2. Annotation Parser (`/lib/annotationParser.ts`)

Extracts semantic meaning from canvas elements:

```typescript
import { extractSemanticAnnotations } from "@/lib/annotationParser";

// Parse canvas elements
const { annotations, relations } = extractSemanticAnnotations(
  canvasElements,
  images
);

// Results include:
// - Classified annotations (arrows, text, circles)
// - Spatial relationships to images
// - Confidence scores
```

**Annotation Classification:**
- **Arrows** → `placement_indicator` (shows where to place products)
- **Circles** → `emphasis` (highlights areas of interest)
- **Text** → Analyzed for keywords:
  - "place here", "center" → `instruction`
  - "10cm", "scale" → `measurement`
  - "don't", "avoid" → `constraint`

### 3. Semantic Prompt Builder (`/lib/semanticPromptBuilder.ts`)

Main engine that builds enhanced prompts:

```typescript
import { buildSemanticPrompt } from "@/lib/semanticPromptBuilder";

const input: PromptBuilderInput = {
  userDescription: "Modern living room with sofa",
  userIntent: "compose",
  canvasElements: excalidrawElements,
  environmentImage: envMetadata,
  productImages: [productMetadata],
  lightingPreset: getLightingPreset("natural_daylight"),
  stylePreset: getStylePreset("photorealistic"),
  model: "gemini-2.5-flash-image",
  quality: "1K",
};

const output = await buildSemanticPrompt(input);

// Output includes:
// - enhancedPrompt: string (final prompt)
// - variables: PromptVariables (all variable values)
// - template: PromptTemplate (used template)
// - confidence: number (0-1)
// - suggestions: string[] (improvement suggestions)
```

### 4. React Hook (`/hooks/useSemanticPrompt.ts`)

Convenient hook for components:

```typescript
import { useSemanticPrompt } from "@/hooks/useSemanticPrompt";

function MyComponent() {
  const {
    promptOutput,
    isBuilding,
    error,
    generateCompositionPrompt,
    classifyText,
  } = useSemanticPrompt();

  const handleGenerate = async () => {
    const output = await generateCompositionPrompt({
      userDescription: "Place the sofa in the center",
      canvasElements: elements,
      environmentImage: env,
      productImages: [product],
      lightingPresetId: "golden_hour",
      stylePresetId: "lifestyle",
    });

    if (output) {
      // Show prompt preview dialog
    }
  };
}
```

### 5. UI Components

**PromptPreviewDialog** (`/components/PromptPreviewDialog.tsx`):
```typescript
import PromptPreviewDialog from "@/components/PromptPreviewDialog";

<PromptPreviewDialog
  isOpen={showDialog}
  promptOutput={promptOutput}
  onGenerate={(finalPrompt) => {
    // Use finalPrompt for generation
  }}
  onClose={() => setShowDialog(false)}
  onRegenerate={handleRegenerate}
  isGenerating={isGenerating}
/>
```

**ProductMetadataDialog** (`/components/ProductMetadataDialog.tsx`):
```typescript
import ProductMetadataDialog from "@/components/ProductMetadataDialog";

<ProductMetadataDialog
  isOpen={showMetadataDialog}
  metadata={currentProduct.productMetadata}
  onSave={(metadata) => {
    // Save metadata to product
    updateProductMetadata(productId, metadata);
  }}
  onClose={() => setShowMetadataDialog(false)}
  onClassify={async (text) => {
    // Use LLM to extract metadata
    const result = await classifyText({
      text,
      context: "product"
    });
    return result;
  }}
/>
```

### 6. LLM Classification API (`/app/api/classify-text/route.ts`)

Endpoint for refining user text into structured attributes:

```typescript
// Request
POST /api/classify-text
{
  "text": "modern blue leather sofa with chrome legs",
  "context": "product"
}

// Response
{
  "status": "success",
  "classification": {
    "productMetadata": {
      "category": "furniture",
      "subcategory": "sofa",
      "materials": ["leather", "chrome"],
      "colors": ["blue"],
      "style": "modern"
    },
    "refinedText": "A modern sofa featuring blue leather upholstery...",
    "confidence": {
      "overall": 0.92,
      "category": 0.98,
      "style": 0.87,
      "materials": 0.94
    },
    "entities": [
      { "type": "material", "value": "leather", "confidence": 0.95 },
      { "type": "color", "value": "blue", "confidence": 0.98 }
    ]
  }
}
```

## Integration with Existing Code

### Step 1: Update Image Metadata Type

Extend the existing `ImageMetadata` type to support product metadata:

```typescript
// In types/canvas.ts
import type { ProductMetadata } from "./semanticPrompt";

export interface ImageMetadata {
  id: string;
  type: ImageType;
  // ... existing fields
  productMetadata?: ProductMetadata; // Add this
}
```

### Step 2: Integrate with `useGenerationManager`

Replace the hardcoded prompt with semantic prompt:

```typescript
// In hooks/useGenerationManager.ts
import { buildSemanticPrompt } from "@/lib/semanticPromptBuilder";

const generateImage = async (
  model?: string,
  quality?: string,
  aspectRatio?: string,
  userDescription?: string, // Add this parameter
  canvasElements?: ExcalidrawElement[], // Add this parameter
) => {
  try {
    // ... existing canvas export code

    const environmentImage = getEnvironmentImage();
    const productImages = getProductImages();

    // Build semantic prompt
    const promptOutput = await buildSemanticPrompt({
      userDescription: userDescription || "Composite the product naturally",
      userIntent: "compose",
      canvasElements: canvasElements,
      environmentImage: environmentImage as EnhancedImageMetadata,
      productImages: productImages as EnhancedImageMetadata[],
      model,
      quality,
      aspectRatio,
    });

    // Use enhanced prompt instead of hardcoded one
    const payload = {
      sketchImage: sketchDataUrl,
      environmentImage: resizedEnvironmentUrl,
      productImages: resizedProductUrls,
      prompt: promptOutput.enhancedPrompt, // ← Use semantic prompt
      isFirstIteration: true,
      model,
      quality,
      aspectRatio,
    };

    // ... rest of generation code
  }
};
```

### Step 3: Add Prompt Preview Flow

```typescript
// In components/EnhancedExcalidrawCanvas.tsx
import { useSemanticPrompt } from "@/hooks/useSemanticPrompt";
import PromptPreviewDialog from "@/components/PromptPreviewDialog";

function EnhancedExcalidrawCanvas() {
  const [showPromptPreview, setShowPromptPreview] = useState(false);
  const { promptOutput, generateCompositionPrompt } = useSemanticPrompt();

  const handleGenerateClick = async () => {
    // Get canvas elements
    const elements = excalidrawAPI.getSceneElements();

    // Generate semantic prompt
    const output = await generateCompositionPrompt({
      userDescription: "Natural product placement in scene",
      canvasElements: elements,
      environmentImage: getEnvironmentImage(),
      productImages: getProductImages(),
      model: selectedModel,
      quality: selectedQuality,
      aspectRatio: selectedAspectRatio,
    });

    if (output) {
      setShowPromptPreview(true);
    }
  };

  return (
    <>
      {/* Existing canvas UI */}

      <PromptPreviewDialog
        isOpen={showPromptPreview}
        promptOutput={promptOutput}
        onGenerate={(finalPrompt) => {
          // Call generation API with final prompt
          generateImageWithPrompt(finalPrompt);
          setShowPromptPreview(false);
        }}
        onClose={() => setShowPromptPreview(false)}
      />
    </>
  );
}
```

### Step 4: Add Product Metadata Editing

```typescript
// Add to floating image actions menu
<button
  onClick={() => {
    setCurrentProduct(selectedProduct);
    setShowMetadataDialog(true);
  }}
  className="..."
>
  Edit Metadata
</button>

<ProductMetadataDialog
  isOpen={showMetadataDialog}
  metadata={currentProduct?.productMetadata}
  onSave={(metadata) => {
    updateImageMetadata(currentProduct.id, {
      ...currentProduct,
      productMetadata: metadata
    });
  }}
  onClose={() => setShowMetadataDialog(false)}
  onClassify={classifyText}
/>
```

## Preset System

### Lighting Presets

Available presets defined in `/types/semanticPrompt.ts`:

```typescript
import { LIGHTING_PRESETS, getLightingPreset } from "@/types/semanticPrompt";

// Available: natural_daylight, golden_hour, studio_lighting,
// dramatic_contrast, soft_diffused, rim_lighting

const preset = getLightingPreset("golden_hour");
// {
//   id: "golden_hour",
//   name: "Golden Hour",
//   prompt: "golden hour lighting, warm sunset tones...",
//   keywords: ["golden hour", "sunset", "warm"]
// }
```

### Style Presets

```typescript
import { STYLE_PRESETS, getStylePreset } from "@/types/semanticPrompt";

// Available: photorealistic, commercial_product, lifestyle,
// architectural, minimalist, cinematic

const preset = getStylePreset("lifestyle");
// {
//   id: "lifestyle",
//   name: "Lifestyle",
//   category: "commercial",
//   prompt: "lifestyle photography, natural setting...",
//   keywords: ["lifestyle", "natural", "authentic"]
// }
```

## Template System

### Built-in Templates

1. **Product Composition** (default)
   - For compositing products into environments
   - Variables: scene, placement, lighting, style, atmosphere, technical specs

2. **Environment Generation**
   - For creating new environments
   - Variables: scene, environment details, lighting, atmosphere, color palette

3. **Image Improvement**
   - For iterating on existing images
   - Variables: modifications, enhancements, lighting adjustments

### Custom Templates

Create custom templates:

```typescript
const customTemplate: PromptTemplate = {
  id: "custom_architectural",
  name: "Architectural Product Shot",
  description: "Products in architectural contexts",
  category: "custom",
  template: `Create an architectural product visualization:

Scene: {scene_description}
Product: {product_style}
Lighting: {lighting_style}
Technical: {technical_specs}

Focus on geometric composition and clean lines.`,
  variables: ["scene_description", "product_style", "lighting_style", "technical_specs"],
  defaults: {
    technical_specs: "High contrast, sharp focus, architectural photography"
  }
};
```

## Example Workflows

### Example 1: Basic Product Composition

```typescript
const { generateCompositionPrompt } = useSemanticPrompt();

// User places product image and draws arrow pointing to placement
const output = await generateCompositionPrompt({
  userDescription: "Modern living room, place sofa against the wall",
  canvasElements: excalidrawElements, // Includes arrow annotation
  environmentImage: livingRoomImage,
  productImages: [sofaImage],
  lightingPresetId: "natural_daylight",
  stylePresetId: "photorealistic"
});

// Output:
// {
//   enhancedPrompt: "Composite the product into this environment scene...
//     Scene: Modern living room, place sofa against the wall. Setting: living room
//     Product Placement: Placement arrow points_to product. Position on the floor...
//     Lighting: natural daylight streaming through windows, soft ambient lighting...
//     Style & Atmosphere: photorealistic, high-resolution...
//   ",
//   confidence: 0.85,
//   suggestions: ["Consider selecting a lighting preset..."]
// }
```

### Example 2: Product with Rich Metadata

```typescript
// First, add metadata to product
const sofaMetadata: ProductMetadata = {
  category: "furniture",
  subcategory: "sofa",
  materials: ["leather", "wood"],
  colors: ["navy blue", "walnut brown"],
  style: "modern",
  features: ["3-seater", "tufted back", "removable cushions"]
};

// Update product
updateImageMetadata(productId, { productMetadata: sofaMetadata });

// Generate with metadata
const output = await generateCompositionPrompt({
  userDescription: "Elegant living room",
  productImages: [{ ...sofaImage, productMetadata: sofaMetadata }],
  environmentImage: elegantRoomImage,
  stylePresetId: "commercial_product"
});

// The enhanced prompt will include:
// - Materials: "leather and wood materials with proper textures"
// - Colors: "navy blue leather with walnut brown wood accents"
// - Style: "modern aesthetic integrated into the scene"
```

### Example 3: Multi-Product Scene

```typescript
const lamp: EnhancedImageMetadata = {
  // ... image data
  productMetadata: {
    category: "lighting",
    style: "modern",
    materials: ["brass", "glass"]
  }
};

const chair: EnhancedImageMetadata = {
  // ... image data
  productMetadata: {
    category: "furniture",
    subcategory: "armchair",
    style: "modern"
  }
};

const output = await generateCompositionPrompt({
  userDescription: "Reading corner with coordinated furniture",
  productImages: [lamp, chair],
  environmentImage: cornerImage,
  lightingPresetId: "soft_diffused",
  stylePresetId: "lifestyle"
});

// Prompt will coordinate both products:
// "Composite multiple products into scene with cohesive styling..."
```

### Example 4: Canvas Annotations

```typescript
// User draws on canvas:
// 1. Arrow pointing to left side: "place here"
// 2. Text annotation: "centered, 2m from wall"
// 3. Circle around window area

const output = await generateCompositionPrompt({
  userDescription: "Position product according to annotations",
  canvasElements: [
    { type: "arrow", ... }, // → classified as placement_indicator
    { type: "text", text: "centered, 2m from wall" }, // → instruction
    { type: "ellipse", ... } // → emphasis on window
  ],
  environmentImage: roomImage,
  productImages: [furnitureImage]
});

// Prompt includes:
// "User instruction: 'centered, 2m from wall'"
// "Placement arrow points_to product"
// "Area of emphasis marked on image"
```

### Example 5: LLM Text Classification

```typescript
const { classifyText } = useSemanticPrompt();

// Classify product description
const result = await classifyText({
  text: "vintage brass floor lamp with adjustable arm and cream fabric shade",
  context: "product"
});

// Result:
// {
//   productMetadata: {
//     category: "lighting",
//     subcategory: "floor lamp",
//     materials: ["brass", "fabric"],
//     colors: ["cream"],
//     style: "vintage",
//     features: ["adjustable arm"]
//   },
//   refinedText: "A vintage-style brass floor lamp featuring an adjustable arm...",
//   confidence: { overall: 0.91, category: 0.96, style: 0.88 }
// }

// Auto-populate metadata dialog with extracted values
```

## Enhanced Prompt Examples

### Example Output 1: Living Room Sofa

**Input:**
- Description: "Cozy modern living room"
- Product: Navy leather sofa
- Lighting: Golden Hour
- Style: Lifestyle
- Annotation: Arrow pointing to center

**Output Prompt:**
```
Composite the product into this environment scene with the following specifications:

Scene: Cozy modern living room. Setting: living room. Ambiance: cozy

Product Placement: Placement arrow points_to product. Position on the floor or against
appropriate surfaces with realistic shadows.

Lighting: golden hour lighting, warm sunset tones, long soft shadows, glowing atmosphere

Style & Atmosphere: lifestyle photography, natural setting, lived-in feel, authentic atmosphere
Cozy, lifestyle

Composition: Maintain realistic perspective and scale. Ensure proper shadow and reflection
integration. Match lighting direction and color temperature.

Technical Requirements: High-resolution output, Sharp focus and detail, Professional-grade
output quality

Ensure the product integrates naturally into the scene with proper lighting, shadows,
reflections, and perspective matching.
```

**Confidence:** 85%

### Example Output 2: Studio Product Shot

**Input:**
- Description: "Clean white studio background"
- Product: Modern chrome lamp (category: lighting, materials: chrome, glass)
- Lighting: Studio Lighting
- Style: Commercial Product

**Output Prompt:**
```
Composite the product into this environment scene with the following specifications:

Scene: Clean white studio background. Setting: studio

Product Placement: Mount or place according to fixture type with realistic light emission.

Lighting: professional studio lighting, three-point light setup, even illumination, controlled shadows

Style & Atmosphere: commercial product photography, clean composition, marketing-ready,
professional presentation
photorealistic, professional quality

Composition: Maintain realistic perspective and scale. Ensure proper shadow and reflection
integration. Match lighting direction and color temperature. Clean, professional composition
suitable for marketing.

Technical Requirements: High-resolution output, Sharp focus and detail, Commercial photography
standards

Materials: chrome, glass

Ensure the product integrates naturally into the scene with proper lighting, shadows,
reflections, and perspective matching.
```

**Confidence:** 92%

### Example Output 3: Architectural Context

**Input:**
- Description: "Minimalist dining room with large windows"
- Product: Wooden dining table (materials: oak, steel)
- Style: Architectural
- Lighting: Natural Daylight
- Text annotation: "centered under pendant light"

**Output Prompt:**
```
Composite the product into this environment scene with the following specifications:

Scene: Minimalist dining room with large windows. Setting: dining room. Ambiance: minimalist

Product Placement: User instruction: "centered under pendant light"
Position on the floor or against appropriate surfaces with realistic shadows.

Lighting: natural daylight streaming through windows, soft ambient lighting, gentle shadows

Style & Atmosphere: architectural photography, geometric composition, clean lines,
perspective control
photorealistic, professional quality, minimalist aesthetic, clean composition, negative space

Composition: Maintain realistic perspective and scale. Ensure proper shadow and reflection
integration. Match lighting direction and color temperature. Creative composition with artistic intent.

Technical Requirements: High-resolution output, Sharp focus and detail, Professional-grade output quality

Materials: oak, steel

Ensure the product integrates naturally into the scene with proper lighting, shadows,
reflections, and perspective matching.
```

**Confidence:** 88%

## API Reference

### `buildSemanticPrompt(input: PromptBuilderInput): Promise<PromptBuilderOutput>`

Main function to build enhanced prompts.

**Parameters:**
- `input.userDescription` (required): User's text description
- `input.userIntent`: Type of operation (compose, improve, create_environment)
- `input.canvasElements`: Excalidraw elements for annotation parsing
- `input.environmentImage`: Environment image metadata
- `input.productImages`: Array of product image metadata
- `input.lightingPreset`: Lighting preset object
- `input.stylePreset`: Style preset object
- `input.model`: AI model being used
- `input.quality`: Quality setting
- `input.aspectRatio`: Aspect ratio

**Returns:**
- `enhancedPrompt`: Final composed prompt
- `variables`: All variable values used
- `template`: Template that was used
- `confidence`: Confidence score (0-1)
- `suggestions`: Array of improvement suggestions
- `components`: Breakdown of prompt sections

### `extractSemanticAnnotations(elements, images)`

Parse Excalidraw elements into semantic annotations.

**Returns:**
- `annotations`: Array of classified annotations
- `relations`: Array of annotation-image relationships

### `classifyText(text, context, existingMetadata)`

Use LLM to extract structured metadata from text.

**Parameters:**
- `text`: User's description text
- `context`: Type of classification (product, environment, instruction)
- `existingMetadata`: Pre-existing metadata to merge with

**Returns:** Classification response with extracted metadata

## Testing

Example test cases:

```typescript
// tests/semanticPromptBuilder.test.ts
import { buildSemanticPrompt } from "@/lib/semanticPromptBuilder";

describe("Semantic Prompt Builder", () => {
  it("should build basic composition prompt", async () => {
    const output = await buildSemanticPrompt({
      userDescription: "Modern living room",
      userIntent: "compose",
      environmentImage: mockEnvironment,
      productImages: [mockProduct],
    });

    expect(output.enhancedPrompt).toContain("Modern living room");
    expect(output.confidence).toBeGreaterThan(0.5);
  });

  it("should use product metadata in prompt", async () => {
    const productWithMetadata = {
      ...mockProduct,
      productMetadata: {
        category: "furniture",
        materials: ["leather"],
        colors: ["blue"]
      }
    };

    const output = await buildSemanticPrompt({
      userDescription: "Elegant room",
      userIntent: "compose",
      productImages: [productWithMetadata],
    });

    expect(output.enhancedPrompt).toContain("leather");
    expect(output.enhancedPrompt).toContain("blue");
  });
});
```

## Troubleshooting

### Low Confidence Scores

If confidence is below 0.6, check:
1. Is user description detailed enough? (min 20 characters recommended)
2. Are lighting/style presets selected?
3. Is product metadata filled in?
4. Are canvas annotations present?

### Annotations Not Detected

Ensure:
1. Canvas elements are passed to `buildSemanticPrompt`
2. Annotations are not inside frames (only images should be in frames)
3. Arrows are bound to images or near them
4. Text is clear and contains action words

### Classification Errors

If text classification fails:
1. Check API key is configured (`GEMINI_API_KEY`)
2. Ensure text is in English
3. Provide context parameter
4. Text should be descriptive (not just single words)

## Performance Considerations

- **Annotation parsing** is fast (< 50ms for typical canvases)
- **Prompt building** is synchronous and instant
- **LLM classification** takes 1-3 seconds (optional enhancement)
- **Use caching** for repeated prompts with same inputs

## Future Enhancements

Potential improvements:
1. Visual similarity analysis for better product matching
2. Multi-language support for classifications
3. Custom preset creation UI
4. Prompt history and favorites
5. A/B testing different prompt strategies
6. Integration with product catalogs/databases

## Support

For issues or questions:
1. Check this guide first
2. Review example code in `/examples`
3. Check TypeScript types for API contracts
4. Test with simplified inputs to isolate issues

---

**Version:** 1.0.0
**Last Updated:** January 2026
