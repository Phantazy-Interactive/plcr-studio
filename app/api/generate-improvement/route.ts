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
    const { image, prompt, model, quality, aspectRatio } = await request.json();

    if (!image || !prompt) {
      return NextResponse.json(
        {
          status: "error",
          message: "Missing required parameters (image or prompt)",
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

    // Extract base64 data from image
    const imageData = extractBase64Data(image);

    // Build the contents array
    const contents = [
      {
        text: "You are an expert image editor. Modify the provided image according to the user's instructions. Maintain the overall composition and only change what is specifically requested. Output a single modified image.",
      },
      {
        inlineData: {
          mimeType: imageData.mimeType,
          data: imageData.data,
        },
      },
      {
        text: `Please modify this image according to the following instructions:\n\n${prompt}`,
      },
    ];

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

    // Generate the modified image
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
    console.error("Error in iterate image:", error);
    return NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
