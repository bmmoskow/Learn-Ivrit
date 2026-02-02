import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { MarkdownPage } from "./MarkdownPage";
import { APP_CONFIG } from "@/config/app";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const getByText = (
  container: HTMLElement,
  text: string | RegExp
): HTMLElement | null => {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    const parent = node.parentElement;
    if (!parent) continue;
    const content = node.textContent || "";
    if (text instanceof RegExp ? text.test(content) : content.includes(text)) {
      return parent;
    }
  }
  return null;
};

const getByRole = (
  container: HTMLElement,
  role: string,
  options?: { name?: RegExp }
): HTMLElement | null => {
  const selector =
    role === "link" ? "a" : role === "button" ? "button" : `[role="${role}"]`;
  const elements = container.querySelectorAll(selector);
  if (!options?.name) return (elements[0] as HTMLElement) || null;
  for (const el of elements) {
    const text = el.textContent || el.getAttribute("aria-label") || "";
    if (options.name.test(text)) return el as HTMLElement;
  }
  return null;
};

const getAllByRole = (
  container: HTMLElement,
  role: string,
  options?: { name?: RegExp }
): HTMLElement[] => {
  const selector =
    role === "link" ? "a" : role === "button" ? "button" : `[role="${role}"]`;
  const elements = container.querySelectorAll(selector);
  if (!options?.name) return Array.from(elements) as HTMLElement[];
  const matches: HTMLElement[] = [];
  for (const el of elements) {
    const text = el.textContent || el.getAttribute("aria-label") || "";
    if (options.name.test(text)) matches.push(el as HTMLElement);
  }
  return matches;
};

const waitForElement = (
  _container: HTMLElement,
  predicate: () => boolean,
  timeout = 3000
): Promise<void> => {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      if (predicate()) {
        resolve();
      } else if (Date.now() - start > timeout) {
        reject(new Error("Timeout waiting for element"));
      } else {
        setTimeout(check, 50);
      }
    };
    check();
  });
};

describe("MarkdownPage", () => {
  const mockIcon = <span data-testid="mock-icon">Icon</span>;
  const defaultProps = {
    markdownPath: "/test.md",
    icon: mockIcon,
    title: "Test Page",
  };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows loading state initially", () => {
    vi.spyOn(global, "fetch").mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    const { container } = render(
      <MemoryRouter>
        <MarkdownPage {...defaultProps} />
      </MemoryRouter>
    );

    expect(getByText(container, "Loading...")).toBeInTheDocument();
  });

  it("renders markdown content after loading", async () => {
    const markdownContent = "# Hello World\n\nThis is a test paragraph.";
    vi.spyOn(global, "fetch").mockResolvedValue({
      text: () => Promise.resolve(markdownContent),
    } as Response);

    const { container } = render(
      <MemoryRouter>
        <MarkdownPage {...defaultProps} />
      </MemoryRouter>
    );

    await waitForElement(container, () => !getByText(container, "Loading..."));

    expect(getByText(container, "Hello World")).toBeInTheDocument();
    expect(getByText(container, "This is a test paragraph.")).toBeInTheDocument();
  });

  it("renders the title and icon", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      text: () => Promise.resolve("# Content"),
    } as Response);

    const { container } = render(
      <MemoryRouter>
        <MarkdownPage {...defaultProps} />
      </MemoryRouter>
    );

    await waitForElement(container, () => !getByText(container, "Loading..."));

    expect(getByText(container, "Test Page")).toBeInTheDocument();
    expect(container.querySelector('[data-testid="mock-icon"]')).toBeInTheDocument();
  });

  it("replaces [CONTACT_EMAIL] placeholder with support email", async () => {
    const markdownContent = "Contact us at [CONTACT_EMAIL] for help.";
    vi.spyOn(global, "fetch").mockResolvedValue({
      text: () => Promise.resolve(markdownContent),
    } as Response);

    const { container } = render(
      <MemoryRouter>
        <MarkdownPage {...defaultProps} />
      </MemoryRouter>
    );

    await waitForElement(container, () => !getByText(container, "Loading..."));

    expect(
      getByText(container, new RegExp(APP_CONFIG.supportEmail))
    ).toBeInTheDocument();
    expect(getByText(container, "[CONTACT_EMAIL]")).not.toBeInTheDocument();
  });

  it("shows error message when fetch fails", async () => {
    vi.spyOn(global, "fetch").mockRejectedValue(new Error("Network error"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const { container } = render(
      <MemoryRouter>
        <MarkdownPage {...defaultProps} />
      </MemoryRouter>
    );

    await waitForElement(container, () => !getByText(container, "Loading..."));

    expect(
      getByText(container, "Error loading content. Please try again later.")
    ).toBeInTheDocument();
  });

  it("fetches content from the provided markdownPath", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue({
      text: () => Promise.resolve("# Test"),
    } as Response);

    const { container } = render(
      <MemoryRouter>
        <MarkdownPage {...defaultProps} markdownPath="/custom/path.md" />
      </MemoryRouter>
    );

    await waitForElement(container, () => !getByText(container, "Loading..."));
    expect(fetchSpy).toHaveBeenCalledWith("/custom/path.md");
  });

  it("navigates back when back button is clicked", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      text: () => Promise.resolve("# Content"),
    } as Response);

    const { container } = render(
      <MemoryRouter>
        <MarkdownPage {...defaultProps} />
      </MemoryRouter>
    );

    await waitForElement(container, () => !getByText(container, "Loading..."));

    const backButtons = getAllByRole(container, "button", { name: /back to app/i });
    expect(backButtons.length).toBe(2); // Top and bottom

    await userEvent.click(backButtons[0]);
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  it("renders various markdown elements with correct structure", async () => {
    const markdownContent = `
## Heading 2

### Heading 3

- List item 1
- List item 2

1. Ordered item
2. Another item

[A link](https://example.com)

> A blockquote

\`inline code\`
`;
    vi.spyOn(global, "fetch").mockResolvedValue({
      text: () => Promise.resolve(markdownContent),
    } as Response);

    const { container } = render(
      <MemoryRouter>
        <MarkdownPage {...defaultProps} />
      </MemoryRouter>
    );

    await waitForElement(container, () => !getByText(container, "Loading..."));

    expect(getByText(container, "Heading 2")).toBeInTheDocument();
    expect(getByText(container, "Heading 3")).toBeInTheDocument();
    expect(getByText(container, "List item 1")).toBeInTheDocument();
    expect(getByText(container, "Ordered item")).toBeInTheDocument();
    expect(getByText(container, "A link")).toBeInTheDocument();
    expect(getByText(container, "A blockquote")).toBeInTheDocument();
    expect(getByText(container, "inline code")).toBeInTheDocument();
  });

  it("renders link with correct href", async () => {
    const markdownContent = "[Test Link](https://example.com)";
    vi.spyOn(global, "fetch").mockResolvedValue({
      text: () => Promise.resolve(markdownContent),
    } as Response);

    const { container } = render(
      <MemoryRouter>
        <MarkdownPage {...defaultProps} />
      </MemoryRouter>
    );

    await waitForElement(container, () => !getByText(container, "Loading..."));

    const link = getByRole(container, "link", { name: /Test Link/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "https://example.com");
  });

  it("renders code blocks with proper styling", async () => {
    const markdownContent = "`code snippet`";
    vi.spyOn(global, "fetch").mockResolvedValue({
      text: () => Promise.resolve(markdownContent),
    } as Response);

    const { container } = render(
      <MemoryRouter>
        <MarkdownPage {...defaultProps} />
      </MemoryRouter>
    );

    await waitForElement(container, () => !getByText(container, "Loading..."));

    const codeElement = container.querySelector("code");
    expect(codeElement).toBeInTheDocument();
    expect(codeElement).toHaveClass("bg-gray-100");
  });

  it("renders lists correctly", async () => {
    const markdownContent = "- Item A\n- Item B";
    vi.spyOn(global, "fetch").mockResolvedValue({
      text: () => Promise.resolve(markdownContent),
    } as Response);

    const { container } = render(
      <MemoryRouter>
        <MarkdownPage {...defaultProps} />
      </MemoryRouter>
    );

    await waitForElement(container, () => !getByText(container, "Loading..."));

    const ul = container.querySelector("ul");
    expect(ul).toBeInTheDocument();
    expect(ul).toHaveClass("list-disc");
  });
});
