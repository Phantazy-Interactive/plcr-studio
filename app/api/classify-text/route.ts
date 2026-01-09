/**
 * LLM-based text classification API
 * Refines user text into structured attributes for products and environments
 */

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import type {
  TextClassificationRequest,
  TextClassificationResponse,
} from "@/types/semanticPrompt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body: TextClassificationRequest = await request.json();
    const { text, context, existingMetadata } = body;

    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { status: "error", message: "Text is required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { status: "error", message: "API key not configured" },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    // Build classification prompt based on context
    const classificationPrompt = buildClassificationPrompt(text, context, existingMetadata);

    // Use fast text model for classification
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-exp",
      contents: [{ text: classificationPrompt }],
      config: {
        temperature: 0.3, // Lower temperature for more consistent extraction
        maxOutputTokens: 1024,
      },
    });

    const responseText = response.text;

    // Parse JSON response
    let classification: TextClassificationResponse;
    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = responseText.match(/```json\n?([\s\S]*?)\n?```/) ||
                       responseText.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : responseText;
      classification = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("Failed to parse classification response:", responseText);
      return NextResponse.json(
        {
          status: "error",
          message: "Failed to parse classification response",
          rawResponse: responseText,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      status: "success",
      classification,
    });
  } catch (error: any) {
    console.error("Classification error:", error);
    return NextResponse.json(
      {
        status: "error",
        message: error.message || "Classification failed",
      },
      { status: 500 }
    );
  }
}

/**
 * Build classification prompt based on context
 */
function buildClassificationPrompt(
  text: string,
  context?: TextClassificationRequest['context'],
  existingMetadata?: TextClassificationRequest['existingMetadata']
): string {
  const basePrompt = `You are an expert at extracting structured information from natural language descriptions.

User's text: "${text}"

${context ? `Context: This text describes a ${context}.` : ''}

${existingMetadata ? `Existing metadata: ${JSON.stringify(existingMetadata)}` : ''}

Extract structured information and return a JSON object with the following structure:`;

  if (context === 'product') {
    return basePrompt + `

{
  "productMetadata": {
    "category": "main category (e.g., furniture, electronics, decor, lighting, textiles)",
    "subcategory": "specific type (e.g., sofa, laptop, vase)",
    "materials": ["array", "of", "materials"],
    "colors": ["array", "of", "colors"],
    "style": "design style (e.g., modern, vintage, minimalist, industrial)",
    "features": ["notable", "features"],
    "tags": ["relevant", "tags"]
  },
  "refinedText": "A refined, detailed description of the product",
  "confidence": {
    "overall": 0.0-1.0,
    "category": 0.0-1.0,
    "style": 0.0-1.0,
    "materials": 0.0-1.0
  },
  "entities": [
    {
      "type": "color|material|style|object",
      "value": "extracted value",
      "confidence": 0.0-1.0
    }
  ]
}

Guidelines:
- Extract all color names mentioned
- Identify materials (wood, metal, fabric, glass, leather, etc.)
- Determine the design style
- List key features that make the product unique
- Provide confidence scores based on how explicit the information is
- refined text should be a clear, detailed description suitable for image generation`;
  }

  if (context === 'environment') {
    return basePrompt + `

{
  "environmentContext": {
    "type": "environment type (e.g., living room, bedroom, office, outdoor, studio)",
    "lighting": "lighting description",
    "ambiance": "mood/feeling (e.g., cozy, professional, dramatic, peaceful)",
    "timeOfDay": "morning|afternoon|evening|night|golden hour",
    "weather": "sunny|cloudy|rainy|stormy (if outdoor)"
  },
  "refinedText": "A refined, detailed description of the environment",
  "confidence": {
    "overall": 0.0-1.0
  },
  "entities": [
    {
      "type": "location|lighting|mood",
      "value": "extracted value",
      "confidence": 0.0-1.0
    }
  ]
}

Guidelines:
- Identify the type of space or location
- Extract lighting conditions and time of day
- Determine the mood and atmosphere
- For outdoor scenes, note weather conditions
- Refined text should create a vivid mental image`;
  }

  if (context === 'instruction') {
    return basePrompt + `

{
  "refinedText": "Clear, actionable instruction for image generation",
  "confidence": {
    "overall": 0.0-1.0
  },
  "entities": [
    {
      "type": "object|location|constraint",
      "value": "extracted value",
      "confidence": 0.0-1.0
    }
  ]
}

Guidelines:
- Convert casual instructions into clear directives
- Extract spatial relationships (left, right, center, foreground, background)
- Identify constraints (don't, avoid, must not)
- Note specific placement requirements
- Refined text should be unambiguous and actionable`;
  }

  // Default: general classification
  return basePrompt + `

{
  "refinedText": "Enhanced version of the input text with more detail and clarity",
  "confidence": {
    "overall": 0.0-1.0
  },
  "entities": [
    {
      "type": "color|material|style|location|object|lighting|mood",
      "value": "extracted value",
      "confidence": 0.0-1.0
    }
  ]
}

Guidelines:
- Extract any relevant entities (colors, materials, objects, locations, moods)
- Enhance the text with additional detail while preserving intent
- Provide confidence scores
- Refined text should be clear and detailed`;
}
