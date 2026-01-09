import { NextRequest, NextResponse } from "next/server";
import { executeWithFallback } from "@/lib/ai-providers";
import type { AIProviderType, ImageQuality, AspectRatio } from "@/lib/ai-providers/types";

export async function POST(request: NextRequest) {
  try {
    const { image, prompt, provider, model, quality, aspectRatio } = await request.json();

    if (!image || !prompt) {
      return NextResponse.json(
        {
          status: "error",
          message: "Missing required parameters (image or prompt)",
        },
        { status: 400 }
      );
    }

    // Validate provider if specified
    const providerType = provider as AIProviderType | undefined;

    // Build the refinement prompt
    const refinementPrompt = `You are an expert image editor. Modify the provided image according to the user's instructions. Maintain the overall composition and only change what is specifically requested. Output a single modified image.

Please modify this image according to the following instructions:

${prompt}`;

    // Refine the image using the provider abstraction
    const imageResponse = await executeWithFallback(
      providerType,
      async (aiProvider) => {
        return await aiProvider.refineImage({
          prompt: refinementPrompt,
          sourceImage: image,
          config: {
            model,
            quality: quality as ImageQuality,
            aspectRatio: aspectRatio as AspectRatio,
          },
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
    console.error("Error in iterate image:", error);

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
