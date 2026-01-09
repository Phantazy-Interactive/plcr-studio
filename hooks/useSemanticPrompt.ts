/**
 * Hook for semantic prompt generation
 * Integrates with existing generation workflow
 */

import { useState, useCallback } from "react";
import { ExcalidrawElement } from "@excalidraw/excalidraw/types/element/types";
import type { EnhancedImageMetadata, PromptBuilderInput, PromptBuilderOutput } from "@/types/semanticPrompt";
import { buildSemanticPrompt } from "@/lib/semanticPromptBuilder";

interface UseSemanticPromptOptions {
  onPromptGenerated?: (output: PromptBuilderOutput) => void;
}

export function useSemanticPrompt(options?: UseSemanticPromptOptions) {
  const [promptOutput, setPromptOutput] = useState<PromptBuilderOutput | null>(null);
  const [isBuilding, setIsBuilding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Generate semantic prompt from UI state
   */
  const generatePrompt = useCallback(
    async (input: PromptBuilderInput): Promise<PromptBuilderOutput | null> => {
      setIsBuilding(true);
      setError(null);

      try {
        const output = await buildSemanticPrompt(input);
        setPromptOutput(output);
        options?.onPromptGenerated?.(output);
        return output;
      } catch (err: any) {
        const errorMessage = err.message || "Failed to generate prompt";
        setError(errorMessage);
        console.error("Semantic prompt generation error:", err);
        return null;
      } finally {
        setIsBuilding(false);
      }
    },
    [options]
  );

  /**
   * Generate prompt for product composition
   */
  const generateCompositionPrompt = useCallback(
    async (params: {
      userDescription: string;
      canvasElements?: ExcalidrawElement[];
      environmentImage?: EnhancedImageMetadata;
      productImages?: EnhancedImageMetadata[];
      lightingPresetId?: string;
      stylePresetId?: string;
      model?: string;
      quality?: string;
      aspectRatio?: string;
    }): Promise<PromptBuilderOutput | null> => {
      const input: PromptBuilderInput = {
        userDescription: params.userDescription,
        userIntent: "compose",
        canvasElements: params.canvasElements,
        environmentImage: params.environmentImage,
        productImages: params.productImages,
        model: params.model,
        quality: params.quality,
        aspectRatio: params.aspectRatio,
      };

      // Add presets if provided
      if (params.lightingPresetId) {
        const { getLightingPreset } = await import("@/lib/semanticPromptBuilder");
        const preset = getLightingPreset(params.lightingPresetId);
        if (preset) {
          input.lightingPreset = preset;
        }
      }

      if (params.stylePresetId) {
        const { getStylePreset } = await import("@/lib/semanticPromptBuilder");
        const preset = getStylePreset(params.stylePresetId);
        if (preset) {
          input.stylePreset = preset;
        }
      }

      return generatePrompt(input);
    },
    [generatePrompt]
  );

  /**
   * Generate prompt for environment creation
   */
  const generateEnvironmentPrompt = useCallback(
    async (params: {
      userDescription: string;
      lightingPresetId?: string;
      stylePresetId?: string;
      model?: string;
      quality?: string;
      aspectRatio?: string;
    }): Promise<PromptBuilderOutput | null> => {
      const input: PromptBuilderInput = {
        userDescription: params.userDescription,
        userIntent: "create_environment",
        model: params.model,
        quality: params.quality,
        aspectRatio: params.aspectRatio,
      };

      // Add presets if provided
      if (params.lightingPresetId) {
        const { getLightingPreset } = await import("@/lib/semanticPromptBuilder");
        const preset = getLightingPreset(params.lightingPresetId);
        if (preset) {
          input.lightingPreset = preset;
        }
      }

      if (params.stylePresetId) {
        const { getStylePreset } = await import("@/lib/semanticPromptBuilder");
        const preset = getStylePreset(params.stylePresetId);
        if (preset) {
          input.stylePreset = preset;
        }
      }

      return generatePrompt(input);
    },
    [generatePrompt]
  );

  /**
   * Generate prompt for image improvement
   */
  const generateImprovementPrompt = useCallback(
    async (params: {
      userDescription: string;
      targetImage: EnhancedImageMetadata;
      model?: string;
      quality?: string;
    }): Promise<PromptBuilderOutput | null> => {
      const input: PromptBuilderInput = {
        userDescription: params.userDescription,
        userIntent: "improve",
        targetImage: params.targetImage,
        model: params.model,
        quality: params.quality,
      };

      return generatePrompt(input);
    },
    [generatePrompt]
  );

  /**
   * Classify user text using LLM
   */
  const classifyText = useCallback(
    async (params: {
      text: string;
      context?: "product" | "environment" | "instruction" | "style";
      existingMetadata?: any;
    }) => {
      try {
        const response = await fetch("/api/classify-text", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(params),
        });

        const data = await response.json();

        if (data.status === "success") {
          return data.classification;
        } else {
          throw new Error(data.message || "Classification failed");
        }
      } catch (err: any) {
        console.error("Text classification error:", err);
        return null;
      }
    },
    []
  );

  /**
   * Reset state
   */
  const reset = useCallback(() => {
    setPromptOutput(null);
    setError(null);
    setIsBuilding(false);
  }, []);

  return {
    // State
    promptOutput,
    isBuilding,
    error,

    // Methods
    generatePrompt,
    generateCompositionPrompt,
    generateEnvironmentPrompt,
    generateImprovementPrompt,
    classifyText,
    reset,
  };
}
