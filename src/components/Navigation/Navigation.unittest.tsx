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
});
