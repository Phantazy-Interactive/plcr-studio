import { NextRequest, NextResponse } from "next/server";
import { executeWithFallback, AIProviderFactory } from "@/lib/ai-providers";
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
    const promptEnhancementRequest = `You are an expert photographer and prompt engineer specializing in creating ultra-realistic, photorealistic image generation prompts.

The user wants to generate an environment/scene image and provided this basic description:
"${prompt}"

Transform this into a highly detailed, photorealistic prompt following these guidelines:

1. **Subject & Setting**: Expand the description with specific details about the scene, objects, and environment
2. **Lighting**: Describe the lighting in detail (golden hour, soft natural light, dramatic shadows, specific light sources, etc.)
3. **Camera/Lens Details**: Include photography terms like focal length (e.g., "85mm portrait lens", "24mm wide-angle", "50mm prime"), depth of field, bokeh effects
4. **Textures & Materials**: Describe surfaces, materials, and textures in detail
5. **Atmosphere & Mood**: Set the emotional tone and atmosphere
6. **Composition**: Mention composition elements (rule of thirds, leading lines, etc.) suited for widescreen format
7. **Color Palette**: If relevant, describe the color scheme
8. **Quality**: Emphasize high resolution, sharp detail, and maximum quality

Important:
- Start with "A photorealistic, high-resolution" or similar
- Be extremely descriptive and specific
- Use professional photography terminology
- Focus on realism, not artistic or stylized interpretations
- Keep the core intent of the user's original prompt
- Output ONLY the enhanced prompt, no explanations

Example of a good photorealistic prompt:
"A photorealistic, high-resolution image of an elderly Japanese ceramicist with deep, sun-etched wrinkles and a warm, knowing smile. He is carefully inspecting a freshly glazed tea bowl. The setting is his rustic, sun-drenched workshop with pottery wheels and shelves of clay pots in the background. The scene is illuminated by soft, golden hour light streaming through a window, highlighting the fine texture of the clay and the fabric of his apron. Captured with an 85mm portrait lens at f/2.8, resulting in a soft, blurred background (bokeh). The overall mood is serene and masterful. Ultra-sharp details, professional photography quality."

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
    console.error("Error generating environment:", error);

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
