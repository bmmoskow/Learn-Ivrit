/* eslint-disable react-refresh/only-export-components */
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ErrorBoundary } from "./ErrorBoundary";

const Boom = (): never => {
  throw new Error("boom");
};

describe("ErrorBoundary", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders children when there is no error", () => {
    render(
      <ErrorBoundary>
        <div>hello world</div>
      </ErrorBoundary>,
    );

    expect(screen.getByText("hello world")).toBeInTheDocument();
  });

  it("renders the recovery UI when a child throws during render", () => {
    // React logs the caught error to console.error; silence it for a clean run.
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );

    expect(screen.getByRole("heading", { name: /something went wrong/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^reload$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /reset app data/i })).toBeInTheDocument();

    errorSpy.mockRestore();
  });

  it("'Reset app data' clears localStorage and reloads", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const reload = vi.fn();
    const originalLocation = window.location;
    Object.defineProperty(window, "location", {
      value: { ...originalLocation, reload },
      writable: true,
      configurable: true,
    });

    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );

    fireEvent.click(screen.getByRole("button", { name: /reset app data/i }));

    expect(localStorage.clear).toHaveBeenCalled();
    expect(reload).toHaveBeenCalled();

    Object.defineProperty(window, "location", {
      value: originalLocation,
      writable: true,
      configurable: true,
    });
    errorSpy.mockRestore();
  });
});
