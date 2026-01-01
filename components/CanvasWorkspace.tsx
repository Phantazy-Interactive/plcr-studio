"use client";

import { useState, useCallback } from "react";
import InitialEnvironmentDialog from "./InitialEnvironmentDialog";
import EnhancedExcalidrawCanvas from "./EnhancedExcalidrawCanvas";
import UserMenu from "./UserMenu";
import { useImageMetadata } from "@/hooks/useImageMetadata";
import { useGenerationManager } from "@/hooks/useGenerationManager";
import type { ImageMetadata } from "@/types/canvas";

export default function CanvasWorkspace() {
  // Environment setup state
  const [showEnvironmentDialog, setShowEnvironmentDialog] = useState(false);

  // Image tracking with custom hook
  const {
    addImage,
    removeImageByElementId,
    updateImageType,
    getImageByElementId,
    getEnvironmentImage,
    getProductImages,
  } = useImageMetadata();

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [selectedQuality, setSelectedQuality] = useState<string>("");
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<string>("");

  // Excalidraw API reference
  const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null);

  // Generation manager hook
  const { generateImage } = useGenerationManager({
    excalidrawAPI,
    getEnvironmentImage,
    getProductImages,
  });

  // Add generated image to canvas
  const addGeneratedImageToCanvas = useCallback(async (imageUrl: string, imageType: 'environment' | 'generated' = 'generated') => {
    if (!excalidrawAPI) {
      throw new Error("Excalidraw API not ready");
    }

    try {
      // Get image dimensions
      const img = new Image();
      img.src = imageUrl;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      // Scale down if too large
      const MAX_SIZE = 1024;
      let displayWidth = img.width;
      let displayHeight = img.height;

      if (img.width > MAX_SIZE || img.height > MAX_SIZE) {
        const scale = Math.min(MAX_SIZE / img.width, MAX_SIZE / img.height);
        displayWidth = Math.floor(img.width * scale);
        displayHeight = Math.floor(img.height * scale);
      }

      // Add file to Excalidraw
      const fileId = `${imageType}-${Date.now()}`;

      const response = await fetch(imageUrl);
      const blob = await response.blob();

      await excalidrawAPI.addFiles([
        {
          id: fileId,
          dataURL: imageUrl,
          mimeType: blob.type,
          created: Date.now(),
        }
      ]);

      // Get current elements
      const currentElements = excalidrawAPI.getSceneElements();

      let xPosition = 0;
      let yPosition = 0;
      let targetFrameId = null;

      // For environment images, position inside the Environment frame
      if (imageType === 'environment') {
        const envFrame = currentElements.find((el: any) => el.id === 'frame-environment-static');
        if (envFrame) {
          // Frame dimensions (matching EnhancedExcalidrawCanvas.tsx)
          const frameWidth = 2400;
          const frameHeight = 1800;
          const framePadding = 20;

          // Scale image to fit inside frame with padding
          const maxWidth = frameWidth - framePadding * 2;
          const maxHeight = frameHeight - framePadding * 2;

          const scale = Math.min(maxWidth / displayWidth, maxHeight / displayHeight);
          displayWidth = Math.floor(displayWidth * scale);
          displayHeight = Math.floor(displayHeight * scale);

          // Center image in frame
          xPosition = envFrame.x + (frameWidth - displayWidth) / 2;
          yPosition = envFrame.y + (frameHeight - displayHeight) / 2;
          targetFrameId = envFrame.id;
        }
      } else if (imageType === 'generated') {
        // For generated images, position inside the Generated frame
        const generatedFrame = currentElements.find((el: any) => el.id === 'frame-generated-static');
        if (generatedFrame) {
          // Frame dimensions (matching EnhancedExcalidrawCanvas.tsx)
          const frameWidth = 2400;
          const frameHeight = 1800;
          const framePadding = 20;

          // Scale image to fit inside frame with padding, but make it smaller (40% of frame)
          const maxWidth = (frameWidth - framePadding * 2) * 0.4;
          const maxHeight = (frameHeight - framePadding * 2) * 0.4;

          const scale = Math.min(maxWidth / displayWidth, maxHeight / displayHeight);
          displayWidth = Math.floor(displayWidth * scale);
          displayHeight = Math.floor(displayHeight * scale);

          // Center image in frame
          xPosition = generatedFrame.x + (frameWidth - displayWidth) / 2;
          yPosition = generatedFrame.y + (frameHeight - displayHeight) / 2;
          targetFrameId = generatedFrame.id;
        }
      } else {
        // For non-environment/non-generated images, position to the right of existing content
        let maxX = 0;
        currentElements.forEach((el: any) => {
          if (el.type === 'image' && !el.isDeleted) {
            const rightEdge = el.x + el.width;
            if (rightEdge > maxX) maxX = rightEdge;
          }
        });
        xPosition = maxX + 100; // 100px gap
        yPosition = 0;
      }

      // Create image element
      const elementId = `${imageType}-element-${Date.now()}`;
      const imageElement = {
        type: "image",
        version: 1,
        versionNonce: Math.floor(Math.random() * 1000000),
        isDeleted: false,
        id: elementId,
        fillStyle: "solid",
        strokeWidth: 0,
        strokeStyle: "solid",
        roughness: 0,
        opacity: 100,
        angle: 0,
        x: xPosition,
        y: yPosition,
        strokeColor: "transparent",
        backgroundColor: "transparent",
        width: displayWidth,
        height: displayHeight,
        seed: Math.floor(Math.random() * 1000000),
        groupIds: [],
        frameId: targetFrameId,
        roundness: null,
        boundElements: [],
        updated: Date.now(),
        link: null,
        locked: false,
        fileId: fileId,
        scale: [1, 1],
      };

      // Add to scene - environment images go to back, others to front
      if (imageType === 'environment') {
        // Insert at the beginning (back layer) but after frames
        const frameElements = currentElements.filter((el: any) => el.type === 'frame');
        const nonFrameElements = currentElements.filter((el: any) => el.type !== 'frame');
        excalidrawAPI.updateScene({
          elements: [...frameElements, imageElement, ...nonFrameElements],
        });
      } else {
        // Add to front (end of array)
        excalidrawAPI.updateScene({
          elements: [...currentElements, imageElement],
        });
      }

      // Scroll to show the new image
      setTimeout(() => {
        if (excalidrawAPI) {
          excalidrawAPI.scrollToContent([imageElement], {
            fitToContent: false,
            animate: true,
          });
        }
      }, 100);

      // Create metadata
      const metadata: ImageMetadata = {
        id: `${imageType}-${Date.now()}`,
        type: imageType,
        dataUrl: imageUrl,
        highResDataUrl: imageUrl,
        excalidrawFileId: fileId,
        excalidrawElementId: elementId,
        addedAt: Date.now(),
        width: displayWidth,
        height: displayHeight,
        isLocked: false,
      };

      addImage(metadata);
    } catch (error) {
      throw error;
    }
  }, [excalidrawAPI, addImage]);

  // Handle environment ready from dialog
  const handleEnvironmentReady = useCallback(async (imageUrl: string) => {
    setShowEnvironmentDialog(false);

    // Add the environment image to the canvas (marked as 'environment' type)
    if (excalidrawAPI) {
      await addGeneratedImageToCanvas(imageUrl, 'environment');
    }
  }, [excalidrawAPI, addGeneratedImageToCanvas]);

  // Handle image added to canvas
  const handleImageAdded = useCallback((metadata: ImageMetadata) => {
    addImage(metadata);
  }, [addImage]);

  // Handle image removed from canvas
  const handleImageRemoved = useCallback((elementId: string) => {
    removeImageByElementId(elementId);
  }, [removeImageByElementId]);

  // Check if generation is possible
  const canGenerate = useCallback(() => {
    const hasEnvironment = getEnvironmentImage() !== undefined;
    const hasProducts = getProductImages().length > 0;
    return hasEnvironment && hasProducts;
  }, [getEnvironmentImage, getProductImages]);

  // Handle generate image button
  const handleGenerateImage = useCallback(async () => {
    if (!canGenerate()) {
      alert('Please add an environment image (in Environment frame) and at least one product image (in Product frame) before generating.');
      return;
    }

    setIsGenerating(true);

    try {
      const generatedImageUrl = await generateImage(selectedModel, selectedQuality, selectedAspectRatio);

      if (generatedImageUrl) {
        await addGeneratedImageToCanvas(generatedImageUrl);
      }
    } catch (error: any) {
      alert(`Generation failed: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  }, [generateImage, addGeneratedImageToCanvas, selectedModel, selectedQuality, selectedAspectRatio, canGenerate]);

  // Handle generate environment button
  const handleGenerateEnvironment = useCallback(() => {
    setShowEnvironmentDialog(true);
  }, []);

  // Handle export canvas - triggers Excalidraw's native export dialog
  const handleExport = useCallback(() => {
    if (!excalidrawAPI) {
      alert("Canvas not ready");
      return;
    }

    // Trigger the export dialog by simulating the keyboard shortcut
    // This is the same as pressing Cmd+Shift+E (or Ctrl+Shift+E on Windows)
    const event = new KeyboardEvent('keydown', {
      key: 'e',
      code: 'KeyE',
      shiftKey: true,
      metaKey: true, // Cmd on Mac
      ctrlKey: false,
      bubbles: true,
      cancelable: true,
    });

    // Dispatch the event to the Excalidraw container
    const excalidrawContainer = document.querySelector('.excalidraw');
    if (excalidrawContainer) {
      excalidrawContainer.dispatchEvent(event);
    }
  }, [excalidrawAPI]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* User menu (only shown if user is authenticated) */}
      <UserMenu />

      {/* Environment dialog (optional) */}
      <InitialEnvironmentDialog
        isOpen={showEnvironmentDialog}
        onEnvironmentReady={handleEnvironmentReady}
        onClose={() => setShowEnvironmentDialog(false)}
        selectedModel={selectedModel}
        onModelChange={setSelectedModel}
        selectedQuality={selectedQuality}
        onQualityChange={setSelectedQuality}
        selectedAspectRatio={selectedAspectRatio}
        onAspectRatioChange={setSelectedAspectRatio}
      />

      {/* Main canvas - always shown */}
      <div className="h-screen flex flex-col">
        {/* Canvas */}
        <div className="flex-1 overflow-hidden">
          <EnhancedExcalidrawCanvas
            onImageAdded={handleImageAdded}
            onImageRemoved={handleImageRemoved}
            onImageTypeUpdate={updateImageType}
            checkImageExists={getImageByElementId}
            onGenerateImage={handleGenerateImage}
            onGenerateEnvironment={handleGenerateEnvironment}
            onExport={handleExport}
            isGenerating={isGenerating}
            canGenerateImage={canGenerate()}
            onExcalidrawAPIReady={setExcalidrawAPI}
            selectedModel={selectedModel}
            onModelChange={setSelectedModel}
            selectedQuality={selectedQuality}
            onQualityChange={setSelectedQuality}
            selectedAspectRatio={selectedAspectRatio}
            onAspectRatioChange={setSelectedAspectRatio}
          />
        </div>
      </div>
    </div>
  );
}
