import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import Admin from "./Admin";

vi.mock("../../hooks/useAdminRole", () => ({
  useAdminRole: vi.fn(),
}));

vi.mock("../../contexts/AuthContext/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("./AdminDashboard", () => ({
  AdminDashboard: () => <div data-testid="admin-dashboard">Admin Dashboard</div>,
}));

describe("Admin", () => {
  let mockUseAdminRole: ReturnType<typeof vi.fn>;
  let mockUseAuth: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const adminRoleModule = await import("../../hooks/useAdminRole");
    const authModule = await import("../../contexts/AuthContext/AuthContext");
    mockUseAdminRole = adminRoleModule.useAdminRole as ReturnType<typeof vi.fn>;
    mockUseAuth = authModule.useAuth as ReturnType<typeof vi.fn>;
  });

  it("shows loading spinner when auth is loading", () => {
    mockUseAuth.mockReturnValue({ loading: true });
    mockUseAdminRole.mockReturnValue({ isAdmin: false, loading: false });

    render(<Admin />);

    const spinner = document.querySelector(".animate-spin");
    expect(spinner).toBeInTheDocument();
  });

  it("shows loading spinner when role is loading", () => {
    mockUseAuth.mockReturnValue({ loading: false });
    mockUseAdminRole.mockReturnValue({ isAdmin: false, loading: true });

    render(<Admin />);

    const spinner = document.querySelector(".animate-spin");
    expect(spinner).toBeInTheDocument();
  });

  it("shows loading spinner when both auth and role are loading", () => {
    mockUseAuth.mockReturnValue({ loading: true });
    mockUseAdminRole.mockReturnValue({ isAdmin: false, loading: true });

    render(<Admin />);

    const spinner = document.querySelector(".animate-spin");
    expect(spinner).toBeInTheDocument();
  });

  it("shows access denied message when user is not admin", () => {
    mockUseAuth.mockReturnValue({ loading: false });
    mockUseAdminRole.mockReturnValue({ isAdmin: false, loading: false });

    render(<Admin />);

    expect(screen.getByText(/access denied/i)).toBeInTheDocument();
    expect(screen.getByText(/admin privileges required/i)).toBeInTheDocument();
  });

  it("renders AdminDashboard when user is admin", () => {
    mockUseAuth.mockReturnValue({ loading: false });
    mockUseAdminRole.mockReturnValue({ isAdmin: true, loading: false });

    render(<Admin />);

    expect(screen.getByTestId("admin-dashboard")).toBeInTheDocument();
    expect(screen.queryByText(/access denied/i)).not.toBeInTheDocument();
  });

  it("does not render AdminDashboard when loading", () => {
    mockUseAuth.mockReturnValue({ loading: true });
    mockUseAdminRole.mockReturnValue({ isAdmin: true, loading: true });

    render(<Admin />);

    expect(screen.queryByTestId("admin-dashboard")).not.toBeInTheDocument();
  });

  it("does not render AdminDashboard when not admin", () => {
    mockUseAuth.mockReturnValue({ loading: false });
    mockUseAdminRole.mockReturnValue({ isAdmin: false, loading: false });

    render(<Admin />);

    expect(screen.queryByTestId("admin-dashboard")).not.toBeInTheDocument();
  });

  it("transitions from loading to access denied", () => {
    mockUseAuth.mockReturnValue({ loading: true });
    mockUseAdminRole.mockReturnValue({ isAdmin: false, loading: true });

    const { rerender } = render(<Admin />);

    expect(document.querySelector(".animate-spin")).toBeInTheDocument();

    mockUseAuth.mockReturnValue({ loading: false });
    mockUseAdminRole.mockReturnValue({ isAdmin: false, loading: false });

    rerender(<Admin />);

    expect(document.querySelector(".animate-spin")).not.toBeInTheDocument();
    expect(screen.getByText(/access denied/i)).toBeInTheDocument();
  });

  it("transitions from loading to admin dashboard", () => {
    mockUseAuth.mockReturnValue({ loading: true });
    mockUseAdminRole.mockReturnValue({ isAdmin: true, loading: true });

    const { rerender } = render(<Admin />);

    expect(document.querySelector(".animate-spin")).toBeInTheDocument();

    mockUseAuth.mockReturnValue({ loading: false });
    mockUseAdminRole.mockReturnValue({ isAdmin: true, loading: false });

    rerender(<Admin />);

    expect(document.querySelector(".animate-spin")).not.toBeInTheDocument();
    expect(screen.getByTestId("admin-dashboard")).toBeInTheDocument();
  });

  it("renders correct loading spinner styles", () => {
    mockUseAuth.mockReturnValue({ loading: true });
    mockUseAdminRole.mockReturnValue({ isAdmin: false, loading: false });

    render(<Admin />);

    const spinner = document.querySelector(".animate-spin");
    expect(spinner).toHaveClass("rounded-full");
    expect(spinner).toHaveClass("h-12");
    expect(spinner).toHaveClass("w-12");
    expect(spinner).toHaveClass("border-b-2");
    expect(spinner).toHaveClass("border-blue-600");
  });

  it("renders access denied with correct styling", () => {
    mockUseAuth.mockReturnValue({ loading: false });
    mockUseAdminRole.mockReturnValue({ isAdmin: false, loading: false });

    render(<Admin />);

    const message = screen.getByText(/access denied/i);
    expect(message).toHaveClass("text-gray-500");
    expect(message).toHaveClass("text-lg");
  });
});
