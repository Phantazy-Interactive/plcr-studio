import { useCallback } from 'react';
import type { ImageMetadata } from '@/types/canvas';

interface UseGenerationManagerProps {
  excalidrawAPI: any;
  getEnvironmentImage: () => ImageMetadata | undefined;
  getProductImages: () => ImageMetadata[];
}

export function useGenerationManager({
  excalidrawAPI,
  getEnvironmentImage,
  getProductImages,
}: UseGenerationManagerProps) {
  // Export canvas to sketch image blob
  const exportCanvasToSketch = useCallback(async (): Promise<Blob | null> => {
    if (!excalidrawAPI) {
      return null;
    }

    try {
      // Get current elements and app state
      const elements = excalidrawAPI.getSceneElements();
      const appState = excalidrawAPI.getAppState();

      // Calculate bounds of all elements to capture entire canvas
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

      elements.forEach((el: any) => {
        if (el.isDeleted) return;
        minX = Math.min(minX, el.x);
        minY = Math.min(minY, el.y);
        maxX = Math.max(maxX, el.x + el.width);
        maxY = Math.max(maxY, el.y + el.height);
      });

      // Add padding
      const padding = 50;
      const _width = Math.ceil(maxX - minX + padding * 2);
      const _height = Math.ceil(maxY - minY + padding * 2);

      // Import exportToBlob dynamically
      const { exportToBlob } = await import('@excalidraw/excalidraw');

      // Export to blob with calculated dimensions
      const blob = await exportToBlob({
        elements,
        appState: {
          ...appState,
          exportBackground: true,
          exportWithDarkMode: false,
        },
        files: excalidrawAPI.getFiles(),
      });

      return blob;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_error) {
      return null;
    }
  }, [excalidrawAPI]);

  // Convert blob to data URL
  const blobToDataURL = useCallback((blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }, []);

  // Resize image to reduce size (for sketch images)
  const resizeImage = useCallback(async (dataUrl: string, maxDimension: number): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        // Calculate new dimensions
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.floor((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.floor((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        // Create canvas and resize
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Convert to JPEG with quality 0.8 to reduce size
        const resizedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
        resolve(resizedDataUrl);
      };
      img.onerror = reject;
      img.src = dataUrl;
    });
  }, []);

  // Generate image using the API
  const generateImage = useCallback(async (model?: string, quality?: string, aspectRatio?: string): Promise<string | null> => {
    try {
      const sketchBlob = await exportCanvasToSketch();
      if (!sketchBlob) {
        throw new Error('Failed to export canvas to sketch');
      }

      const environmentImage = getEnvironmentImage();
      if (!environmentImage) {
        throw new Error('No environment image found. Please add an environment first.');
      }

      const productImages = getProductImages();
      if (productImages.length === 0) {
        throw new Error('No product images found. Please add at least one product image.');
      }

      let sketchDataUrl = await blobToDataURL(sketchBlob);
      sketchDataUrl = await resizeImage(sketchDataUrl, 1024);

      const resizedEnvironmentUrl = await resizeImage(environmentImage.highResDataUrl, 2048);

      const resizedProductUrls = await Promise.all(
        productImages.map(product => resizeImage(product.highResDataUrl, 2048))
      );

      const payload = {
        sketchImage: sketchDataUrl,
        environmentImage: resizedEnvironmentUrl,
        productImages: resizedProductUrls,
        prompt: "Composite the product(s) into the environment scene, matching lighting, perspective, and shadows. Make it look photorealistic.",
        isFirstIteration: true,
        model: model || "gemini-2.5-flash-image",
        quality: quality || undefined,
        aspectRatio: aspectRatio || undefined,
      };

      const response = await fetch('/api/generate-combination', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.status === 'success') {
        if (!data.generatedImage) {
          throw new Error('API returned success but no generatedImage');
        }

        return data.generatedImage;
      } else {
        throw new Error(data.message || 'Generation failed');
      }
    } catch (error: any) {
      throw error;
    }
  }, [
    getEnvironmentImage,
    getProductImages,
    exportCanvasToSketch,
    blobToDataURL,
    resizeImage,
  ]);

  return {
    generateImage,
    exportCanvasToSketch,
  };
}
