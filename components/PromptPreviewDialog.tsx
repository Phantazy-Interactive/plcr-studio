"use client";

import React, { useState, useEffect } from "react";
import type { PromptBuilderOutput } from "@/types/semanticPrompt";

interface PromptPreviewDialogProps {
  isOpen: boolean;
  promptOutput: PromptBuilderOutput | null;
  onGenerate: (finalPrompt: string) => void;
  onClose: () => void;
  onRegenerate?: () => void;
  isGenerating?: boolean;
}

export default function PromptPreviewDialog({
  isOpen,
  promptOutput,
  onGenerate,
  onClose,
  onRegenerate,
  isGenerating = false,
}: PromptPreviewDialogProps) {
  const [editedPrompt, setEditedPrompt] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<"prompt" | "breakdown" | "metadata">("prompt");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showAllVariables, setShowAllVariables] = useState(false);

  // Update edited prompt when promptOutput changes
  useEffect(() => {
    if (promptOutput) {
      setEditedPrompt(promptOutput.enhancedPrompt);
      setIsEditing(false);
    }
  }, [promptOutput]);

  if (!isOpen || !promptOutput) return null;

  const handleGenerate = () => {
    onGenerate(isEditing ? editedPrompt : promptOutput.enhancedPrompt);
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(promptOutput.enhancedPrompt);
    // Could add a toast notification here
  };

  const confidencePercent = Math.round(promptOutput.confidence * 100);
  const confidenceColor =
    promptOutput.confidence >= 0.8
      ? "text-green-600"
      : promptOutput.confidence >= 0.6
      ? "text-yellow-600"
      : "text-orange-600";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b dark:border-gray-700">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
                Enhanced Prompt Preview
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Review and edit the AI-generated prompt before creating your image
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b dark:border-gray-700">
          <div className="flex">
            <button
              onClick={() => setActiveTab("prompt")}
              className={`flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 ${
                activeTab === "prompt"
                  ? "text-purple-600 border-b-2 border-purple-600"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Prompt
            </button>
            <button
              onClick={() => setActiveTab("breakdown")}
              className={`flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 ${
                activeTab === "breakdown"
                  ? "text-purple-600 border-b-2 border-purple-600"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Breakdown
            </button>
            <button
              onClick={() => setActiveTab("metadata")}
              className={`flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 ${
                activeTab === "metadata"
                  ? "text-purple-600 border-b-2 border-purple-600"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              Metadata
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Prompt Tab */}
          {activeTab === "prompt" && (
            <div className="space-y-4">
              {isEditing ? (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Edit Prompt
                  </label>
                  <textarea
                    value={editedPrompt}
                    onChange={(e) => setEditedPrompt(e.target.value)}
                    className="w-full h-80 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white font-mono text-sm"
                    placeholder="Edit your prompt here..."
                  />
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`flex items-center gap-1 ${confidenceColor} font-medium`}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          {promptOutput.confidence >= 0.7 ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          )}
                        </svg>
                        Confidence: {confidencePercent}%
                      </span>
                      <span className="px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">
                        {promptOutput.template.name}
                      </span>
                    </div>
                    <button
                      onClick={handleCopyPrompt}
                      className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 flex items-center gap-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copy
                    </button>
                  </div>

                  <pre className="whitespace-pre-wrap bg-gray-50 dark:bg-gray-900 p-4 rounded-md text-sm text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700">
                    {promptOutput.enhancedPrompt}
                  </pre>

                  {promptOutput.suggestions && promptOutput.suggestions.length > 0 && (
                    <div className="border border-blue-200 dark:border-blue-800 rounded-md overflow-hidden">
                      <button
                        onClick={() => setShowSuggestions(!showSuggestions)}
                        className="w-full flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50"
                      >
                        <span className="flex items-center gap-2 text-sm font-medium text-blue-900 dark:text-blue-100">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                          </svg>
                          Suggestions for improvement ({promptOutput.suggestions.length})
                        </span>
                        <svg className={`w-4 h-4 transition-transform ${showSuggestions ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {showSuggestions && (
                        <div className="p-3 space-y-2">
                          {promptOutput.suggestions.map((suggestion, index) => (
                            <div key={index} className="flex items-start gap-2 text-sm">
                              <svg className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span className="text-gray-700 dark:text-gray-300">{suggestion}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  {isEditing ? "Preview" : "Edit"}
                </button>

                {onRegenerate && (
                  <button
                    onClick={onRegenerate}
                    disabled={isGenerating}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md flex items-center gap-2 disabled:opacity-50"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Regenerate
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Breakdown Tab */}
          {activeTab === "breakdown" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Scene Description</h3>
                <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 p-3 rounded-md">
                  {promptOutput.components.sceneDescription}
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Placement Instructions</h3>
                <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 p-3 rounded-md">
                  {promptOutput.components.placementInstructions}
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Technical Details</h3>
                <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 p-3 rounded-md whitespace-pre-wrap">
                  {promptOutput.components.technicalDetails}
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Style Guidance</h3>
                <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 p-3 rounded-md whitespace-pre-wrap">
                  {promptOutput.components.styleGuidance}
                </p>
              </div>

              <div className="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
                <button
                  onClick={() => setShowAllVariables(!showAllVariables)}
                  className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">All Variables</span>
                  <svg className={`w-4 h-4 transition-transform ${showAllVariables ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showAllVariables && (
                  <div className="p-3 space-y-3">
                    {Object.entries(promptOutput.variables).map(([key, value]) => (
                      <div key={key} className="space-y-1">
                        <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400">{key}</h4>
                        <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-900 p-2 rounded">
                          {value || <span className="italic text-gray-400">Not set</span>}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Metadata Tab */}
          {activeTab === "metadata" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Template</h3>
                <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-md border border-gray-200 dark:border-gray-700">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{promptOutput.template.name}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{promptOutput.template.description}</p>
                  <span className="inline-block mt-2 px-2 py-1 text-xs font-medium bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded">
                    {promptOutput.template.category}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Quality Metrics</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-md border border-gray-200 dark:border-gray-700">
                    <p className="text-xs text-gray-600 dark:text-gray-400">Confidence</p>
                    <p className={`text-2xl font-bold ${confidenceColor}`}>{confidencePercent}%</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-md border border-gray-200 dark:border-gray-700">
                    <p className="text-xs text-gray-600 dark:text-gray-400">Annotations Used</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {promptOutput.usedAnnotations.length}
                    </p>
                  </div>
                </div>
              </div>

              {promptOutput.usedAnnotations.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Used Annotations</h3>
                  <div className="flex flex-wrap gap-2">
                    {promptOutput.usedAnnotations.map((id) => (
                      <span
                        key={id}
                        className="px-2 py-1 text-xs font-mono bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded border border-gray-300 dark:border-gray-600"
                      >
                        {id.slice(0, 8)}...
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Template Variables</h3>
                <div className="flex flex-wrap gap-2">
                  {promptOutput.template.variables.map((variable) => (
                    <span
                      key={variable}
                      className="px-2 py-1 text-xs bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded"
                    >
                      {variable}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t dark:border-gray-700 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-md"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-md flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Generating...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
                Generate Image
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
