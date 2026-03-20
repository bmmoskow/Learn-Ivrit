import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TermsOfService } from "./TermsOfService";

vi.mock("@/components/MarkdownPage/MarkdownPage", () => ({
  MarkdownPage: ({ title, markdownPath }: { title: string; markdownPath: string }) => (
    <div data-testid="markdown-page">
      <h1>{title}</h1>
      <div data-testid="markdown-path">{markdownPath}</div>
    </div>
  ),
}));

describe("TermsOfService", () => {
  it("should render the Terms of Service page", () => {
    render(<TermsOfService />);
    expect(screen.getByText("Terms of Service")).toBeInTheDocument();
  });

  it("should use the correct markdown path", () => {
    render(<TermsOfService />);
    expect(screen.getByTestId("markdown-path")).toHaveTextContent("/TERMS_OF_SERVICE.md");
  });

  it("should render the MarkdownPage component", () => {
    render(<TermsOfService />);
    expect(screen.getByTestId("markdown-page")).toBeInTheDocument();
  });
});
