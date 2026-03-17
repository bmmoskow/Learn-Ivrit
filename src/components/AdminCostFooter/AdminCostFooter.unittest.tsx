import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

const mockUseAdminRole = vi.fn();
const mockUseLastTransaction = vi.fn();

vi.mock("../hooks/useAdminRole", () => ({
  useAdminRole: () => mockUseAdminRole(),
}));

vi.mock("./Admin/useLastTransaction", () => ({
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

  it("shows 'No recent API calls' when lastTx is null", () => {
    mockUseAdminRole.mockReturnValue({ isAdmin: true, loading: false });
    mockUseLastTransaction.mockReturnValue({ lastTx: null });
    render(<AdminCostFooter />);
    expect(screen.getByText(/No recent API calls/)).toBeInTheDocument();
  });

  it("displays cost for a single non-cached call", () => {
    mockUseAdminRole.mockReturnValue({ isAdmin: true, loading: false });
    mockUseLastTransaction.mockReturnValue({
      lastTx: {
        request_type: "translate",
        prompt_tokens: 1000,
        candidates_tokens: 500,
        thinking_tokens: 0,
        cache_hit: false,
        cost: 0.00375,
        created_at: "2024-06-15T10:00:00Z",
        call_count: 1,
      },
    });
    render(<AdminCostFooter />);
    expect(screen.getByText("$0.0037")).toBeInTheDocument();
    expect(screen.getByText(/1.5k tokens/)).toBeInTheDocument();
    expect(screen.queryByText(/calls\)/)).not.toBeInTheDocument();
  });

  it("displays aggregated cost with call count for multi-paragraph", () => {
    mockUseAdminRole.mockReturnValue({ isAdmin: true, loading: false });
    mockUseLastTransaction.mockReturnValue({
      lastTx: {
        request_type: "translate",
        prompt_tokens: 2400,
        candidates_tokens: 1000,
        thinking_tokens: 0,
        cache_hit: false,
        cost: 0.008,
        created_at: "2024-06-15T10:02:00Z",
        call_count: 3,
      },
    });
    render(<AdminCostFooter />);
    expect(screen.getByText("$0.0080")).toBeInTheDocument();
    expect(screen.getByText("(3 calls)")).toBeInTheDocument();
    expect(screen.getByText(/3.4k tokens/)).toBeInTheDocument();
  });

  it("displays cache hit with $0 for all-cached transaction", () => {
    mockUseAdminRole.mockReturnValue({ isAdmin: true, loading: false });
    mockUseLastTransaction.mockReturnValue({
      lastTx: {
        request_type: "define",
        prompt_tokens: 0,
        candidates_tokens: 0,
        thinking_tokens: 0,
        cache_hit: true,
        cost: 0,
        created_at: "2024-06-15T10:00:00Z",
        call_count: 1,
      },
    });
    render(<AdminCostFooter />);
    expect(screen.getByText(/cache hit/)).toBeInTheDocument();
    expect(screen.getByText(/\$0/)).toBeInTheDocument();
  });

  it("formats 'define' request type as 'Definition'", () => {
    mockUseAdminRole.mockReturnValue({ isAdmin: true, loading: false });
    mockUseLastTransaction.mockReturnValue({
      lastTx: {
        request_type: "define",
        prompt_tokens: 500,
        candidates_tokens: 200,
        thinking_tokens: 0,
        cache_hit: false,
        cost: 0.002,
        created_at: "2024-06-15T10:00:00Z",
        call_count: 1,
      },
    });
    render(<AdminCostFooter />);
    expect(screen.getByText(/Definition/)).toBeInTheDocument();
  });

  it("formats tokens under 1000 as plain numbers", () => {
    mockUseAdminRole.mockReturnValue({ isAdmin: true, loading: false });
    mockUseLastTransaction.mockReturnValue({
      lastTx: {
        request_type: "translate",
        prompt_tokens: 300,
        candidates_tokens: 200,
        thinking_tokens: 0,
        cache_hit: false,
        cost: 0.001,
        created_at: "2024-06-15T10:00:00Z",
        call_count: 1,
      },
    });
    render(<AdminCostFooter />);
    expect(screen.getByText(/500 tokens/)).toBeInTheDocument();
  });

  it("includes thinking tokens in the total token display", () => {
    mockUseAdminRole.mockReturnValue({ isAdmin: true, loading: false });
    mockUseLastTransaction.mockReturnValue({
      lastTx: {
        request_type: "translate",
        prompt_tokens: 500,
        candidates_tokens: 200,
        thinking_tokens: 1300,
        cache_hit: false,
        cost: 0.015,
        created_at: "2024-06-15T10:00:00Z",
        call_count: 1,
      },
    });
    render(<AdminCostFooter />);
    // 500 + 200 + 1300 = 2000 → 2.0k
    expect(screen.getByText(/2.0k tokens/)).toBeInTheDocument();
  });

  it("renders link to admin dashboard", () => {
    mockUseAdminRole.mockReturnValue({ isAdmin: true, loading: false });
    mockUseLastTransaction.mockReturnValue({ lastTx: null });
    render(<AdminCostFooter />);
    const link = screen.getByText(/Usage dashboard/);
    expect(link).toHaveAttribute("href", "/admin");
  });
});
