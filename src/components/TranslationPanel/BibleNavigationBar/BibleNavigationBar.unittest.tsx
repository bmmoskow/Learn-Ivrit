import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BibleNavigationBar } from "./BibleNavigationBar";

const createDefaultProps = () => ({
  currentBibleRef: { book: "Genesis", chapter: 1 },
  navigateChapter: vi.fn(),
  canNavigatePrev: vi.fn(() => false),
  canNavigateNext: vi.fn(() => true),
});

describe("BibleNavigationBar", () => {
  it("displays book name and chapter", () => {
    render(<BibleNavigationBar {...createDefaultProps()} />);
    expect(document.body.textContent).toContain("Genesis");
    expect(document.body.textContent).toContain("1");
    expect(document.body.textContent).toContain("בראשית");
  });

  it("disables prev button when canNavigatePrev returns false", () => {
    render(<BibleNavigationBar {...createDefaultProps()} />);
    const prevBtn = document.querySelector("button[title='Previous chapter']") as HTMLButtonElement;
    expect(prevBtn).toBeDisabled();
  });

  it("enables next button when canNavigateNext returns true", () => {
    render(<BibleNavigationBar {...createDefaultProps()} />);
    const nextBtn = document.querySelector("button[title='Next chapter']") as HTMLButtonElement;
    expect(nextBtn).not.toBeDisabled();
  });

  it("calls navigateChapter with 'next' when next clicked", async () => {
    const user = userEvent.setup();
    const props = createDefaultProps();
    render(<BibleNavigationBar {...props} />);
    const nextBtn = document.querySelector("button[title='Next chapter']") as HTMLElement;
    await user.click(nextBtn);
    expect(props.navigateChapter).toHaveBeenCalledWith("next");
  });

  it("calls navigateChapter with 'prev' when prev clicked and enabled", async () => {
    const user = userEvent.setup();
    const props = createDefaultProps();
    props.canNavigatePrev.mockReturnValue(true);
    render(<BibleNavigationBar {...props} />);
    const prevBtn = document.querySelector("button[title='Previous chapter']") as HTMLElement;
    await user.click(prevBtn);
    expect(props.navigateChapter).toHaveBeenCalledWith("prev");
  });
});
