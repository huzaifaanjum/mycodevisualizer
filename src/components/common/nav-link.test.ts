import { isActivePath } from "./nav-link";

describe("isActivePath", () => {
  it("matches the route and pages nested under it", () => {
    expect(isActivePath("/examples", "/examples")).toBe(true);
    expect(isActivePath("/examples/loops", "/examples")).toBe(true);
  });

  it("does not match siblings that share a prefix or other routes", () => {
    expect(isActivePath("/examples-old", "/examples")).toBe(false);
    expect(isActivePath("/about", "/examples")).toBe(false);
  });

  it("only matches home exactly", () => {
    expect(isActivePath("/", "/")).toBe(true);
    expect(isActivePath("/about", "/")).toBe(false);
  });
});
