import { MAX_SCALE, MIN_SCALE, panToReveal, zoomAt } from "./pan-zoom";

describe("zoomAt", () => {
  it("keeps the point under the cursor still", () => {
    const view = { x: 10, y: 20, scale: 1 };
    const next = zoomAt(view, 2, 110, 120);
    // The content point under (110, 120) was (100, 100); it must still map to (110, 120).
    expect(next.x + 100 * next.scale).toBe(110);
    expect(next.y + 100 * next.scale).toBe(120);
  });

  it("stays within the zoom limits", () => {
    expect(zoomAt({ x: 0, y: 0, scale: 1 }, 100, 0, 0).scale).toBe(MAX_SCALE);
    expect(zoomAt({ x: 0, y: 0, scale: 1 }, 0.01, 0, 0).scale).toBe(MIN_SCALE);
  });
});

describe("panToReveal", () => {
  const viewport = { width: 500, height: 400 };

  it("does nothing when the box is visible", () => {
    expect(panToReveal({ left: 100, top: 100, width: 50, height: 50 }, viewport)).toEqual({ dx: 0, dy: 0 });
  });

  it("pans just enough to bring an off-screen box into view", () => {
    expect(panToReveal({ left: 600, top: -80, width: 100, height: 40 }, viewport)).toEqual({ dx: -224, dy: 104 });
  });
});
