import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

// Helper function to extract base64 data from data URL
function extractBase64Data(dataUrl: string): { mimeType: string; data: string } {
  const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!matches) {
    throw new Error("Invalid data URL format");
  }
  return {
    mimeType: matches[1],
    data: matches[2],
  };
}

export async function POST(request: NextRequest) {
  try {
    const { sketchImage, environmentImage, productImages, prompt, isFirstIteration, model, quality, aspectRatio } = await request.json();

    if (!sketchImage || !environmentImage || !prompt) {
      return NextResponse.json(
        {
          status: "error",
          message: "Missing required parameters (sketchImage, environmentImage, or prompt)",
        },
        { status: 400 }
      );
    }

    // Check for API key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          status: "error",
          message: "GEMINI_API_KEY not configured",
        },
        { status: 500 }
      );
    }

    // Initialize the Gemini API client
    const ai = new GoogleGenAI({ apiKey });
    const modelToUse = model || "gemini-2.5-flash-image";

    // Extract base64 data from all images
    const sketchData = extractBase64Data(sketchImage);
    const environmentData = extractBase64Data(environmentImage);

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

    // Build the contents array - new API format
    const contents: any[] = [];

    // Add system instruction as first message
    contents.push({
      text: "You must output a SINGLE FINAL IMAGE ONLY. Never create collages, side-by-side comparisons, or multi-panel outputs. Always remove all annotations (arrows, circles, text) from the final result.",
    });

    // Add sketch image first (for composition guidance)
    contents.push({
      inlineData: {
        mimeType: sketchData.mimeType,
        data: sketchData.data,
      },
    });

    // Add high-res environment image (for final quality)
    contents.push({
      inlineData: {
        mimeType: environmentData.mimeType,
        data: environmentData.data,
      },
    });

    // If first iteration, include ALL product images
    if (hasProductImages) {
      productImages.forEach((productImage: string) => {
        const productImageData = extractBase64Data(productImage);
        contents.push({
          inlineData: {
            mimeType: productImageData.mimeType,
            data: productImageData.data,
          },
        });
      });
    }

    // Add the text prompt last
    contents.push({ text: contentPrompt });

    // Build config with image settings
    const config: any = {
      responseModalities: ["Image"],
    };

    // Add image_config if quality or aspectRatio is provided
    if (quality || aspectRatio) {
      config.imageConfig = {};
      if (quality) {
        config.imageConfig.imageSize = quality;
      }
      if (aspectRatio) {
        config.imageConfig.aspectRatio = aspectRatio;
      }
    }

    // Generate the image with new API structure
    const response = await ai.models.generateContent({
      model: modelToUse,
      contents,
      config,
    });

    // Extract the generated image
    if (!response.candidates || response.candidates.length === 0) {
      throw new Error("No image generated from API");
    }

    const candidate = response.candidates[0];

    // Check for errors
    if (
      (candidate.finishReason as string) === "IMAGE_OTHER" ||
      !candidate.content ||
      !candidate.content.parts
    ) {
      const errorMessage = (candidate as any).finishMessage || "Could not generate image";
      return NextResponse.json(
        {
          status: "error",
          message: errorMessage,
        },
        { status: 400 }
      );
    }

    // Find the image in the response
    let generatedImageData: string | null = null;
    for (const part of candidate.content.parts) {
      if (part.inlineData) {
        generatedImageData = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        break;
      }
    }

    if (!generatedImageData) {
      throw new Error("No image data in response");
    }

    return NextResponse.json(
      {
        status: "success",
        generatedImage: generatedImageData,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in iteration:", error);
    return NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
