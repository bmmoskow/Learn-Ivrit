import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Toolbar } from "./Toolbar";
import React from "react";

const createDefaultProps = () => ({
  sourceText: "",
  processingImage: false,
  isGuest: false,
  setShowBookmarkManager: vi.fn(),
  setShowSaveBookmark: vi.fn(),
  handleCopy: vi.fn(),
  handleFileSelect: vi.fn(),
  clearAll: vi.fn(),
  triggerFileInput: vi.fn(),
  fileInputRef: { current: null } as React.RefObject<HTMLInputElement>,
});

describe("Toolbar", () => {
  it("renders bookmark buttons for authenticated users", () => {
    render(<Toolbar {...createDefaultProps()} />);
    const buttons = document.querySelectorAll("button");
    // Bookmarks, Save Bookmark, Upload, Copy, Clear = 5
    expect(buttons.length).toBe(5);
  });

  it("hides bookmark buttons for guests", () => {
    render(<Toolbar {...createDefaultProps()} isGuest={true} />);
    const buttons = document.querySelectorAll("button");
    // Upload, Copy, Clear = 3
    expect(buttons.length).toBe(3);
  });

  it("disables save bookmark, copy, and clear when no source text", () => {
    render(<Toolbar {...createDefaultProps()} />);
    const buttons = document.querySelectorAll("button");
    // Save bookmark (index 1), Copy (index 3), Clear (index 4)
    expect(buttons[1]).toBeDisabled();
    expect(buttons[3]).toBeDisabled();
    expect(buttons[4]).toBeDisabled();
  });

  it("enables save bookmark, copy, and clear when source text exists", () => {
    render(<Toolbar {...createDefaultProps()} sourceText="שלום" />);
    const buttons = document.querySelectorAll("button");
    expect(buttons[1]).not.toBeDisabled();
    expect(buttons[3]).not.toBeDisabled();
    expect(buttons[4]).not.toBeDisabled();
  });

  it("calls setShowBookmarkManager when bookmark button clicked", async () => {
    const user = userEvent.setup();
    const props = createDefaultProps();
    render(<Toolbar {...props} />);
    const buttons = document.querySelectorAll("button");
    await user.click(buttons[0]);
    expect(props.setShowBookmarkManager).toHaveBeenCalledWith(true);
  });

  it("calls clearAll when clear button clicked", async () => {
    const user = userEvent.setup();
    const props = createDefaultProps();
    props.sourceText = "text";
    render(<Toolbar {...props} />);
    const buttons = document.querySelectorAll("button");
    await user.click(buttons[4]);
    expect(props.clearAll).toHaveBeenCalled();
  });

  it("calls triggerFileInput when upload button clicked", async () => {
    const user = userEvent.setup();
    const props = createDefaultProps();
    render(<Toolbar {...props} />);
    const uploadBtn = document.querySelector("button[title='Upload image with Hebrew text']") as HTMLElement;
    await user.click(uploadBtn);
    expect(props.triggerFileInput).toHaveBeenCalled();
  });

  it("shows spinner when processing image", () => {
    render(<Toolbar {...createDefaultProps()} processingImage={true} />);
    const spinner = document.querySelector(".animate-spin");
    expect(spinner).toBeInTheDocument();
  });
});
