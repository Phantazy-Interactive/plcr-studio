/**
 * Example: Complete Integration of Semantic Prompt Assistant
 *
 * This file demonstrates how to integrate the semantic prompt assistant
 * into your component. Copy and adapt this code for your use case.
 */

"use client";

import React, { useState } from "react";
import { useSemanticPrompt } from "@/hooks/useSemanticPrompt";
import PromptPreviewDialog from "@/components/PromptPreviewDialog";
import ProductMetadataDialog from "@/components/ProductMetadataDialog";
import { LIGHTING_PRESETS, STYLE_PRESETS } from "@/types/semanticPrompt";
import type { EnhancedImageMetadata, ProductMetadata } from "@/types/semanticPrompt";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/types/element/types";

/**
 * Example 1: Basic Integration in Canvas Component
 */
export function BasicSemanticPromptExample() {
  const [showPromptPreview, setShowPromptPreview] = useState(false);
  const [userDescription, setUserDescription] = useState("");

  const {
    promptOutput,
    isBuilding,
    error,
    generateCompositionPrompt,
  } = useSemanticPrompt();

  // Mock data - replace with your actual data
  const environmentImage: EnhancedImageMetadata = {
    id: "env-1",
    type: "environment",
    dataUrl: "data:image/png;base64,...",
    highResDataUrl: "data:image/png;base64,...",
    excalidrawFileId: "file-1",
    excalidrawElementId: "elem-1",
    addedAt: Date.now(),
    width: 800,
    height: 600,
    isLocked: true,
  };

  const productImage: EnhancedImageMetadata = {
    id: "prod-1",
    type: "product",
    dataUrl: "data:image/png;base64,...",
    highResDataUrl: "data:image/png;base64,...",
    excalidrawFileId: "file-2",
    excalidrawElementId: "elem-2",
    addedAt: Date.now(),
    width: 400,
    height: 400,
    isLocked: false,
    productMetadata: {
      category: "furniture",
      subcategory: "sofa",
      materials: ["leather", "wood"],
      colors: ["navy blue"],
      style: "modern",
    },
  };

  const handleGeneratePrompt = async () => {
    // Get canvas elements (from Excalidraw API in real implementation)
    const canvasElements: ExcalidrawElement[] = []; // excalidrawAPI.getSceneElements()

    const output = await generateCompositionPrompt({
      userDescription: userDescription || "Natural product placement",
      canvasElements,
      environmentImage,
      productImages: [productImage],
      lightingPresetId: "natural_daylight",
      stylePresetId: "photorealistic",
      model: "gemini-2.5-flash-image",
    });

    if (output) {
      setShowPromptPreview(true);
    }
  };

  const handleGenerateImage = async (finalPrompt: string) => {
    console.log("Generating with prompt:", finalPrompt);

    // Call your generation API here
    const response = await fetch("/api/generate-combination", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sketchImage: "...",
        environmentImage: environmentImage.highResDataUrl,
        productImages: [productImage.highResDataUrl],
        prompt: finalPrompt,
        model: "gemini-2.5-flash-image",
      }),
    });

    const data = await response.json();
    console.log("Generated image:", data.generatedImage);

    setShowPromptPreview(false);
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Semantic Prompt Example</h2>

      <div className="space-y-4 max-w-2xl">
        <div>
          <label className="block text-sm font-medium mb-2">
            Describe your scene:
          </label>
          <textarea
            value={userDescription}
            onChange={(e) => setUserDescription(e.target.value)}
            placeholder="e.g., Modern living room with natural light"
            className="w-full px-3 py-2 border rounded-md"
            rows={3}
          />
        </div>

        <button
          onClick={handleGeneratePrompt}
          disabled={isBuilding}
          className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
        >
          {isBuilding ? "Building Prompt..." : "Generate Enhanced Prompt"}
        </button>

        {error && (
          <div className="p-3 bg-red-50 text-red-800 rounded-md">
            Error: {error}
          </div>
        )}
      </div>

      <PromptPreviewDialog
        isOpen={showPromptPreview}
        promptOutput={promptOutput}
        onGenerate={handleGenerateImage}
        onClose={() => setShowPromptPreview(false)}
      />
    </div>
  );
}

/**
 * Example 2: Product Metadata Integration
 */
export function ProductMetadataExample() {
  const [showMetadataDialog, setShowMetadataDialog] = useState(false);
  const [currentMetadata, setCurrentMetadata] = useState<ProductMetadata>();
  const { classifyText } = useSemanticPrompt();

  const handleSaveMetadata = (metadata: ProductMetadata) => {
    console.log("Saving metadata:", metadata);
    setCurrentMetadata(metadata);

    // In real app, update your image metadata store here
    // updateImageMetadata(productId, { productMetadata: metadata });
  };

  const handleClassify = async (text: string) => {
    const result = await classifyText({
      text,
      context: "product",
      existingMetadata: currentMetadata,
    });
    return result;
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Product Metadata Example</h2>

      <button
        onClick={() => setShowMetadataDialog(true)}
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
      >
        Edit Product Metadata
      </button>

      {currentMetadata && (
        <div className="mt-4 p-4 bg-gray-50 rounded-md">
          <h3 className="font-semibold mb-2">Current Metadata:</h3>
          <pre className="text-sm">{JSON.stringify(currentMetadata, null, 2)}</pre>
        </div>
      )}

      <ProductMetadataDialog
        isOpen={showMetadataDialog}
        metadata={currentMetadata}
        onSave={handleSaveMetadata}
        onClose={() => setShowMetadataDialog(false)}
        onClassify={handleClassify}
      />
    </div>
  );
}

/**
 * Example 3: Using Presets
 */
export function PresetsExample() {
  const [selectedLighting, setSelectedLighting] = useState(LIGHTING_PRESETS[0].id);
  const [selectedStyle, setSelectedStyle] = useState(STYLE_PRESETS[0].id);
  const { generateCompositionPrompt } = useSemanticPrompt();

  const handleGenerate = async () => {
    const output = await generateCompositionPrompt({
      userDescription: "Beautiful product showcase",
      lightingPresetId: selectedLighting,
      stylePresetId: selectedStyle,
      environmentImage: {} as any, // Your environment image
      productImages: [{}] as any, // Your product images
    });

    console.log("Enhanced prompt:", output?.enhancedPrompt);
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Presets Example</h2>

      <div className="space-y-4 max-w-md">
        <div>
          <label className="block text-sm font-medium mb-2">
            Lighting Preset:
          </label>
          <select
            value={selectedLighting}
            onChange={(e) => setSelectedLighting(e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
          >
            {LIGHTING_PRESETS.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.name} - {preset.description}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Style Preset:
          </label>
          <select
            value={selectedStyle}
            onChange={(e) => setSelectedStyle(e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
          >
            {STYLE_PRESETS.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.name} - {preset.description}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handleGenerate}
          className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
        >
          Generate with Presets
        </button>
      </div>
    </div>
  );
}

/**
 * Example 4: Environment Generation
 */
export function EnvironmentGenerationExample() {
  const [description, setDescription] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const { promptOutput, generateEnvironmentPrompt } = useSemanticPrompt();

  const handleGenerate = async () => {
    const output = await generateEnvironmentPrompt({
      userDescription: description,
      lightingPresetId: "natural_daylight",
      stylePresetId: "photorealistic",
      model: "gemini-2.5-flash-image",
      quality: "1K",
      aspectRatio: "16:9",
    });

    if (output) {
      setShowPreview(true);
    }
  };

  const handleCreateEnvironment = async (finalPrompt: string) => {
    // Call environment generation API
    const response = await fetch("/api/generate-environment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: finalPrompt,
        model: "gemini-2.5-flash-image",
        aspectRatio: "16:9",
      }),
    });

    const data = await response.json();
    console.log("Generated environment:", data.imageUrl);
    setShowPreview(false);
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Environment Generation Example</h2>

      <div className="space-y-4 max-w-2xl">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the environment you want to create..."
          className="w-full px-3 py-2 border rounded-md"
          rows={4}
        />

        <button
          onClick={handleGenerate}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
        >
          Create Environment
        </button>
      </div>

      <PromptPreviewDialog
        isOpen={showPreview}
        promptOutput={promptOutput}
        onGenerate={handleCreateEnvironment}
        onClose={() => setShowPreview(false)}
      />
    </div>
  );
}

/**
 * Example 5: Text Classification
 */
export function TextClassificationExample() {
  const [inputText, setInputText] = useState("");
  const [result, setResult] = useState<any>(null);
  const [isClassifying, setIsClassifying] = useState(false);
  const { classifyText } = useSemanticPrompt();

  const handleClassify = async (context: "product" | "environment") => {
    setIsClassifying(true);
    const classification = await classifyText({
      text: inputText,
      context,
    });
    setResult(classification);
    setIsClassifying(false);
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Text Classification Example</h2>

      <div className="space-y-4 max-w-2xl">
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="e.g., modern blue leather sofa with chrome legs"
          className="w-full px-3 py-2 border rounded-md"
          rows={3}
        />

        <div className="flex gap-2">
          <button
            onClick={() => handleClassify("product")}
            disabled={isClassifying || !inputText}
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
          >
            Classify as Product
          </button>

          <button
            onClick={() => handleClassify("environment")}
            disabled={isClassifying || !inputText}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            Classify as Environment
          </button>
        </div>

        {result && (
          <div className="p-4 bg-gray-50 rounded-md">
            <h3 className="font-semibold mb-2">Classification Result:</h3>
            <pre className="text-sm overflow-auto">{JSON.stringify(result, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Example 6: Complete Workflow
 */
export function CompleteWorkflowExample() {
  const [step, setStep] = useState<"metadata" | "prompt" | "generate">("metadata");
  const [productMetadata, setProductMetadata] = useState<ProductMetadata>();
  const [showPrompt, setShowPrompt] = useState(false);

  const { promptOutput, generateCompositionPrompt, classifyText } = useSemanticPrompt();

  // Step 1: Add product metadata
  const handleMetadataComplete = (metadata: ProductMetadata) => {
    setProductMetadata(metadata);
    setStep("prompt");
  };

  // Step 2: Generate semantic prompt
  const handleGeneratePrompt = async () => {
    const productImage: EnhancedImageMetadata = {
      id: "prod-1",
      type: "product",
      dataUrl: "...",
      highResDataUrl: "...",
      excalidrawFileId: "file-1",
      excalidrawElementId: "elem-1",
      addedAt: Date.now(),
      width: 400,
      height: 400,
      isLocked: false,
      productMetadata,
    };

    await generateCompositionPrompt({
      userDescription: "Showcase product in elegant setting",
      productImages: [productImage],
      environmentImage: {} as any, // Your environment
      lightingPresetId: "golden_hour",
      stylePresetId: "commercial_product",
    });

    setShowPrompt(true);
  };

  // Step 3: Generate image
  const handleGenerateImage = async (finalPrompt: string) => {
    console.log("Generating with:", finalPrompt);
    // Call your API here
    setShowPrompt(false);
    setStep("generate");
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Complete Workflow Example</h2>

      {/* Progress indicator */}
      <div className="flex items-center gap-2 mb-6">
        <div className={`px-3 py-1 rounded ${step === "metadata" ? "bg-purple-600 text-white" : "bg-gray-200"}`}>
          1. Metadata
        </div>
        <div className="flex-1 h-1 bg-gray-200" />
        <div className={`px-3 py-1 rounded ${step === "prompt" ? "bg-purple-600 text-white" : "bg-gray-200"}`}>
          2. Prompt
        </div>
        <div className="flex-1 h-1 bg-gray-200" />
        <div className={`px-3 py-1 rounded ${step === "generate" ? "bg-purple-600 text-white" : "bg-gray-200"}`}>
          3. Generate
        </div>
      </div>

      {/* Step content */}
      {step === "metadata" && (
        <div>
          <p className="mb-4">First, add metadata to your product:</p>
          <ProductMetadataDialog
            isOpen={true}
            metadata={productMetadata}
            onSave={handleMetadataComplete}
            onClose={() => {}}
            onClassify={(text) => classifyText({ text, context: "product" })}
          />
        </div>
      )}

      {step === "prompt" && (
        <div>
          <p className="mb-4">Now generate an enhanced prompt:</p>
          <button
            onClick={handleGeneratePrompt}
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
          >
            Generate Semantic Prompt
          </button>
        </div>
      )}

      {step === "generate" && (
        <div className="p-4 bg-green-50 rounded-md">
          <p className="text-green-800 font-medium">✓ Image generated successfully!</p>
        </div>
      )}

      <PromptPreviewDialog
        isOpen={showPrompt}
        promptOutput={promptOutput}
        onGenerate={handleGenerateImage}
        onClose={() => setShowPrompt(false)}
      />
    </div>
  );
}

/**
 * Demo Page Component - Shows all examples
 */
export default function SemanticPromptExamples() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Semantic Prompt Assistant - Examples</h1>

        <div className="space-y-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <BasicSemanticPromptExample />
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <ProductMetadataExample />
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <PresetsExample />
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <EnvironmentGenerationExample />
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <TextClassificationExample />
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <CompleteWorkflowExample />
          </div>
        </div>
      </div>
    </div>
  );
}
