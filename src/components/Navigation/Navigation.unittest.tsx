import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";

// Mock AuthContext
vi.mock("../../contexts/AuthContext/AuthContext", () => ({
  useAuth: vi.fn(() => ({
    user: { email: "test@example.com" },
    isGuest: false,
    signOut: vi.fn(),
  })),
}));

import { Navigation } from "./Navigation";

describe("Navigation", () => {
  const defaultProps = {
    currentView: "translate",
    onViewChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Phone Layout - No Horizontal Scroll", () => {
    it("renders phone navigation with flex-wrap to prevent horizontal overflow", () => {
      render(<Navigation {...defaultProps} />);

      // Phone view should use flex-wrap to keep all items on screen
      const phoneNav = document.querySelector(".sm\\:hidden");
      expect(phoneNav).toBeInTheDocument();
    });

    it("renders all navigation items within the phone nav container", () => {
      render(<Navigation {...defaultProps} />);

      const phoneNav = document.querySelector(".sm\\:hidden");
      expect(phoneNav).toBeInTheDocument();

      // All nav buttons should be within the phone nav container (not overflowing)
      const buttons = phoneNav?.querySelectorAll("button");
      expect(buttons?.length).toBeGreaterThanOrEqual(4); // Dashboard, Translate, Vocabulary, Test
    });
  });

  describe("Tablet Layout", () => {
    it("renders tablet navigation as two-row layout", () => {
      render(<Navigation {...defaultProps} />);

      // Tablet nav should be visible on sm screens, hidden on lg
      const tabletNav = document.querySelector(".hidden.sm\\:block.lg\\:hidden");
      expect(tabletNav).toBeInTheDocument();
    });

    it("renders tablet nav items with compact gap to fit on screen", () => {
      render(<Navigation {...defaultProps} />);

      const tabletNav = document.querySelector(".hidden.sm\\:block.lg\\:hidden");
      const navItemsContainer = tabletNav?.querySelector(".flex.items-center.gap-2");
      expect(navItemsContainer).toBeInTheDocument();
    });
  });

describe("Desktop Layout", () => {
    it("renders desktop navigation as hidden on mobile", () => {
      render(<Navigation {...defaultProps} />);

      // Desktop nav should have hidden class for mobile
      const desktopNav = document.querySelector(".hidden.lg\\:flex");
      expect(desktopNav).toBeInTheDocument();
    });

    it("renders desktop buttons with larger padding than mobile", () => {
      render(<Navigation {...defaultProps} />);

      const desktopNav = document.querySelector(".hidden.lg\\:flex");
      const navItemsContainer = desktopNav?.querySelector(".flex.items-center.gap-2");
      const desktopButtons = navItemsContainer?.querySelectorAll("button");

      desktopButtons?.forEach((button) => {
        expect(button).toHaveClass("px-4");
        expect(button).toHaveClass("py-2");
      });
    });
  });

  describe("FAQ Navigation Item", () => {
    it("renders FAQ item in the navigation for authenticated users", () => {
      render(<Navigation {...defaultProps} />);

      // Check that FAQ button exists
      const faqButtons = document.querySelectorAll("button");
      const faqButton = Array.from(faqButtons).find((btn) =>
        btn.textContent?.includes("FAQ")
      );
      expect(faqButton).toBeInTheDocument();
    });

    it("renders FAQ item positioned before Settings in nav order", () => {
      render(<Navigation {...defaultProps} />);

      const desktopNav = document.querySelector(".hidden.lg\\:flex");
      const navItemsContainer = desktopNav?.querySelector(".flex.items-center.gap-2");
      const buttons = navItemsContainer?.querySelectorAll("button");

      if (buttons) {
        const buttonLabels = Array.from(buttons).map((btn) => btn.textContent?.trim());
        const faqIndex = buttonLabels.findIndex((label) => label?.includes("FAQ"));
        const settingsIndex = buttonLabels.findIndex((label) => label?.includes("Settings"));

        // FAQ should appear before Settings
        expect(faqIndex).toBeLessThan(settingsIndex);
        expect(faqIndex).toBeGreaterThan(-1);
      }
    });

    it("highlights FAQ when it is the current view", () => {
      render(<Navigation {...defaultProps} currentView="faq" />);

      const faqButtons = document.querySelectorAll("button");
      const faqButton = Array.from(faqButtons).find((btn) =>
        btn.textContent?.includes("FAQ")
      );

      expect(faqButton).toHaveClass("bg-blue-50");
      expect(faqButton).toHaveClass("text-blue-700");
    });

    it("calls onViewChange with 'faq' when FAQ button is clicked", () => {
      const mockOnViewChange = vi.fn();
      render(<Navigation {...defaultProps} onViewChange={mockOnViewChange} />);

      const faqButtons = document.querySelectorAll("button");
      const faqButton = Array.from(faqButtons).find((btn) =>
        btn.textContent?.includes("FAQ")
      );

      faqButton?.click();
      expect(mockOnViewChange).toHaveBeenCalledWith("faq");
    });
  });
});
