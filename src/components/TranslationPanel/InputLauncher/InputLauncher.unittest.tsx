import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { InputLauncher } from "./InputLauncher";

const getByText = (text: string) => {
  const el = Array.from(document.body.querySelectorAll("*")).find(
    (e) => e.textContent === text && e.children.length === 0
  );
  if (!el) throw new Error(`Could not find element with text "${text}"`);
  return el as HTMLElement;
};

const queryByText = (text: string) => {
  return Array.from(document.body.querySelectorAll("*")).find(
    (e) => e.textContent === text && e.children.length === 0
  ) as HTMLElement | undefined;
};

describe("InputLauncher", () => {
  const createDefaultProps = () => ({
    isGuest: false,
    onPasteType: vi.fn(),
    onUploadImage: vi.fn(),
    onLoadUrl: vi.fn(),
    onLoadBible: vi.fn(),
    onGenerateAI: vi.fn(),
    onLoadBookmark: vi.fn(),
  });

  it("renders all 6 cards for authenticated users", () => {
    render(<InputLauncher {...createDefaultProps()} />);
    const buttons = document.querySelectorAll("button");
    expect(buttons.length).toBe(6);
  });

  it("hides Load Bookmark card for guests", () => {
    render(<InputLauncher {...createDefaultProps()} isGuest={true} />);
    const buttons = document.querySelectorAll("button");
    expect(buttons.length).toBe(5);
    expect(queryByText("Load Bookmark")).toBeUndefined();
  });

  it("renders card titles", () => {
    render(<InputLauncher {...createDefaultProps()} />);
    expect(getByText("Paste or Type")).toBeTruthy();
    expect(getByText("Upload Image")).toBeTruthy();
    expect(getByText("Load from URL")).toBeTruthy();
    expect(getByText("Load from Bible")).toBeTruthy();
    expect(getByText("Generate with AI")).toBeTruthy();
    expect(getByText("Load Bookmark")).toBeTruthy();
  });

  it("calls onPasteType when clicked", async () => {
    const user = userEvent.setup();
    const props = createDefaultProps();
    render(<InputLauncher {...props} />);
    await user.click(getByText("Paste or Type"));
    expect(props.onPasteType).toHaveBeenCalled();
  });

  it("calls onUploadImage when clicked", async () => {
    const user = userEvent.setup();
    const props = createDefaultProps();
    render(<InputLauncher {...props} />);
    await user.click(getByText("Upload Image"));
    expect(props.onUploadImage).toHaveBeenCalled();
  });

  it("calls onLoadUrl when clicked", async () => {
    const user = userEvent.setup();
    const props = createDefaultProps();
    render(<InputLauncher {...props} />);
    await user.click(getByText("Load from URL"));
    expect(props.onLoadUrl).toHaveBeenCalled();
  });

  it("calls onLoadBible when clicked", async () => {
    const user = userEvent.setup();
    const props = createDefaultProps();
    render(<InputLauncher {...props} />);
    await user.click(getByText("Load from Bible"));
    expect(props.onLoadBible).toHaveBeenCalled();
  });

  it("calls onGenerateAI when clicked", async () => {
    const user = userEvent.setup();
    const props = createDefaultProps();
    render(<InputLauncher {...props} />);
    await user.click(getByText("Generate with AI"));
    expect(props.onGenerateAI).toHaveBeenCalled();
  });

  it("calls onLoadBookmark when clicked", async () => {
    const user = userEvent.setup();
    const props = createDefaultProps();
    render(<InputLauncher {...props} />);
    await user.click(getByText("Load Bookmark"));
    expect(props.onLoadBookmark).toHaveBeenCalled();
  });

  it("uses grid layout with responsive columns", () => {
    render(<InputLauncher {...createDefaultProps()} />);
    const grid = document.querySelector(".grid.grid-cols-2.sm\\:grid-cols-3");
    expect(grid).toBeTruthy();
  });
});
