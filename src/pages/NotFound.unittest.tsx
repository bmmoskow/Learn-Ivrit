import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import NotFound from "./NotFound";

describe("NotFound", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("should render the 404 heading", () => {
    render(
      <MemoryRouter initialEntries={["/non-existent-page"]}>
        <Routes>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText("404")).toBeInTheDocument();
  });

  it("should render the error message", () => {
    render(
      <MemoryRouter initialEntries={["/non-existent-page"]}>
        <Routes>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText("Oops! Page not found")).toBeInTheDocument();
  });

  it("should render a link to return home", () => {
    render(
      <MemoryRouter initialEntries={["/non-existent-page"]}>
        <Routes>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </MemoryRouter>
    );
    const link = screen.getByText("Return to Home");
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/");
  });

  it("should log the error to console when rendered", () => {
    const consoleSpy = vi.spyOn(console, "error");
    render(
      <MemoryRouter initialEntries={["/invalid-route"]}>
        <Routes>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </MemoryRouter>
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      "404 Error: User attempted to access non-existent route:",
      "/invalid-route"
    );
  });

  it("should have the correct layout classes", () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/not-found"]}>
        <Routes>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </MemoryRouter>
    );
    const mainDiv = container.querySelector('.flex.min-h-screen.items-center.justify-center.bg-gray-100');
    expect(mainDiv).toBeInTheDocument();
  });

  it("should display content in a centered layout", () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/not-found"]}>
        <Routes>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </MemoryRouter>
    );
    const centerDiv = container.querySelector('.text-center');
    expect(centerDiv).toBeInTheDocument();
  });
});
