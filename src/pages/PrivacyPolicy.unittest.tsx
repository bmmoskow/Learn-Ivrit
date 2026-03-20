import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { PrivacyPolicy } from "./PrivacyPolicy";

vi.mock("@/components/MarkdownPage/MarkdownPage", () => ({
  MarkdownPage: ({ title, markdownPath }: { title: string; markdownPath: string }) => (
    <div data-testid="markdown-page">
      <h1>{title}</h1>
      <div data-testid="markdown-path">{markdownPath}</div>
    </div>
  ),
}));

describe("PrivacyPolicy", () => {
  it("should render the Privacy Policy page", () => {
    render(<PrivacyPolicy />);
    expect(screen.getByText("Privacy Policy")).toBeInTheDocument();
  });

  it("should use the correct markdown path", () => {
    render(<PrivacyPolicy />);
    expect(screen.getByTestId("markdown-path")).toHaveTextContent("/PRIVACY_POLICY.md");
  });

  it("should render the MarkdownPage component", () => {
    render(<PrivacyPolicy />);
    expect(screen.getByTestId("markdown-page")).toBeInTheDocument();
  });
});
