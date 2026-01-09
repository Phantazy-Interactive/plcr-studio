import { NextRequest, NextResponse } from "next/server";
import { executeWithFallback } from "@/lib/ai-providers";
import type { AIProviderType, ImageQuality, AspectRatio } from "@/lib/ai-providers/types";

export async function POST(request: NextRequest) {
  try {
    const { prompt, provider, model, quality, aspectRatio } = await request.json();

    if (!prompt) {
      return NextResponse.json(
        {
          status: "error",
          message: "Missing prompt",
        },
        { status: 400 }
      );
    }

    // Validate provider if specified
    const providerType = provider as AIProviderType | undefined;

    // Step 1: Use AI to enhance the prompt for photorealism
    const promptEnhancementRequest = `You are an expert product photographer and prompt engineer specializing in creating ultra-realistic, photorealistic image generation prompts for objects, products, and assets.

The user wants to generate an asset/object/product image and provided this basic description:
"${prompt}"

Transform this into a highly detailed, photorealistic prompt following these guidelines:

1. **Subject & Details**: Expand the description with specific details about the object, product, or asset
2. **Lighting**: Describe the lighting in detail (studio lighting, product photography lighting, soft natural light, specific light sources, etc.)
3. **Camera/Lens Details**: Include photography terms like focal length (e.g., "85mm portrait lens", "50mm macro", "100mm"), depth of field, bokeh effects
4. **Textures & Materials**: Describe surfaces, materials, and textures in detail (metal finish, fabric texture, glass reflections, etc.)
5. **Background**: Specify background type (transparent, white, neutral, or specific setting if appropriate)
6. **Angle & Perspective**: Mention viewing angle (front view, side view, 3/4 view, top-down, etc.)
7. **Color Palette**: If relevant, describe the color scheme and accuracy
8. **Quality**: Emphasize high resolution, sharp detail, and maximum quality

Important:
- Start with "A photorealistic, high-resolution" or similar
- Be extremely descriptive and specific
- Use professional product photography terminology
- Focus on realism and accurate representation
- Keep the core intent of the user's original prompt
- Output ONLY the enhanced prompt, no explanations

Example of a good photorealistic asset prompt:
"A photorealistic, high-resolution image of a sleek red sports car in side view. The car features glossy metallic red paint with sharp reflections, chrome accents, and detailed alloy wheels. The lighting is professional studio setup with key light from the left creating subtle highlights on the curved body panels, and fill light softening shadows. Clean white background. Captured with a 50mm lens at f/8 for sharp detail throughout. Ultra-sharp details showing every curve, panel gap, and reflection. Professional product photography quality."

Now create an enhanced photorealistic prompt based on the user's description:`;

    let enhancedPrompt = prompt;

    try {
      const textResponse = await executeWithFallback(
        providerType,
        async (aiProvider) => {
          return await aiProvider.generateText({
            prompt: promptEnhancementRequest,
          });
        }
      );

      enhancedPrompt = textResponse.text.trim() || prompt;
    } catch (error) {
      console.warn("Failed to enhance prompt, using original:", error);
      // Continue with original prompt if enhancement fails
    }

    // Step 2: Generate the image using the enhanced prompt
    const imageResponse = await executeWithFallback(
      providerType,
      async (aiProvider) => {
        return await aiProvider.generateEnvironment({
          prompt: enhancedPrompt,
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
        imageUrl: imageResponse.imageData,
        enhancedPrompt, // Return the enhanced prompt so user can see it
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error generating asset:", error);

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
