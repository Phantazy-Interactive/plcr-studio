"use client";

import { useState } from "react";

interface InitialEnvironmentDialogProps {
  isOpen: boolean;
  onEnvironmentReady: (imageUrl: string) => void;
  onClose?: () => void;
  selectedModel?: string;
  onModelChange?: (model: string) => void;
  selectedQuality?: string;
  onQualityChange?: (quality: string) => void;
  selectedAspectRatio?: string;
  onAspectRatioChange?: (aspectRatio: string) => void;
}

export default function InitialEnvironmentDialog({
  isOpen,
  onEnvironmentReady,
  onClose,
  selectedModel = "",
  onModelChange,
  selectedQuality = "",
  onQualityChange,
  selectedAspectRatio = "",
  onAspectRatioChange,
}: InitialEnvironmentDialogProps) {
  const [mode, setMode] = useState<"upload" | "generate">("upload");
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [enhancedPrompt, setEnhancedPrompt] = useState<string | null>(null);
  const [showEnhancedPrompt, setShowEnhancedPrompt] = useState(false);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      onEnvironmentReady(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      alert("Please enter a description");
      return;
    }

    setIsGenerating(true);

    try {
      const response = await fetch("/api/generate-environment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          model: selectedModel,
          ...(selectedModel === "gemini-3-pro-image-preview" && { quality: selectedQuality }),
          aspectRatio: selectedAspectRatio,
        }),
      });

      const data = await response.json();

      if (data.status === "success") {
        if (data.enhancedPrompt) {
          setEnhancedPrompt(data.enhancedPrompt);
          setShowEnhancedPrompt(true);
        }
        onEnvironmentReady(data.imageUrl);
      } else {
        alert("Generation failed: " + (data.message || "Unknown error"));
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_error) {
      alert("Failed to generate environment. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">
                Choose Your Environment
              </h2>
              <p className="text-gray-600 mt-2">
                Upload an existing image or generate one with AI
              </p>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                ×
              </button>
            )}
          </div>

          {/* Mode selector */}
          <div className="flex gap-4 mb-6">
            <button
              onClick={() => setMode("upload")}
              className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
                mode === "upload"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              Upload Image
            </button>
            <button
              onClick={() => setMode("generate")}
              className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
                mode === "generate"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              Generate with AI
            </button>
          </div>

          {/* Model, Quality, and Aspect Ratio Selectors (only show when generate mode is active) */}
          {mode === "generate" && onModelChange && (
            <div className="mb-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  AI Model
                </label>
                <select
                  value={selectedModel}
                  onChange={(e) => onModelChange(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg font-medium text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Choose model...</option>
                  <option value="gemini-2.5-flash-image">Gemini 2.5 Flash</option>
                  <option value="gemini-3-pro-image-preview">Gemini 3 Pro</option>
                </select>
              </div>

              {onQualityChange && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Image Quality {selectedModel !== "gemini-3-pro-image-preview" && "(Pro only)"}
                  </label>
                  <select
                    value={selectedQuality}
                    onChange={(e) => onQualityChange(e.target.value)}
                    disabled={selectedModel !== "gemini-3-pro-image-preview"}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg font-medium text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">Choose quality...</option>
                    <option value="1K">1K (1024px)</option>
                    <option value="2K">2K (2048px)</option>
                    <option value="4K">4K (4096px)</option>
                  </select>
                </div>
              )}

              {onAspectRatioChange && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Aspect Ratio
                  </label>
                  <select
                    value={selectedAspectRatio}
                    onChange={(e) => onAspectRatioChange(e.target.value)}
                    disabled={!selectedModel}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg font-medium text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">Choose aspect ratio...</option>
                    <option value="1:1">1:1 (Square)</option>
                    <option value="2:3">2:3 (Portrait)</option>
                    <option value="3:2">3:2 (Landscape)</option>
                    <option value="3:4">3:4 (Portrait)</option>
                    <option value="4:3">4:3 (Landscape)</option>
                    <option value="4:5">4:5 (Portrait)</option>
                    <option value="5:4">5:4 (Landscape)</option>
                    <option value="9:16">9:16 (Vertical)</option>
                    <option value="16:9">16:9 (Widescreen)</option>
                    <option value="21:9">21:9 (Ultrawide)</option>
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Upload mode */}
          {mode === "upload" && (
            <div>
              <p className="text-gray-600 mb-4">
                Upload an existing image to use as your environment
              </p>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
              />
            </div>
          )}

          {/* Generate mode */}
          {mode === "generate" && (
            <div>
              <p className="text-gray-600 mb-4">
                Describe the environment scene you want to create
              </p>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Example: A modern living room with large windows, natural light, white walls, and a wooden floor. The room has a minimalist design with a grey sofa and indoor plants."
                className="w-full h-32 p-3 border border-gray-300 rounded-lg resize-none text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <div className="mt-4">
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || !prompt.trim()}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
                >
                  {isGenerating ? "Generating Environment..." : "Generate Environment"}
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Tip: Just describe what you want - the AI will enhance your prompt for photorealism
              </p>

              {/* Show enhanced prompt */}
              {enhancedPrompt && showEnhancedPrompt && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-blue-900 text-sm">
                      AI-Enhanced Prompt Used:
                    </h3>
                    <button
                      onClick={() => setShowEnhancedPrompt(false)}
                      className="text-blue-600 hover:text-blue-800 text-xs"
                    >
                      Hide
                    </button>
                  </div>
                  <p className="text-sm text-blue-800 whitespace-pre-wrap">
                    {enhancedPrompt}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
