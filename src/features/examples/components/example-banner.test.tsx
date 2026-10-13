import { fireEvent, render, screen } from "@testing-library/react";
import { ExampleBanner } from "./example-banner";

const example = {
  title: "Stack: balanced brackets",
  topic: "Collections",
  description: "Push every opening bracket; pop when its partner closes.",
} as const;

/** jsdom has no layout, so fake whether the one-line description is cut off. */
function mockOverflow(overflowing: boolean) {
  vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockReturnValue(overflowing ? 400 : 100);
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(200);
}

beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("ExampleBanner", () => {
  it("shows the title, topic and full description text", () => {
    mockOverflow(false);
    render(<ExampleBanner example={example} />);
    expect(screen.getByRole("heading", { name: example.title })).toBeInTheDocument();
    expect(screen.getByText("Collections")).toBeInTheDocument();
    expect(screen.getByText(example.description)).toBeInTheDocument();
  });

  it("hides the toggle when the description fits on one line", () => {
    mockOverflow(false);
    render(<ExampleBanner example={example} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("expands and collapses a description that is cut off", () => {
    mockOverflow(true);
    render(<ExampleBanner example={example} />);
    const toggle = screen.getByRole("button", { name: "More" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByText(example.description)).toHaveClass("truncate");

    fireEvent.click(toggle);
    expect(screen.getByRole("button", { name: "Less" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText(example.description)).not.toHaveClass("truncate");

    fireEvent.click(screen.getByRole("button", { name: "Less" }));
    expect(screen.getByRole("button", { name: "More" })).toBeInTheDocument();
  });
});
