import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UrlInput } from "./UrlInput";

const createDefaultProps = () => ({
  urlInput: "",
  loadingUrl: false,
  error: "",
  setUrlInput: vi.fn(),
  setShowUrlInput: vi.fn(),
  loadFromUrl: vi.fn(),
});

describe("UrlInput", () => {
  it("renders URL text input", () => {
    render(<UrlInput {...createDefaultProps()} />);
    const input = document.querySelector("input[type='text']") as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input.placeholder).toContain("URL");
  });

  it("disables Load button when input is empty", () => {
    render(<UrlInput {...createDefaultProps()} />);
    const loadBtn = Array.from(document.querySelectorAll("button")).find(
      (btn) => btn.textContent?.includes("Load")
    ) as HTMLButtonElement;
    expect(loadBtn).toBeDisabled();
  });

  it("enables Load button when input has text", () => {
    render(<UrlInput {...createDefaultProps()} urlInput="https://example.com" />);
    const loadBtn = Array.from(document.querySelectorAll("button")).find(
      (btn) => btn.textContent?.includes("Load")
    ) as HTMLButtonElement;
    expect(loadBtn).not.toBeDisabled();
  });

  it("calls loadFromUrl when Load clicked", async () => {
    const user = userEvent.setup();
    const props = { ...createDefaultProps(), urlInput: "https://example.com" };
    render(<UrlInput {...props} />);
    const loadBtn = Array.from(document.querySelectorAll("button")).find(
      (btn) => btn.textContent?.includes("Load")
    ) as HTMLElement;
    await user.click(loadBtn);
    expect(props.loadFromUrl).toHaveBeenCalled();
  });

  it("shows spinner when loading", () => {
    render(<UrlInput {...createDefaultProps()} urlInput="https://example.com" loadingUrl={true} />);
    const spinner = document.querySelector(".animate-spin");
    expect(spinner).toBeInTheDocument();
  });

  it("calls setShowUrlInput(false) when Cancel clicked", async () => {
    const user = userEvent.setup();
    const props = createDefaultProps();
    render(<UrlInput {...props} />);
    const cancelBtn = Array.from(document.querySelectorAll("button")).find(
      (btn) => btn.textContent === "Cancel"
    ) as HTMLElement;
    await user.click(cancelBtn);
    expect(props.setShowUrlInput).toHaveBeenCalledWith(false);
  });

  it("calls setUrlInput on typing", async () => {
    const user = userEvent.setup();
    const props = createDefaultProps();
    render(<UrlInput {...props} />);
    const input = document.querySelector("input[type='text']") as HTMLInputElement;
    await user.type(input, "a");
    expect(props.setUrlInput).toHaveBeenCalled();
  });

  describe("URL Validation", () => {
    it("disables Load button for invalid URLs without protocol or domain", () => {
      render(<UrlInput {...createDefaultProps()} urlInput="not a url" />);
      const loadBtn = Array.from(document.querySelectorAll("button")).find(
        (btn) => btn.textContent?.includes("Load")
      ) as HTMLButtonElement;
      expect(loadBtn).toBeDisabled();
    });

    it("disables Load button for URLs missing domain extension", () => {
      render(<UrlInput {...createDefaultProps()} urlInput="http://example" />);
      const loadBtn = Array.from(document.querySelectorAll("button")).find(
        (btn) => btn.textContent?.includes("Load")
      ) as HTMLButtonElement;
      expect(loadBtn).toBeDisabled();
    });

    it("enables Load button for valid URL with https protocol", () => {
      render(<UrlInput {...createDefaultProps()} urlInput="https://example.com" />);
      const loadBtn = Array.from(document.querySelectorAll("button")).find(
        (btn) => btn.textContent?.includes("Load")
      ) as HTMLButtonElement;
      expect(loadBtn).not.toBeDisabled();
    });

    it("enables Load button for valid URL with http protocol", () => {
      render(<UrlInput {...createDefaultProps()} urlInput="http://example.com" />);
      const loadBtn = Array.from(document.querySelectorAll("button")).find(
        (btn) => btn.textContent?.includes("Load")
      ) as HTMLButtonElement;
      expect(loadBtn).not.toBeDisabled();
    });

    it("enables Load button for valid URL without protocol", () => {
      render(<UrlInput {...createDefaultProps()} urlInput="example.com" />);
      const loadBtn = Array.from(document.querySelectorAll("button")).find(
        (btn) => btn.textContent?.includes("Load")
      ) as HTMLButtonElement;
      expect(loadBtn).not.toBeDisabled();
    });

    it("enables Load button for URL with path", () => {
      render(<UrlInput {...createDefaultProps()} urlInput="https://example.com/article/123" />);
      const loadBtn = Array.from(document.querySelectorAll("button")).find(
        (btn) => btn.textContent?.includes("Load")
      ) as HTMLButtonElement;
      expect(loadBtn).not.toBeDisabled();
    });

    it("enables Load button for URL with query parameters", () => {
      render(<UrlInput {...createDefaultProps()} urlInput="https://example.com/page?id=123&lang=en" />);
      const loadBtn = Array.from(document.querySelectorAll("button")).find(
        (btn) => btn.textContent?.includes("Load")
      ) as HTMLButtonElement;
      expect(loadBtn).not.toBeDisabled();
    });

    it("disables Load button for empty string", () => {
      render(<UrlInput {...createDefaultProps()} urlInput="" />);
      const loadBtn = Array.from(document.querySelectorAll("button")).find(
        (btn) => btn.textContent?.includes("Load")
      ) as HTMLButtonElement;
      expect(loadBtn).toBeDisabled();
    });

    it("disables Load button for whitespace only", () => {
      render(<UrlInput {...createDefaultProps()} urlInput="   " />);
      const loadBtn = Array.from(document.querySelectorAll("button")).find(
        (btn) => btn.textContent?.includes("Load")
      ) as HTMLButtonElement;
      expect(loadBtn).toBeDisabled();
    });

    it("enables Load button for URL with leading/trailing whitespace", () => {
      render(<UrlInput {...createDefaultProps()} urlInput="  https://example.com  " />);
      const loadBtn = Array.from(document.querySelectorAll("button")).find(
        (btn) => btn.textContent?.includes("Load")
      ) as HTMLButtonElement;
      expect(loadBtn).not.toBeDisabled();
    });
  });

  describe("Error Display", () => {
    it("does not show error message when error prop is empty", () => {
      render(<UrlInput {...createDefaultProps()} error="" />);
      const errorBox = document.querySelector(".bg-red-50");
      expect(errorBox).not.toBeInTheDocument();
    });

    it("shows error message when error prop is set", () => {
      const errorMessage = "Failed to load URL";
      render(<UrlInput {...createDefaultProps()} error={errorMessage} />);
      const errorBox = document.querySelector(".bg-red-50");
      expect(errorBox).toBeInTheDocument();
      expect(errorBox?.textContent).toContain(errorMessage);
    });

    it("displays validation error message", () => {
      const errorMessage = "Please enter a valid URL";
      render(<UrlInput {...createDefaultProps()} error={errorMessage} />);
      expect(document.body.textContent).toContain(errorMessage);
    });

    it("displays network error message", () => {
      const errorMessage = "Network error. Please check your internet connection";
      render(<UrlInput {...createDefaultProps()} error={errorMessage} />);
      expect(document.body.textContent).toContain(errorMessage);
    });

    it("displays server error message", () => {
      const errorMessage = "Server error while processing the URL";
      render(<UrlInput {...createDefaultProps()} error={errorMessage} />);
      expect(document.body.textContent).toContain(errorMessage);
    });

    it("displays blocked website error message", () => {
      const errorMessage = "This website blocks automated text extraction";
      render(<UrlInput {...createDefaultProps()} error={errorMessage} />);
      expect(document.body.textContent).toContain(errorMessage);
    });

    it("displays DNS/connection error message for unreachable URLs", () => {
      const errorMessage = "Unable to connect to this URL. Please check the address and try again, or use the \"Paste / Type\" option to enter the text manually.";
      render(<UrlInput {...createDefaultProps()} error={errorMessage} />);
      expect(document.body.textContent).toContain("Unable to connect to this URL");
      expect(document.body.textContent).toContain("Paste / Type");
    });

    it("displays 404 not found error message", () => {
      const errorMessage = "The page was not found. Please check the URL and try again.";
      render(<UrlInput {...createDefaultProps()} error={errorMessage} />);
      expect(document.body.textContent).toContain("The page was not found");
    });

    it("displays empty content extraction error message", () => {
      const errorMessage = "No text content could be extracted from this URL. The page may be empty, blocked, or require JavaScript to load.";
      render(<UrlInput {...createDefaultProps()} error={errorMessage} />);
      expect(document.body.textContent).toContain("No text content could be extracted");
    });
  });

  describe("Enter Key Behavior", () => {
    it("calls loadFromUrl when Enter pressed with valid URL", async () => {
      const user = userEvent.setup();
      const props = { ...createDefaultProps(), urlInput: "https://example.com" };
      render(<UrlInput {...props} />);
      const input = document.querySelector("input[type='text']") as HTMLInputElement;
      await user.type(input, "{Enter}");
      expect(props.loadFromUrl).toHaveBeenCalled();
    });

    it("does not call loadFromUrl when Enter pressed with invalid URL", async () => {
      const user = userEvent.setup();
      const props = { ...createDefaultProps(), urlInput: "not a url" };
      render(<UrlInput {...props} />);
      const input = document.querySelector("input[type='text']") as HTMLInputElement;
      await user.type(input, "{Enter}");
      expect(props.loadFromUrl).not.toHaveBeenCalled();
    });

    it("does not call loadFromUrl when Enter pressed while loading", async () => {
      const user = userEvent.setup();
      const props = { ...createDefaultProps(), urlInput: "https://example.com", loadingUrl: true };
      render(<UrlInput {...props} />);
      const input = document.querySelector("input[type='text']") as HTMLInputElement;
      await user.type(input, "{Enter}");
      expect(props.loadFromUrl).not.toHaveBeenCalled();
    });
  });
});
