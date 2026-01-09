"use client";

import React, { useState, useEffect } from "react";
import type { ProductMetadata } from "@/types/semanticPrompt";

interface ProductMetadataDialogProps {
  isOpen: boolean;
  metadata: ProductMetadata | undefined;
  onSave: (metadata: ProductMetadata) => void;
  onClose: () => void;
  onClassify?: (text: string) => Promise<any>;
}

export default function ProductMetadataDialog({
  isOpen,
  metadata,
  onSave,
  onClose,
  onClassify,
}: ProductMetadataDialogProps) {
  const [formData, setFormData] = useState<ProductMetadata>({
    category: "",
    subcategory: "",
    materials: [],
    colors: [],
    style: "",
    features: [],
    tags: [],
  });

  const [newMaterial, setNewMaterial] = useState("");
  const [newColor, setNewColor] = useState("");
  const [newFeature, setNewFeature] = useState("");
  const [newTag, setNewTag] = useState("");
  const [isClassifying, setIsClassifying] = useState(false);
  const [classificationText, setClassificationText] = useState("");

  useEffect(() => {
    if (metadata) {
      setFormData(metadata);
    } else {
      setFormData({
        category: "",
        subcategory: "",
        materials: [],
        colors: [],
        style: "",
        features: [],
        tags: [],
      });
    }
  }, [metadata, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(formData);
    onClose();
  };

  const handleAddItem = (
    field: "materials" | "colors" | "features" | "tags",
    value: string,
    setValue: (value: string) => void
  ) => {
    if (value.trim()) {
      const currentValues = formData[field] || [];
      if (!currentValues.includes(value.trim())) {
        setFormData({
          ...formData,
          [field]: [...currentValues, value.trim()],
        });
      }
      setValue("");
    }
  };

  const handleRemoveItem = (
    field: "materials" | "colors" | "features" | "tags",
    index: number
  ) => {
    const currentValues = formData[field] || [];
    setFormData({
      ...formData,
      [field]: currentValues.filter((_, i) => i !== index),
    });
  };

  const handleClassify = async () => {
    if (!onClassify || !classificationText.trim()) return;

    setIsClassifying(true);
    try {
      const result = await onClassify(classificationText);
      if (result?.productMetadata) {
        setFormData({
          category: result.productMetadata.category || formData.category,
          subcategory: result.productMetadata.subcategory || formData.subcategory,
          materials: [
            ...(formData.materials || []),
            ...(result.productMetadata.materials || []),
          ].filter((v, i, arr) => arr.indexOf(v) === i),
          colors: [
            ...(formData.colors || []),
            ...(result.productMetadata.colors || []),
          ].filter((v, i, arr) => arr.indexOf(v) === i),
          style: result.productMetadata.style || formData.style,
          features: [
            ...(formData.features || []),
            ...(result.productMetadata.features || []),
          ].filter((v, i, arr) => arr.indexOf(v) === i),
          tags: [
            ...(formData.tags || []),
            ...(result.productMetadata.tags || []),
          ].filter((v, i, arr) => arr.indexOf(v) === i),
        });
        setClassificationText("");
      }
    } catch (err) {
      console.error("Classification error:", err);
    } finally {
      setIsClassifying(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b dark:border-gray-700">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Product Metadata
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Add semantic information to improve generation quality
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* AI Classification */}
          {onClassify && (
            <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
              <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                🤖 Auto-classify from description
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={classificationText}
                  onChange={(e) => setClassificationText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleClassify()}
                  placeholder="Describe the product (e.g., 'modern blue leather sofa')"
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white text-sm"
                  disabled={isClassifying}
                />
                <button
                  onClick={handleClassify}
                  disabled={isClassifying || !classificationText.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isClassifying ? "Analyzing..." : "Classify"}
                </button>
              </div>
            </div>
          )}

          {/* Category */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white text-sm"
              >
                <option value="">Select category</option>
                <option value="furniture">Furniture</option>
                <option value="electronics">Electronics</option>
                <option value="decor">Decor</option>
                <option value="lighting">Lighting</option>
                <option value="textiles">Textiles</option>
                <option value="art">Art</option>
                <option value="plants">Plants</option>
                <option value="kitchenware">Kitchenware</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Subcategory
              </label>
              <input
                type="text"
                value={formData.subcategory}
                onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                placeholder="e.g., sofa, laptop, vase"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white text-sm"
              />
            </div>
          </div>

          {/* Style */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Style
            </label>
            <select
              value={formData.style}
              onChange={(e) => setFormData({ ...formData, style: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white text-sm"
            >
              <option value="">Select style</option>
              <option value="modern">Modern</option>
              <option value="contemporary">Contemporary</option>
              <option value="minimalist">Minimalist</option>
              <option value="industrial">Industrial</option>
              <option value="vintage">Vintage</option>
              <option value="rustic">Rustic</option>
              <option value="scandinavian">Scandinavian</option>
              <option value="bohemian">Bohemian</option>
              <option value="traditional">Traditional</option>
              <option value="luxury">Luxury</option>
            </select>
          </div>

          {/* Materials */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Materials
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newMaterial}
                onChange={(e) => setNewMaterial(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddItem("materials", newMaterial, setNewMaterial)}
                placeholder="Add material (e.g., leather, wood, metal)"
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white text-sm"
              />
              <button
                onClick={() => handleAddItem("materials", newMaterial, setNewMaterial)}
                className="px-3 py-2 text-sm font-medium text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-md"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {(formData.materials || []).map((material, index) => (
                <span
                  key={index}
                  className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full flex items-center gap-2"
                >
                  {material}
                  <button
                    onClick={() => handleRemoveItem("materials", index)}
                    className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Colors */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Colors
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newColor}
                onChange={(e) => setNewColor(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddItem("colors", newColor, setNewColor)}
                placeholder="Add color (e.g., navy blue, silver)"
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white text-sm"
              />
              <button
                onClick={() => handleAddItem("colors", newColor, setNewColor)}
                className="px-3 py-2 text-sm font-medium text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-md"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {(formData.colors || []).map((color, index) => (
                <span
                  key={index}
                  className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full flex items-center gap-2"
                >
                  {color}
                  <button
                    onClick={() => handleRemoveItem("colors", index)}
                    className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Features */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Features
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newFeature}
                onChange={(e) => setNewFeature(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddItem("features", newFeature, setNewFeature)}
                placeholder="Add feature (e.g., adjustable, foldable)"
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white text-sm"
              />
              <button
                onClick={() => handleAddItem("features", newFeature, setNewFeature)}
                className="px-3 py-2 text-sm font-medium text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-md"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {(formData.features || []).map((feature, index) => (
                <span
                  key={index}
                  className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full flex items-center gap-2"
                >
                  {feature}
                  <button
                    onClick={() => handleRemoveItem("features", index)}
                    className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Tags
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddItem("tags", newTag, setNewTag)}
                placeholder="Add tag"
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white text-sm"
              />
              <button
                onClick={() => handleAddItem("tags", newTag, setNewTag)}
                className="px-3 py-2 text-sm font-medium text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-md"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {(formData.tags || []).map((tag, index) => (
                <span
                  key={index}
                  className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full flex items-center gap-2"
                >
                  {tag}
                  <button
                    onClick={() => handleRemoveItem("tags", index)}
                    className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
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
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-md"
          >
            Save Metadata
          </button>
        </div>
      </div>
    </div>
  );
}
