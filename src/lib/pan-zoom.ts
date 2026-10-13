/** Pan and zoom of a canvas: content point (cx, cy) shows at screen point (x + cx·scale, y + cy·scale). */
export interface View {
  x: number;
  y: number;
  scale: number;
}

export interface Size {
  width: number;
  height: number;
}

export const MIN_SCALE = 0.25;
export const MAX_SCALE = 3;

export const clampScale = (scale: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));

/** Zooms to `scale`, keeping the canvas point (px, py) still under the cursor. */
export function zoomAt(view: View, scale: number, px: number, py: number): View {
  const next = clampScale(scale);
  const k = next / view.scale;
  return { scale: next, x: px - (px - view.x) * k, y: py - (py - view.y) * k };
}

/**
 * Centers the content in the viewport, shrinking it to fit if needed (never enlarging past 100%).
 * `padding` keeps a margin around the content.
 */
export function fitView(content: Size, viewport: Size, padding = 16): View {
  if (content.width <= 0 || content.height <= 0) return { x: padding, y: padding, scale: 1 };
  const scale = clampScale(
    Math.min(1, (viewport.width - padding * 2) / content.width, (viewport.height - padding * 2) / content.height),
  );
  return {
    scale,
    x: Math.max(padding, (viewport.width - content.width * scale) / 2),
    y: Math.max(padding, (viewport.height - content.height * scale) / 2),
  };
}

/**
 * The smallest pan that brings a box (in screen coordinates relative to the viewport) fully into
 * view with a margin; zero when it is already visible.
 */
export function panToReveal(box: { left: number; top: number; width: number; height: number }, viewport: Size, margin = 24): { dx: number; dy: number } {
  const delta = (start: number, size: number, limit: number) => {
    if (start < margin) return margin - start;
    if (start + size > limit - margin) return Math.max(margin - start, limit - margin - (start + size));
    return 0;
  };
  return { dx: delta(box.left, box.width, viewport.width), dy: delta(box.top, box.height, viewport.height) };
}
