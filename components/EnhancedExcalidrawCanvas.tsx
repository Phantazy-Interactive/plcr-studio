"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { ImageMetadata } from "@/types/canvas";
import IteratePromptDialog from "./IteratePromptDialog";

interface EnhancedExcalidrawCanvasProps {
  onImageAdded: (metadata: ImageMetadata) => void;
  onImageRemoved: (elementId: string) => void;
  onImageTypeUpdate: (elementId: string, newType: 'environment' | 'product' | 'asset') => void;
  checkImageExists: (elementId: string) => ImageMetadata | undefined;
  onGenerateImage: () => void;
  onGenerateEnvironment: () => void;
  onExport: () => void;
  isGenerating: boolean;
  canGenerateImage: boolean;
  onExcalidrawAPIReady: (api: any) => void;
  selectedModel: string;
  onModelChange: (model: string) => void;
  selectedQuality: string;
  onQualityChange: (quality: string) => void;
  selectedAspectRatio: string;
  onAspectRatioChange: (aspectRatio: string) => void;
}

export default function EnhancedExcalidrawCanvas({
  onImageAdded,
  onImageRemoved,
  onImageTypeUpdate,
  checkImageExists,
  onGenerateImage,
  onGenerateEnvironment,
  onExport: _onExport,
  isGenerating,
  canGenerateImage,
  onExcalidrawAPIReady,
  selectedModel,
  onModelChange,
  selectedQuality,
  onQualityChange,
  selectedAspectRatio,
  onAspectRatioChange,
}: EnhancedExcalidrawCanvasProps) {
  // Dynamic import state
  const [Excalidraw, setExcalidraw] = useState<any>(null);

  // Excalidraw API reference
  const excalidrawAPIRef = useRef<any>(null);

  // Use ref instead of state for previousImageIds to avoid infinite loops
  const previousImageIdsRef = useRef<Set<string>>(new Set());

  // Track frame membership: Map<elementId, frameType>
  const frameMembershipRef = useRef<Map<string, 'environment' | 'product' | null>>(new Map());

  // Iterate prompt dialog state
  const [showIterateDialog, setShowIterateDialog] = useState(false);
  const [iterateImageId, setIterateImageId] = useState<string | null>(null);
  const [isIterating, setIsIterating] = useState(false);

  // Create asset dialog state
  const [showCreateAssetDialog, setShowCreateAssetDialog] = useState(false);
  const [isCreatingAsset, setIsCreatingAsset] = useState(false);

  // Selected image tracking for floating menu
  const [selectedImageElement, setSelectedImageElement] = useState<any>(null);

  // Load Excalidraw dynamically
  useEffect(() => {
    import("@excalidraw/excalidraw")
      .then((excalidrawModule) => {
        setExcalidraw(() => excalidrawModule.Excalidraw);
      })
      .catch(() => {});
  }, []);

  // Prevent trackpad swipe navigation (Mac gesture back/forward)
  useEffect(() => {
    const preventSwipeNavigation = (e: WheelEvent) => {
      // Detect horizontal scrolling
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        e.preventDefault();
      }
    };

    // Add listener with passive: false to allow preventDefault
    window.addEventListener('wheel', preventSwipeNavigation, { passive: false });

    return () => {
      window.removeEventListener('wheel', preventSwipeNavigation);
    };
  }, []);

  // Handle Excalidraw ready
  const onExcalidrawMount = useCallback((api: any) => {
    excalidrawAPIRef.current = api;
    onExcalidrawAPIReady(api);

    // Create pre-rendered Environment and Product frames
    setTimeout(() => {
      if (api) {

        // Environment frame (left side) - using static ID for referencing
        const envFrame = {
          type: "frame",
          version: 1,
          versionNonce: Math.floor(Math.random() * 1000000),
          isDeleted: false,
          id: "frame-environment-static",
          fillStyle: "solid",
          strokeWidth: 2,
          strokeStyle: "dashed",
          roughness: 0,
          opacity: 100,
          angle: 0,
          x: 50,
          y: 50,
          strokeColor: "#1971c2", // Blue
          backgroundColor: "transparent",
          width: 2400,
          height: 1800,
          seed: Math.floor(Math.random() * 1000000),
          groupIds: [],
          frameId: null,
          roundness: null,
          boundElements: [],
          updated: Date.now(),
          link: null,
          locked: false,
          name: "Environment",
        };

        // Product frame (middle) - using static ID for referencing
        const productFrame = {
          type: "frame",
          version: 1,
          versionNonce: Math.floor(Math.random() * 1000000),
          isDeleted: false,
          id: "frame-product-static",
          fillStyle: "solid",
          strokeWidth: 2,
          strokeStyle: "dashed",
          roughness: 0,
          opacity: 100,
          angle: 0,
          x: 2550,
          y: 50,
          strokeColor: "#9c36b5", // Purple
          backgroundColor: "transparent",
          width: 2400,
          height: 1800,
          seed: Math.floor(Math.random() * 1000000),
          groupIds: [],
          frameId: null,
          roundness: null,
          boundElements: [],
          updated: Date.now(),
          link: null,
          locked: false,
          name: "Product",
        };

        // Generated frame (right side) - using static ID for referencing
        const generatedFrame = {
          type: "frame",
          version: 1,
          versionNonce: Math.floor(Math.random() * 1000000),
          isDeleted: false,
          id: "frame-generated-static",
          fillStyle: "solid",
          strokeWidth: 2,
          strokeStyle: "dashed",
          roughness: 0,
          opacity: 100,
          angle: 0,
          x: 5050,
          y: 50,
          strokeColor: "#2f9e44", // Green
          backgroundColor: "transparent",
          width: 2400,
          height: 1800,
          seed: Math.floor(Math.random() * 1000000),
          groupIds: [],
          frameId: null,
          roundness: null,
          boundElements: [],
          updated: Date.now(),
          link: null,
          locked: false,
          name: "Generated",
        };

        api.updateScene({
          elements: [envFrame, productFrame, generatedFrame],
        });

        // Wait for component to fully mount before centering
        setTimeout(() => {
          requestAnimationFrame(() => {
            if (api && typeof api.scrollToContent === 'function') {
              try {
                const currentElements = api.getSceneElements();
                const frames = currentElements.filter((el: any) =>
                  el.id === 'frame-environment-static' ||
                  el.id === 'frame-product-static' ||
                  el.id === 'frame-generated-static'
                );
                if (frames.length === 3) {
                  api.scrollToContent(frames, {
                    fitToContent: true,
                    animate: false,
                  });
                }
              } catch (error) {
                // Ignore if not ready
              }
            }
          });
        }, 1000);
      }
    }, 100);
  }, [onExcalidrawAPIReady]);

  // Handle save to disk - triggers Excalidraw's native export dialog
  const handleSaveToDisk = useCallback(() => {
    // Trigger Excalidraw's native export dialog (Cmd+Shift+E)
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
  }, []);

  // Handle iterate submission
  const handleIterateSubmit = useCallback(async (prompt: string) => {
    if (!iterateImageId || !excalidrawAPIRef.current) return;

    try {
      setIsIterating(true);

      const files = excalidrawAPIRef.current.getFiles();
      const elements = excalidrawAPIRef.current.getSceneElements();
      const imageElement = elements.find((el: any) => el.id === iterateImageId);

      if (!imageElement || !imageElement.fileId) {
        throw new Error('Image not found');
      }

      const fileData = files[imageElement.fileId];
      if (!fileData || !fileData.dataURL) {
        throw new Error('Image data not found');
      }

      // Call generate-improvement API with just the selected image and prompt
      const response = await fetch('/api/generate-improvement', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: fileData.dataURL,
          prompt,
          model: selectedModel,
          ...(selectedModel === "gemini-3-pro-image-preview" && { quality: selectedQuality }),
          aspectRatio: selectedAspectRatio,
        }),
      });

      const data = await response.json();

      if (data.status === 'success' && data.generatedImage) {
        // Add generated image to canvas
        const img = new Image();
        img.src = data.generatedImage;
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
        const fileId = `iterated-${Date.now()}`;
        const response = await fetch(data.generatedImage);
        const blob = await response.blob();

        await excalidrawAPIRef.current.addFiles([
          {
            id: fileId,
            dataURL: data.generatedImage,
            mimeType: blob.type,
            created: Date.now(),
          }
        ]);

        // Get current elements to position new image in Generated frame
        const currentElements = excalidrawAPIRef.current.getSceneElements();
        const generatedFrame = currentElements.find((el: any) => el.id === 'frame-generated-static');

        let xPosition = 0;
        let yPosition = 0;
        let targetFrameId = null;

        if (generatedFrame) {
          // Frame dimensions
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
        } else {
          // Fallback: position to the right of existing content
          let maxX = 0;
          currentElements.forEach((el: any) => {
            if (el.type === 'image' && !el.isDeleted) {
              const rightEdge = el.x + el.width;
              if (rightEdge > maxX) maxX = rightEdge;
            }
          });
          xPosition = maxX + 100; // 100px gap
        }

        // Create image element
        const elementId = `iterated-element-${Date.now()}`;
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

        // Add to scene
        excalidrawAPIRef.current.updateScene({
          elements: [...currentElements, imageElement],
        });

        // Scroll to show the new image
        setTimeout(() => {
          if (excalidrawAPIRef.current) {
            excalidrawAPIRef.current.scrollToContent([imageElement], {
              fitToContent: false,
              animate: true,
            });
          }
        }, 100);

        // Close dialog
        setShowIterateDialog(false);
        setIterateImageId(null);
      } else {
        throw new Error(data.message || 'Iteration failed');
      }
    } catch (error: any) {
      alert(`Iteration failed: ${error.message}`);
    } finally {
      setIsIterating(false);
    }
  }, [iterateImageId, selectedModel, selectedQuality, selectedAspectRatio]);

  // Helper function to check if an image is inside a frame
  const getImageFrameType = useCallback((imageEl: any, elements: any[]): 'environment' | 'product' | null => {
    if (!imageEl.frameId) return null;

    // Find the frame this image belongs to
    const frame = elements.find((el: any) => el.id === imageEl.frameId && el.type === 'frame');
    if (!frame || !frame.name) return null;

    // Check frame name (case-insensitive)
    const frameName = frame.name.toLowerCase().trim();
    if (frameName === 'environment') return 'environment';
    if (frameName === 'product') return 'product';

    return null;
  }, []);

  // Handle onChange - detect new images and frame-based type updates
  const handleChange = useCallback((elements: any[], appState: any, files: any) => {
    if (!files || !elements) return;

    // Check if an image is currently selected
    const selectedElements = elements.filter((el: any) =>
      appState.selectedElementIds && appState.selectedElementIds[el.id] && !el.isDeleted
    );
    const selectedImage = selectedElements.find((el: any) => el.type === 'image');
    setSelectedImageElement(selectedImage || null);

    // Filter for image elements only
    const imageElements = elements.filter((el: any) => el.type === 'image' && !el.isDeleted);

    // Find new images (not in previousImageIds)
    const newImageElements = imageElements.filter(
      (el: any) => !previousImageIdsRef.current.has(el.id)
    );

    // Process each new image
    const successfullyProcessedIds: string[] = [];

    newImageElements.forEach((imageEl: any) => {
      // Check if this image already exists in metadata (programmatically added)
      const existingMetadata = checkImageExists(imageEl.id);
      if (existingMetadata) {
        previousImageIdsRef.current.add(imageEl.id);
        const frameType = getImageFrameType(imageEl, elements);
        frameMembershipRef.current.set(imageEl.id, frameType);
        successfullyProcessedIds.push(imageEl.id);
        return;
      }

      const fileData = files[imageEl.fileId];

      if (fileData && fileData.dataURL) {
        // Check if image is in a named frame
        const frameType = getImageFrameType(imageEl, elements);
        // Images outside frames are assets, not products
        const imageType = frameType || 'asset';

        // Create metadata for user-added image
        const metadata: ImageMetadata = {
          id: `${imageType}-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
          type: imageType,
          dataUrl: fileData.dataURL,
          highResDataUrl: fileData.dataURL, // Store high-res for API calls
          excalidrawFileId: imageEl.fileId,
          excalidrawElementId: imageEl.id,
          addedAt: Date.now(),
          width: imageEl.width || 0,
          height: imageEl.height || 0,
          isLocked: imageEl.locked || false,
        };

        // Notify parent
        onImageAdded(metadata);

        // Track initial frame membership
        frameMembershipRef.current.set(imageEl.id, frameType);

        // Mark as successfully processed
        successfullyProcessedIds.push(imageEl.id);
      }
    });

    // Only add successfully processed images to tracked set
    successfullyProcessedIds.forEach(id => {
      previousImageIdsRef.current.add(id);
    });

    // Check existing images for frame membership changes
    imageElements.forEach((imageEl: any) => {
      // Skip newly added images (already processed)
      if (successfullyProcessedIds.includes(imageEl.id)) return;

      // Skip programmatically added images (environment, generated)
      if (!previousImageIdsRef.current.has(imageEl.id)) return;

      const currentFrameType = getImageFrameType(imageEl, elements);
      const previousFrameType = frameMembershipRef.current.get(imageEl.id);

      // Check if frame membership changed
      if (currentFrameType !== previousFrameType) {
        // Update tracking
        frameMembershipRef.current.set(imageEl.id, currentFrameType);

        // Update metadata based on frame type
        if (currentFrameType === 'environment' || currentFrameType === 'product') {
          // Moved into Environment or Product frame
          onImageTypeUpdate(imageEl.id, currentFrameType);

        } else if (previousFrameType) {
          // Moved out of a named frame - becomes an asset
          onImageTypeUpdate(imageEl.id, 'asset');
        }
      }
    });

    // Detect removed images
    const currentImageIds = new Set(imageElements.map((el: any) => el.id));
    const removedIds: string[] = [];

    previousImageIdsRef.current.forEach((prevId) => {
      if (!currentImageIds.has(prevId)) {
        onImageRemoved(prevId);
        removedIds.push(prevId);
      }
    });

    // Remove deleted images from tracking
    removedIds.forEach(id => {
      previousImageIdsRef.current.delete(id);
      frameMembershipRef.current.delete(id);
    });

    // Simple approach: Keep environment and product images at the back for annotations
    // Get all environment and product images
    const envImages = imageElements.filter((el: any) => {
      const frameType = getImageFrameType(el, elements);
      return frameType === 'environment';
    });

    const productImages = imageElements.filter((el: any) => {
      const frameType = getImageFrameType(el, elements);
      return frameType === 'product';
    });

    // If there are environment or product images, ensure they're in the back
    if ((envImages.length > 0 || productImages.length > 0) && excalidrawAPIRef.current) {
      const allElements = excalidrawAPIRef.current.getSceneElements();

      // Separate elements by type
      const frames = allElements.filter((el: any) => el.type === 'frame');
      const envImageEls = allElements.filter((el: any) =>
        envImages.some((img: any) => img.id === el.id)
      );
      const productImageEls = allElements.filter((el: any) =>
        productImages.some((img: any) => img.id === el.id)
      );
      const others = allElements.filter((el: any) =>
        el.type !== 'frame' &&
        !envImages.some((img: any) => img.id === el.id) &&
        !productImages.some((img: any) => img.id === el.id)
      );

      // Check if images are already in the correct position
      // (frames, then env images, then product images, then everything else)
      const expectedEnvStart = frames.length;
      const expectedProductStart = frames.length + envImageEls.length;

      const isCorrectOrder =
        (envImageEls.length === 0 || allElements.indexOf(envImageEls[0]) === expectedEnvStart) &&
        (productImageEls.length === 0 || allElements.indexOf(productImageEls[0]) === expectedProductStart);

      if (!isCorrectOrder) {
        // Reorder: frames first, then env images, then product images, then everything else
        excalidrawAPIRef.current.updateScene({
          elements: [...frames, ...envImageEls, ...productImageEls, ...others],
        });
      }
    }
  }, [onImageAdded, onImageRemoved, onImageTypeUpdate, checkImageExists, getImageFrameType]);

  // Handle create asset
  const handleCreateAsset = useCallback(async (prompt: string) => {
    setIsCreatingAsset(true);
    try {
      const response = await fetch('/api/generate-asset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          model: selectedModel,
          ...(selectedModel === "gemini-3-pro-image-preview" && { quality: selectedQuality }),
          aspectRatio: selectedAspectRatio,
        }),
      });

      const data = await response.json();

      if (data.status === 'success' && data.imageUrl) {
        // Add asset to canvas in the Generated frame
        const img = new Image();
        img.src = data.imageUrl;
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
        });

        const MAX_SIZE = 1024;
        let displayWidth = img.width;
        let displayHeight = img.height;

        if (img.width > MAX_SIZE || img.height > MAX_SIZE) {
          const scale = Math.min(MAX_SIZE / img.width, MAX_SIZE / img.height);
          displayWidth = Math.floor(img.width * scale);
          displayHeight = Math.floor(img.height * scale);
        }

        const fileId = `asset-${Date.now()}`;
        const blob = await (await fetch(data.imageUrl)).blob();

        await excalidrawAPIRef.current.addFiles([{
          id: fileId,
          dataURL: data.imageUrl,
          mimeType: blob.type,
          created: Date.now(),
        }]);

        const currentElements = excalidrawAPIRef.current.getSceneElements();
        const generatedFrame = currentElements.find((el: any) => el.id === 'frame-generated-static');

        let xPosition = 0;
        let yPosition = 0;
        let targetFrameId = null;

        if (generatedFrame) {
          // Frame dimensions
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
        } else {
          // Fallback: position to the right of existing content
          let maxX = 0;
          currentElements.forEach((el: any) => {
            if (el.type === 'image' && !el.isDeleted) {
              const rightEdge = el.x + el.width;
              if (rightEdge > maxX) maxX = rightEdge;
            }
          });
          xPosition = maxX + 100;
        }

        const imageElement = {
          type: "image",
          version: 1,
          versionNonce: Math.floor(Math.random() * 1000000),
          isDeleted: false,
          id: `asset-element-${Date.now()}`,
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

        excalidrawAPIRef.current.updateScene({
          elements: [...currentElements, imageElement],
        });

        // Scroll to show the new image
        setTimeout(() => {
          if (excalidrawAPIRef.current) {
            excalidrawAPIRef.current.scrollToContent([imageElement], {
              fitToContent: false,
              animate: true,
            });
          }
        }, 100);

        setShowCreateAssetDialog(false);
      } else {
        throw new Error(data.message || 'Asset creation failed');
      }
    } catch (error: any) {
      alert(`Failed to create asset: ${error.message}`);
    } finally {
      setIsCreatingAsset(false);
    }
  }, [selectedModel, selectedQuality, selectedAspectRatio]);

  // Custom top-right UI with icon buttons
  const renderTopRightUI = useCallback(() => {
    const isProModel = selectedModel === 'gemini-3-pro-image-preview';
    const hasModelSelected = selectedModel !== '';

    return (
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        {/* Model Selector */}
        <select
          value={selectedModel}
          onChange={(e) => onModelChange(e.target.value)}
          style={{
            padding: '0.5rem',
            border: '1px solid #e5e7eb',
            borderRadius: '0.375rem',
            fontSize: '14px',
            fontWeight: '500',
            backgroundColor: 'white',
            cursor: 'pointer',
          }}
          title="AI Model"
        >
          <option value="">Choose model...</option>
          <option value="gemini-2.5-flash-image">Gemini 2.5 Flash</option>
          <option value="gemini-3-pro-image-preview">Gemini 3 Pro</option>
        </select>

        {/* Quality Selector (only for Pro model) */}
        <select
          value={selectedQuality}
          onChange={(e) => onQualityChange(e.target.value)}
          disabled={!isProModel}
          style={{
            padding: '0.5rem',
            border: '1px solid #e5e7eb',
            borderRadius: '0.375rem',
            fontSize: '14px',
            fontWeight: '500',
            backgroundColor: !isProModel ? '#f3f4f6' : 'white',
            cursor: !isProModel ? 'not-allowed' : 'pointer',
            opacity: !isProModel ? 0.6 : 1,
          }}
          title={!isProModel ? "Quality selection only available for Pro model" : "Image Quality"}
        >
          <option value="">Choose quality...</option>
          <option value="1K">1K (1024px)</option>
          <option value="2K">2K (2048px)</option>
          <option value="4K">4K (4096px)</option>
        </select>

        {/* Aspect Ratio Selector */}
        <select
          value={selectedAspectRatio}
          onChange={(e) => onAspectRatioChange(e.target.value)}
          disabled={!hasModelSelected}
          style={{
            padding: '0.5rem',
            border: '1px solid #e5e7eb',
            borderRadius: '0.375rem',
            fontSize: '14px',
            fontWeight: '500',
            backgroundColor: !hasModelSelected ? '#f3f4f6' : 'white',
            cursor: !hasModelSelected ? 'not-allowed' : 'pointer',
            opacity: !hasModelSelected ? 0.6 : 1,
          }}
          title="Aspect Ratio"
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

        {/* Generate Image Button (Sparkles Icon) */}
        <button
          onClick={onGenerateImage}
          disabled={!hasModelSelected || isGenerating || !canGenerateImage}
          title={!hasModelSelected ? "Please select a model first" : !canGenerateImage ? "Add environment (in Environment frame) and product images (in Product frame) to generate" : "Generate Image"}
          style={{
            background: (!hasModelSelected || isGenerating || !canGenerateImage) ? '#9ca3af' : '#3b82f6',
            border: 'none',
            color: '#fff',
            padding: '0.5rem',
            borderRadius: '0.375rem',
            cursor: (!hasModelSelected || isGenerating || !canGenerateImage) ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '36px',
            height: '36px',
            opacity: (!hasModelSelected || !canGenerateImage) ? 0.5 : 1,
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2L15 8.5L21 10L15 13.5L12 20L9 13.5L3 10L9 8.5L12 2Z" />
          </svg>
        </button>

        {/* Generate Environment Button (Image Icon) */}
        <button
          onClick={onGenerateEnvironment}
          disabled={!hasModelSelected}
          title={!hasModelSelected ? "Please select a model first" : "Generate Environment"}
          style={{
            background: !hasModelSelected ? '#9ca3af' : '#8b5cf6',
            border: 'none',
            color: '#fff',
            padding: '0.5rem',
            borderRadius: '0.375rem',
            cursor: !hasModelSelected ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '36px',
            height: '36px',
            opacity: !hasModelSelected ? 0.5 : 1,
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <path d="M21 15l-5-5L5 21"/>
          </svg>
        </button>

        {/* Create Asset Button (Plus Icon) */}
        <button
          onClick={() => setShowCreateAssetDialog(true)}
          disabled={!hasModelSelected}
          title={!hasModelSelected ? "Please select a model first" : "Create Asset from Prompt"}
          style={{
            background: !hasModelSelected ? '#9ca3af' : '#10b981',
            border: 'none',
            color: '#fff',
            padding: '0.5rem',
            borderRadius: '0.375rem',
            cursor: !hasModelSelected ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '36px',
            height: '36px',
            opacity: !hasModelSelected ? 0.5 : 1,
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14"/>
          </svg>
        </button>
      </div>
    );
  }, [onGenerateImage, onGenerateEnvironment, isGenerating, canGenerateImage, selectedModel, onModelChange, selectedQuality, onQualityChange, selectedAspectRatio, onAspectRatioChange]);

  // Loading state
  if (!Excalidraw) {
    return (
      <div className="h-full flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-xl font-semibold text-gray-900">Loading canvas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full relative">
      <Excalidraw
        excalidrawAPI={onExcalidrawMount}
        initialData={{
          appState: {
            viewBackgroundColor: "#ffffff",
            zoom: { value: 0.1 },
            currentItemStrokeColor: "#e03131", // Red color for arrows/pencil
            currentItemStrokeWidth: 4, // Thickest stroke
            currentItemFontSize: 20, // Default text size
          },
        }}
        UIOptions={{
          canvasActions: {
            loadScene: false,
            export: false,
            saveAsImage: true,
            theme: false,
            clearCanvas: true,
            canChangeBackgroundColor: false,
          },
          tools: {
            image: true,
            text: false,
            rectangle: false,
            ellipse: false,
            arrow: true,
            pencil: true,
          },
          elementActions: {
            changeImage: true,
            duplicate: false,
            sendToBack: true,
            bringToFront: true,
          },
        }}
        renderTopRightUI={renderTopRightUI}
        onChange={handleChange}
      >
      </Excalidraw>

      {/* Floating Image Actions Menu */}
      {selectedImageElement && (
        <div
          className="absolute bg-white rounded-lg shadow-lg border border-gray-200 p-2 flex gap-2 z-50"
          style={{
            top: '80px',
            left: '50%',
            transform: 'translateX(-50%)',
          }}
        >
          <button
            onClick={handleSaveToDisk}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
          >
            Save to Disk
          </button>
          <button
            onClick={() => {
              setIterateImageId(selectedImageElement.id);
              setShowIterateDialog(true);
            }}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium text-sm"
          >
            Improve Image
          </button>
        </div>
      )}

      {/* Iterate Prompt Dialog */}
      <IteratePromptDialog
        isOpen={showIterateDialog}
        onSubmit={handleIterateSubmit}
        onClose={() => {
          setShowIterateDialog(false);
          setIterateImageId(null);
        }}
        isGenerating={isIterating}
      />

      {/* Create Asset Dialog */}
      {showCreateAssetDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-bold text-gray-900">
                  Create Asset with AI
                </h2>
                <button
                  onClick={() => setShowCreateAssetDialog(false)}
                  disabled={isCreatingAsset}
                  className="text-gray-400 hover:text-gray-600 text-2xl leading-none disabled:opacity-50"
                >
                  ×
                </button>
              </div>

              <p className="text-gray-600 mb-4">
                Describe what you want to create (product, object, character, etc.):
              </p>

              <textarea
                id="asset-prompt"
                placeholder="Example: A red sports car, side view, photorealistic..."
                className="w-full h-32 p-3 border border-gray-300 rounded-lg resize-none text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-transparent mb-4"
                disabled={isCreatingAsset}
              />

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowCreateAssetDialog(false)}
                  disabled={isCreatingAsset}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const textarea = document.getElementById('asset-prompt') as HTMLTextAreaElement;
                    const prompt = textarea?.value.trim();
                    if (prompt) handleCreateAsset(prompt);
                  }}
                  disabled={isCreatingAsset}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {isCreatingAsset ? "Creating..." : "Create Asset"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
