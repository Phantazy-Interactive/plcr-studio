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

    // Generate the asset image
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
      const errorMessage = (candidate as any).finishMessage || "Could not generate asset image";
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
    console.error("Error generating asset:", error);
    return NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
