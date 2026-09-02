export interface ViewportTransform {
  x: number;
  y: number;
  scale: number;
}

export interface Size {
  width: number;
  height: number;
}

export const MIN_ZOOM = 0.2;
export const MAX_ZOOM = 3;
export const ZOOM_STEP = 1.2;

export function clampScale(scale: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, scale));
}

/**
 * Scales the graph down until it fits the viewport and centres it. The graph is never enlarged past
 * its designed size, so a small model keeps its intended proportions instead of filling the panel.
 */
export function fitTransform(content: Size, viewport: Size, padding = 0): ViewportTransform {
  if (content.width <= 0 || content.height <= 0 || viewport.width <= 0 || viewport.height <= 0) {
    return { x: 0, y: 0, scale: 1 };
  }

  const available = {
    width: Math.max(1, viewport.width - padding * 2),
    height: Math.max(1, viewport.height - padding * 2),
  };
  const scale = clampScale(Math.min(1, available.width / content.width, available.height / content.height));

  return {
    x: (viewport.width - content.width * scale) / 2,
    y: (viewport.height - content.height * scale) / 2,
    scale,
  };
}

/**
 * Zooms by `factor` while keeping the content point under (pointerX, pointerY) pinned, so the graph
 * grows towards the cursor rather than towards the corner of the panel.
 */
export function zoomAt(
  transform: ViewportTransform,
  factor: number,
  pointerX: number,
  pointerY: number
): ViewportTransform {
  const scale = clampScale(transform.scale * factor);
  const ratio = scale / transform.scale;

  return {
    x: pointerX - (pointerX - transform.x) * ratio,
    y: pointerY - (pointerY - transform.y) * ratio,
    scale,
  };
}

export function panBy(transform: ViewportTransform, deltaX: number, deltaY: number): ViewportTransform {
  return { ...transform, x: transform.x + deltaX, y: transform.y + deltaY };
}

/**
 * Stops the graph being dragged out of sight. An axis that is smaller than the viewport stays
 * centred; a larger one may be panned but not past its own edges.
 */
export function clampTransform(
  transform: ViewportTransform,
  content: Size,
  viewport: Size
): ViewportTransform {
  return {
    scale: transform.scale,
    x: clampAxis(transform.x, content.width * transform.scale, viewport.width),
    y: clampAxis(transform.y, content.height * transform.scale, viewport.height),
  };
}

function clampAxis(offset: number, scaledContent: number, viewport: number): number {
  if (scaledContent <= viewport) {
    return (viewport - scaledContent) / 2;
  }

  return Math.min(0, Math.max(viewport - scaledContent, offset));
}

/**
 * True when the graph still has somewhere to go on this axis. The wheel handler uses this to decide
 * whether to consume the event or let the surrounding page scroll as usual.
 */
export function canPan(
  transform: ViewportTransform,
  content: Size,
  viewport: Size,
  deltaX: number,
  deltaY: number
): boolean {
  const clamped = clampTransform(panBy(transform, -deltaX, -deltaY), content, viewport);
  return clamped.x !== transform.x || clamped.y !== transform.y;
}
