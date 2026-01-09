import { NextRequest, NextResponse } from "next/server";
import { executeWithFallback } from "@/lib/ai-providers";
import type { AIProviderType, ImageQuality, AspectRatio } from "@/lib/ai-providers/types";

export async function POST(request: NextRequest) {
  try {
    const { sketchImage, environmentImage, productImages, prompt, isFirstIteration, provider, model, quality, aspectRatio } = await request.json();

    if (!sketchImage || !environmentImage || !prompt) {
      return NextResponse.json(
        {
          status: "error",
          message: "Missing required parameters (sketchImage, environmentImage, or prompt)",
        },
        { status: 400 }
      );
    }

    // Validate provider if specified
    const providerType = provider as AIProviderType | undefined;

    // Handle product images array
    const hasProductImages = isFirstIteration && productImages && productImages.length > 0;
    const productCount = hasProductImages ? productImages.length : 0;

    // Build product image labels dynamically
    let productImageLabels = '';
    if (hasProductImages) {
      if (productCount === 1) {
        productImageLabels = 'Image C = Product to insert';
      } else {
        productImageLabels = productImages.map((_img: string, i: number) =>
          `Image ${String.fromCharCode(67 + i)} = Product reference (angle ${i + 1})`
        ).join('\n');
      }
    }

    // Build the content prompt with explicit image labeling
    const contentPrompt = `Image A = Sketch with annotations (arrows, circles, text showing placement)
Image B = Environment (BASE IMAGE - edit this one)
${productImageLabels}

TASK:
Edit Image B only by ${hasProductImages ? `compositing the product into the scene at the position indicated in Image A. ${productCount > 1 ? `You have ${productCount} reference images showing different angles of the same product - use them to understand the product's full appearance and choose the best angle/perspective for the composition.` : ''}` : 'modifying it according to Image A annotations'}.

CRITICAL RULES:
1. Use Image B as the BASE - edit only this image
2. ${hasProductImages ? 'Place the product EXACTLY where arrows point in Image A' : 'Follow arrows and annotations in Image A for modifications'}
3. Match perspective, scale, lighting, and shadows to Image B
4. Remove ALL annotations (arrows, circles, text, rectangles)
5. Output a SINGLE FINAL IMAGE ONLY — no collage, no side-by-side, do not include Image A${hasProductImages ? ' or the product reference images' : ''} as separate panels
6. Keep the EXACT resolution and aspect ratio of Image B (no crop, no resize)
7. Maintain photorealism and natural integration
${productCount > 1 ? '8. Use all product reference images to understand the complete product, but only composite ONE instance of the product into the scene' : ''}

User Instructions: ${prompt}`;

    // Generate the composite image using the provider abstraction
    const imageResponse = await executeWithFallback(
      providerType,
      async (aiProvider) => {
        return await aiProvider.composeProduct({
          prompt: contentPrompt,
          sketchImage,
          environmentImage,
          productImages: hasProductImages ? productImages : undefined,
          config: {
            model,
            quality: quality as ImageQuality,
            aspectRatio: aspectRatio as AspectRatio,
          },
          isFirstIteration,
        });
      }
    );

    return NextResponse.json(
      {
        status: "success",
        generatedImage: imageResponse.imageData,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in iteration:", error);

    // Check if all providers failed
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const isProviderError = errorMessage.includes("All providers failed") ||
                           errorMessage.includes("not configured");

    return NextResponse.json(
      {
        status: "error",
        message: errorMessage,
        suggestion: isProviderError
          ? "Please configure at least one AI provider (GEMINI_API_KEY, OPENAI_API_KEY, ANTHROPIC_API_KEY, or REPLICATE_API_TOKEN) in your environment variables."
          : undefined,
      },
      { status: isProviderError ? 503 : 500 }
    );
  }
}
