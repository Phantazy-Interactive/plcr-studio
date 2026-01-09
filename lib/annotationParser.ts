/**
 * Semantic annotation parser for Excalidraw elements
 * Extracts meaning from arrows, text, circles, and other annotations
 */

import { ExcalidrawElement } from "@excalidraw/excalidraw/types/element/types";
import {
  SemanticAnnotation,
  AnnotationRole,
  AnnotationImageRelation,
  SpatialRelation,
  EnhancedImageMetadata
} from "@/types/semanticPrompt";

// ============================================================================
// Type Guards
// ============================================================================

function isArrowElement(element: ExcalidrawElement): element is ExcalidrawElement & { type: 'arrow' } {
  return element.type === 'arrow';
}

function isTextElement(element: ExcalidrawElement): element is ExcalidrawElement & { type: 'text'; text: string } {
  return element.type === 'text';
}

function isEllipseElement(element: ExcalidrawElement): element is ExcalidrawElement & { type: 'ellipse' } {
  return element.type === 'ellipse';
}

function isRectangleElement(element: ExcalidrawElement): element is ExcalidrawElement & { type: 'rectangle' } {
  return element.type === 'rectangle';
}

function isImageElement(element: ExcalidrawElement): element is ExcalidrawElement & { type: 'image' } {
  return element.type === 'image';
}

// ============================================================================
// Annotation Classification
// ============================================================================

/**
 * Classify annotation role based on element properties and text content
 */
export function classifyAnnotationRole(element: ExcalidrawElement): {
  role: AnnotationRole;
  confidence: number;
} {
  if (isArrowElement(element)) {
    return { role: 'placement_indicator', confidence: 0.9 };
  }

  if (isEllipseElement(element)) {
    return { role: 'emphasis', confidence: 0.85 };
  }

  if (isTextElement(element)) {
    const text = element.text.toLowerCase();

    // Instruction patterns
    const instructionPatterns = [
      /place|put|position|move/,
      /should|must|need/,
      /here|there/,
      /center|left|right|top|bottom/,
    ];
    if (instructionPatterns.some(pattern => pattern.test(text))) {
      return { role: 'instruction', confidence: 0.9 };
    }

    // Measurement patterns
    const measurementPatterns = [
      /\d+\s*(cm|mm|m|in|ft|px)/,
      /size|dimension|scale/,
      /x\d+|\d+x\d+/,
    ];
    if (measurementPatterns.some(pattern => pattern.test(text))) {
      return { role: 'measurement', confidence: 0.85 };
    }

    // Constraint patterns
    const constraintPatterns = [
      /not|don't|avoid|never/,
      /within|inside|outside/,
      /limit|boundary|edge/,
    ];
    if (constraintPatterns.some(pattern => pattern.test(text))) {
      return { role: 'constraint', confidence: 0.8 };
    }

    // Reference pattern (generic labels)
    if (text.length < 20) {
      return { role: 'reference', confidence: 0.6 };
    }

    // Default for longer text
    return { role: 'instruction', confidence: 0.5 };
  }

  if (isRectangleElement(element)) {
    // Rectangles could be boundaries or emphasis
    const area = element.width * element.height;
    if (area > 100000) { // Large rectangle
      return { role: 'constraint', confidence: 0.7 };
    }
    return { role: 'emphasis', confidence: 0.6 };
  }

  return { role: 'unknown', confidence: 0.3 };
}

/**
 * Parse Excalidraw elements into semantic annotations
 */
export function parseAnnotations(
  elements: ExcalidrawElement[],
  images: EnhancedImageMetadata[]
): SemanticAnnotation[] {
  const annotations: SemanticAnnotation[] = [];

  // Filter out image elements and frames (we process those separately)
  const annotationElements = elements.filter(
    el => !isImageElement(el) && el.type !== 'frame'
  );

  for (const element of annotationElements) {
    const { role, confidence } = classifyAnnotationRole(element);

    const annotation: SemanticAnnotation = {
      id: element.id,
      type: element.type,
      role,
      position: {
        x: element.x + element.width / 2,
        y: element.y + element.height / 2,
      },
      confidence,
      metadata: {
        color: element.strokeColor,
        size: Math.sqrt(element.width ** 2 + element.height ** 2),
      },
    };

    // Extract text content
    if (isTextElement(element)) {
      annotation.content = element.text;
    }

    // Check if annotation is bound to an image
    const boundImageId = findBoundImage(element, images, elements);
    if (boundImageId) {
      annotation.targetImageId = boundImageId;
    }

    annotations.push(annotation);
  }

  return annotations;
}

// ============================================================================
// Spatial Relationship Analysis
// ============================================================================

/**
 * Find which image an element is bound to or points to
 */
function findBoundImage(
  element: ExcalidrawElement,
  images: EnhancedImageMetadata[],
  allElements: ExcalidrawElement[]
): string | undefined {
  // Check if element has binding information
  if ('boundElements' in element && element.boundElements) {
    for (const binding of element.boundElements) {
      if (binding && typeof binding === 'object' && 'id' in binding) {
        const boundId = binding.id;
        const image = images.find(img => img.excalidrawElementId === boundId);
        if (image) {
          return image.id;
        }
      }
    }
  }

  // For arrows, check start and end bindings
  if (isArrowElement(element)) {
    const startBinding = (element as any).startBinding;
    const endBinding = (element as any).endBinding;

    for (const binding of [startBinding, endBinding]) {
      if (binding?.elementId) {
        const image = images.find(img => img.excalidrawElementId === binding.elementId);
        if (image) {
          return image.id;
        }
      }
    }
  }

  // Fallback: find nearest image by spatial proximity
  return findNearestImage(element, images, allElements);
}

/**
 * Find nearest image to an element
 */
function findNearestImage(
  element: ExcalidrawElement,
  images: EnhancedImageMetadata[],
  allElements: ExcalidrawElement[]
): string | undefined {
  const elementCenter = {
    x: element.x + element.width / 2,
    y: element.y + element.height / 2,
  };

  let nearestImage: EnhancedImageMetadata | undefined;
  let minDistance = Infinity;
  const maxDistance = 500; // Only consider images within 500px

  for (const image of images) {
    const imageElement = allElements.find(el => el.id === image.excalidrawElementId);
    if (!imageElement) continue;

    const imageCenter = {
      x: imageElement.x + imageElement.width / 2,
      y: imageElement.y + imageElement.height / 2,
    };

    const distance = Math.sqrt(
      (elementCenter.x - imageCenter.x) ** 2 +
      (elementCenter.y - imageCenter.y) ** 2
    );

    if (distance < minDistance && distance < maxDistance) {
      minDistance = distance;
      nearestImage = image;
    }
  }

  return nearestImage?.id;
}

/**
 * Determine spatial relationship between annotation and image
 */
export function determineSpatialRelation(
  annotation: SemanticAnnotation,
  imageMetadata: EnhancedImageMetadata,
  annotationElement: ExcalidrawElement,
  imageElement: ExcalidrawElement
): { relation: SpatialRelation; confidence: number } {
  // For arrows, check if it points to the image
  if (annotation.type === 'arrow') {
    const arrowEnd = {
      x: annotationElement.x + annotationElement.width,
      y: annotationElement.y + annotationElement.height,
    };

    const isPointingTo = isPointInRect(
      arrowEnd,
      {
        x: imageElement.x,
        y: imageElement.y,
        width: imageElement.width,
        height: imageElement.height,
      }
    );

    if (isPointingTo) {
      return { relation: 'points_to', confidence: 0.95 };
    }
  }

  // For ellipses/circles, check if it encircles the image
  if (annotation.type === 'ellipse') {
    const annotationCenter = annotation.position;
    const imageCenter = {
      x: imageElement.x + imageElement.width / 2,
      y: imageElement.y + imageElement.height / 2,
    };

    const distance = Math.sqrt(
      (annotationCenter.x - imageCenter.x) ** 2 +
      (annotationCenter.y - imageCenter.y) ** 2
    );

    const annotationRadius = Math.max(annotationElement.width, annotationElement.height) / 2;
    const imageRadius = Math.max(imageElement.width, imageElement.height) / 2;

    if (distance < annotationRadius && imageRadius < annotationRadius) {
      return { relation: 'encircles', confidence: 0.9 };
    }
  }

  // Check for overlap
  const overlap = calculateOverlap(annotationElement, imageElement);
  if (overlap > 0.1) {
    return { relation: 'overlaps', confidence: 0.8 };
  }

  // Determine directional relationship
  const dx = annotation.position.x - (imageElement.x + imageElement.width / 2);
  const dy = annotation.position.y - (imageElement.y + imageElement.height / 2);

  const distance = Math.sqrt(dx ** 2 + dy ** 2);

  if (distance < 200) {
    // Close enough to be "near"
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);

    if (angle >= -45 && angle < 45) {
      return { relation: 'right_of', confidence: 0.7 };
    } else if (angle >= 45 && angle < 135) {
      return { relation: 'below', confidence: 0.7 };
    } else if (angle >= 135 || angle < -135) {
      return { relation: 'left_of', confidence: 0.7 };
    } else {
      return { relation: 'above', confidence: 0.7 };
    }
  }

  return { relation: 'near', confidence: 0.5 };
}

/**
 * Analyze relationships between all annotations and images
 */
export function analyzeAnnotationRelations(
  annotations: SemanticAnnotation[],
  images: EnhancedImageMetadata[],
  elements: ExcalidrawElement[]
): AnnotationImageRelation[] {
  const relations: AnnotationImageRelation[] = [];

  for (const annotation of annotations) {
    // If annotation already has a target image, use that
    if (annotation.targetImageId) {
      const image = images.find(img => img.id === annotation.targetImageId);
      if (!image) continue;

      const annotationElement = elements.find(el => el.id === annotation.id);
      const imageElement = elements.find(el => el.id === image.excalidrawElementId);

      if (!annotationElement || !imageElement) continue;

      const { relation, confidence } = determineSpatialRelation(
        annotation,
        image,
        annotationElement,
        imageElement
      );

      relations.push({
        annotationId: annotation.id,
        imageId: image.id,
        relation,
        confidence,
      });
    } else {
      // Find all nearby images and create relations
      const annotationElement = elements.find(el => el.id === annotation.id);
      if (!annotationElement) continue;

      for (const image of images) {
        const imageElement = elements.find(el => el.id === image.excalidrawElementId);
        if (!imageElement) continue;

        const { relation, confidence } = determineSpatialRelation(
          annotation,
          image,
          annotationElement,
          imageElement
        );

        if (confidence > 0.5) {
          relations.push({
            annotationId: annotation.id,
            imageId: image.id,
            relation,
            confidence,
          });
        }
      }
    }
  }

  return relations;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if a point is inside a rectangle
 */
function isPointInRect(
  point: { x: number; y: number },
  rect: { x: number; y: number; width: number; height: number }
): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

/**
 * Calculate overlap ratio between two elements
 */
function calculateOverlap(el1: ExcalidrawElement, el2: ExcalidrawElement): number {
  const x1 = Math.max(el1.x, el2.x);
  const y1 = Math.max(el1.y, el2.y);
  const x2 = Math.min(el1.x + el1.width, el2.x + el2.width);
  const y2 = Math.min(el1.y + el1.height, el2.y + el2.height);

  if (x2 <= x1 || y2 <= y1) {
    return 0; // No overlap
  }

  const overlapArea = (x2 - x1) * (y2 - y1);
  const el1Area = el1.width * el1.height;
  const el2Area = el2.width * el2.height;

  return overlapArea / Math.min(el1Area, el2Area);
}

// ============================================================================
// High-Level API
// ============================================================================

/**
 * Extract semantic meaning from canvas annotations
 */
export function extractSemanticAnnotations(
  elements: ExcalidrawElement[],
  images: EnhancedImageMetadata[]
): {
  annotations: SemanticAnnotation[];
  relations: AnnotationImageRelation[];
} {
  const annotations = parseAnnotations(elements, images);
  const relations = analyzeAnnotationRelations(annotations, images, elements);

  return { annotations, relations };
}

/**
 * Generate natural language description of annotations
 */
export function annotationsToText(
  annotations: SemanticAnnotation[],
  relations: AnnotationImageRelation[]
): string {
  const descriptions: string[] = [];

  for (const annotation of annotations) {
    const relatedRelations = relations.filter(r => r.annotationId === annotation.id);

    if (annotation.role === 'instruction' && annotation.content) {
      descriptions.push(`User instruction: "${annotation.content}"`);
    } else if (annotation.role === 'placement_indicator' && relatedRelations.length > 0) {
      const relation = relatedRelations[0];
      descriptions.push(`Placement arrow ${relation.relation.replace(/_/g, ' ')} product`);
    } else if (annotation.role === 'emphasis' && relatedRelations.length > 0) {
      descriptions.push(`Area of emphasis marked on image`);
    } else if (annotation.role === 'measurement' && annotation.content) {
      descriptions.push(`Measurement note: "${annotation.content}"`);
    } else if (annotation.role === 'constraint' && annotation.content) {
      descriptions.push(`Constraint: "${annotation.content}"`);
    }
  }

  return descriptions.join('\n');
}
