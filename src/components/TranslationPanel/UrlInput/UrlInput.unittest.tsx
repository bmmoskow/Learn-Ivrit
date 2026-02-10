import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UrlInput } from "./UrlInput";

const createDefaultProps = () => ({
  urlInput: "",
  loadingUrl: false,
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
});
