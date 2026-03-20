import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Index from "./Index";

describe("Index", () => {
  it("should render the welcome heading", () => {
    render(<Index />);
    expect(screen.getByText("Welcome to Your Blank App")).toBeInTheDocument();
  });

  it("should render the description text", () => {
    render(<Index />);
    expect(screen.getByText("Start building your amazing project here!")).toBeInTheDocument();
  });

  it("should have the correct layout classes", () => {
    const { container } = render(<Index />);
    const mainDiv = container.querySelector('.flex.min-h-screen.items-center.justify-center.bg-background');
    expect(mainDiv).toBeInTheDocument();
  });

  it("should display content in a centered layout", () => {
    const { container } = render(<Index />);
    const centerDiv = container.querySelector('.text-center');
    expect(centerDiv).toBeInTheDocument();
  });
});
