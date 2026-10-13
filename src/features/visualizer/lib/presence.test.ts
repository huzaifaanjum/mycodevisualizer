import { withExiting } from "./presence";

const keys = (current: string[], previous: string[]) =>
  withExiting(current, previous, (s) => s).map((p) => (p.exiting ? `-${p.key}` : p.key));

describe("withExiting", () => {
  it("returns current items unchanged when nothing left", () => {
    expect(keys(["a", "b"], ["a"])).toEqual(["a", "b"]);
  });

  it("keeps a removed item at its previous position", () => {
    expect(keys(["a", "c"], ["a", "b", "c"])).toEqual(["a", "-b", "c"]);
  });

  it("keeps a popped top item first", () => {
    expect(keys(["main"], ["helper", "main"])).toEqual(["-helper", "main"]);
  });

  it("appends removed trailing items", () => {
    expect(keys([], ["x", "y"])).toEqual(["-x", "-y"]);
  });
});
