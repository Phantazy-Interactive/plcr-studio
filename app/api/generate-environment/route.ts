import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export async function POST(request: NextRequest) {
  try {
    const { prompt, model, quality, aspectRatio } = await request.json();

    if (!prompt) {
      return NextResponse.json(
        {
          status: "error",
          message: "Missing prompt",
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

    // Step 1: Use Gemini text model to enhance the prompt for photorealism
    const ai = new GoogleGenAI({ apiKey });

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

    const enhancementResponse = await ai.models.generateContent({
      model: "gemini-2.0-flash-exp",
      contents: [{ text: promptEnhancementRequest }],
    });

    const enhancedPrompt = enhancementResponse.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || prompt;

    // Step 2: Generate the image using the enhanced prompt
    const modelToUse = model || "gemini-2.5-flash-image";

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

    // Generate the environment image
    const response = await ai.models.generateContent({
      model: modelToUse,
      contents: [{ text: enhancedPrompt }],
      config,
    });

    // Extract the generated image
    if (!response.candidates || response.candidates.length === 0) {
      throw new Error("No image generated from API");
    }

    const candidate = response.candidates[0];

    // Check for errors
    if ((candidate.finishReason as string) === "IMAGE_OTHER" || !candidate.content || !candidate.content.parts) {
      const errorMessage = (candidate as any).finishMessage || "Could not generate environment image";
      return NextResponse.json(
        {
          status: "error",
          message: errorMessage,
        },
        { status: 400 }
      );
    }

    // Find the image in the response
    let imageData: string | null = null;
    for (const part of candidate.content.parts) {
      if (part.inlineData) {
        imageData = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        break;
      }
    }

    if (!imageData) {
      throw new Error("No image data in response");
    }

    return NextResponse.json(
      {
        status: "success",
        imageUrl: imageData,
        enhancedPrompt, // Return the enhanced prompt so user can see it
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error generating environment:", error);
    return NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
