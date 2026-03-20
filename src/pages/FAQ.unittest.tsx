import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { FAQ } from "./FAQ";

vi.mock("@/components/MarkdownPage/MarkdownPage", () => ({
  MarkdownPage: ({ title, markdownPath, showBackButton }: { title: string; markdownPath: string; showBackButton: boolean }) => (
    <div data-testid="markdown-page">
      <h1>{title}</h1>
      <div data-testid="markdown-path">{markdownPath}</div>
      <div data-testid="show-back-button">{String(showBackButton)}</div>
    </div>
  ),
}));

describe("FAQ", () => {
  it("should render the FAQ page", () => {
    render(<FAQ />);
    expect(screen.getByText("Frequently Asked Questions")).toBeInTheDocument();
  });

  it("should use the correct markdown path", () => {
    render(<FAQ />);
    expect(screen.getByTestId("markdown-path")).toHaveTextContent("/FAQ.md");
  });

  it("should not show back button", () => {
    render(<FAQ />);
    expect(screen.getByTestId("show-back-button")).toHaveTextContent("false");
  });

  it("should render the MarkdownPage component", () => {
    render(<FAQ />);
    expect(screen.getByTestId("markdown-page")).toBeInTheDocument();
  });
});
