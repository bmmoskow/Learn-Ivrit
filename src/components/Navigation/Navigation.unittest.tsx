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

  describe("Mobile Layout - 2x2 Grid", () => {
    it("renders mobile navigation container with grid-cols-2 for 2x2 layout", () => {
      render(<Navigation {...defaultProps} />);

      // Find the mobile navigation container (md:hidden with grid)
      const mobileNav = document.querySelector(".md\\:hidden.grid");
      expect(mobileNav).toBeInTheDocument();
      expect(mobileNav).toHaveClass("grid-cols-2");
      expect(mobileNav).toHaveClass("gap-2");
    });

    it("renders navigation buttons with compact mobile-friendly classes", () => {
      render(<Navigation {...defaultProps} />);

      // Mobile buttons should have compact padding
      const mobileButtons = document.querySelectorAll(".md\\:hidden button");
      expect(mobileButtons.length).toBeGreaterThan(0);

      mobileButtons.forEach((button) => {
        // Check for compact padding classes
        expect(button).toHaveClass("px-3");
        expect(button).toHaveClass("py-2.5");
        expect(button).toHaveClass("text-sm");
      });
    });

    it("renders mobile buttons with centered content layout", () => {
      render(<Navigation {...defaultProps} />);

      const mobileButtons = document.querySelectorAll(".md\\:hidden button");
      mobileButtons.forEach((button) => {
        expect(button).toHaveClass("justify-center");
        expect(button).toHaveClass("items-center");
      });
    });

    it("renders mobile button icons with compact size", () => {
      render(<Navigation {...defaultProps} />);

      const mobileNav = document.querySelector(".md\\:hidden.grid");
      const icons = mobileNav?.querySelectorAll("svg");

      icons?.forEach((icon) => {
        expect(icon).toHaveClass("w-4");
        expect(icon).toHaveClass("h-4");
      });
    });
  });

  describe("Desktop Layout", () => {
    it("renders desktop navigation as hidden on mobile", () => {
      render(<Navigation {...defaultProps} />);

      // Desktop nav should have hidden class for mobile
      const desktopNav = document.querySelector(".hidden.md\\:flex");
      expect(desktopNav).toBeInTheDocument();
    });

    it("renders desktop buttons with larger padding than mobile", () => {
      render(<Navigation {...defaultProps} />);

      const desktopNav = document.querySelector(".hidden.md\\:flex");
      const desktopButtons = desktopNav?.querySelectorAll("button");

      desktopButtons?.forEach((button) => {
        expect(button).toHaveClass("px-4");
        expect(button).toHaveClass("py-2");
      });
    });
  });
});
