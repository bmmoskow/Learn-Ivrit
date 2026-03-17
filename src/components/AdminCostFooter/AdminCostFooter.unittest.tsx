import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import "@testing-library/jest-dom";

const mockUseAdminRole = vi.fn();
const mockUseLastTransaction = vi.fn();

vi.mock("../../hooks/useAdminRole", () => ({
  useAdminRole: () => mockUseAdminRole(),
}));

vi.mock("../Admin/useLastTransaction", () => ({
  useLastTransaction: () => mockUseLastTransaction(),
}));

import { AdminCostFooter } from "./AdminCostFooter";

describe("AdminCostFooter", () => {
  it("renders nothing when not admin", () => {
    mockUseAdminRole.mockReturnValue({ isAdmin: false, loading: false });
    mockUseLastTransaction.mockReturnValue({ lastTx: null });
    const { container } = render(<AdminCostFooter />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing while loading", () => {
    mockUseAdminRole.mockReturnValue({ isAdmin: true, loading: true });
    mockUseLastTransaction.mockReturnValue({ lastTx: null });
    const { container } = render(<AdminCostFooter />);
    expect(container.firstChild).toBeNull();
  });

  it("renders UI when admin and loaded", () => {
    mockUseAdminRole.mockReturnValue({ isAdmin: true, loading: false });
    mockUseLastTransaction.mockReturnValue({ lastTx: null });
    const { container } = render(<AdminCostFooter />);
    expect(container.firstChild).not.toBeNull();
  });
});
