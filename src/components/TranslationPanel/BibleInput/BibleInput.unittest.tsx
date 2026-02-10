import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BibleInput } from "./BibleInput";

const createDefaultProps = () => ({
  selectedBook: "",
  selectedChapter: 1,
  loadingBible: false,
  setSelectedBook: vi.fn(),
  setSelectedChapter: vi.fn(),
  setShowBibleInput: vi.fn(),
  loadFromBible: vi.fn(),
});

describe("BibleInput", () => {
  it("renders book select dropdown", () => {
    render(<BibleInput {...createDefaultProps()} />);
    const select = document.querySelector("select") as HTMLSelectElement;
    expect(select).toBeInTheDocument();
    expect(select.value).toBe("");
  });

  it("does not show chapter input when no book selected", () => {
    render(<BibleInput {...createDefaultProps()} />);
    const numberInput = document.querySelector("input[type='number']");
    expect(numberInput).not.toBeInTheDocument();
  });

  it("shows chapter input when a book is selected", () => {
    render(<BibleInput {...createDefaultProps()} selectedBook="Genesis" />);
    const numberInput = document.querySelector("input[type='number']");
    expect(numberInput).toBeInTheDocument();
  });

  it("calls setSelectedBook when book changes", async () => {
    const user = userEvent.setup();
    const props = createDefaultProps();
    render(<BibleInput {...props} />);
    const select = document.querySelector("select") as HTMLSelectElement;
    await user.selectOptions(select, "Genesis");
    expect(props.setSelectedBook).toHaveBeenCalledWith("Genesis");
  });

  it("calls loadFromBible when Load button clicked", async () => {
    const user = userEvent.setup();
    const props = { ...createDefaultProps(), selectedBook: "Genesis", selectedChapter: 1 };
    render(<BibleInput {...props} />);
    const loadBtn = Array.from(document.querySelectorAll("button")).find(
      (btn) => btn.textContent?.includes("Load")
    ) as HTMLElement;
    await user.click(loadBtn);
    expect(props.loadFromBible).toHaveBeenCalled();
  });

  it("shows spinner when loading", () => {
    render(<BibleInput {...createDefaultProps()} selectedBook="Genesis" loadingBible={true} />);
    const spinner = document.querySelector(".animate-spin");
    expect(spinner).toBeInTheDocument();
  });

  it("calls setShowBibleInput(false) when Cancel clicked", async () => {
    const user = userEvent.setup();
    const props = createDefaultProps();
    render(<BibleInput {...props} />);
    const cancelBtn = Array.from(document.querySelectorAll("button")).find(
      (btn) => btn.textContent === "Cancel"
    ) as HTMLElement;
    await user.click(cancelBtn);
    expect(props.setShowBibleInput).toHaveBeenCalledWith(false);
  });
});
