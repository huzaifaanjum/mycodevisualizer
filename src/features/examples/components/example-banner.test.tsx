import { fireEvent, render, screen } from "@testing-library/react";
import { ExampleBanner } from "./example-banner";

const example = {
  title: "Stack: balanced brackets",
  topic: "Collections",
  description: "Push every opening bracket; pop when its partner closes.",
} as const;

describe("ExampleBanner", () => {
  it("shows the title and topic, with the description collapsed", () => {
    render(<ExampleBanner example={example} />);
    expect(screen.getByRole("heading", { name: example.title })).toBeInTheDocument();
    expect(screen.getByText("Collections")).toBeInTheDocument();
    expect(screen.getByText(example.description)).not.toBeVisible();
  });

  it("expands to show the full description and collapses to hide it", () => {
    render(<ExampleBanner example={example} />);
    const toggle = screen.getByRole("button", { name: "Show description" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(toggle);
    expect(screen.getByRole("button", { name: "Hide description" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText(example.description)).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Hide description" }));
    expect(screen.getByText(example.description)).not.toBeVisible();
  });
});
