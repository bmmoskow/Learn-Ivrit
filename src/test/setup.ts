import "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// Mock localStorage for jsdom
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};

Object.defineProperty(globalThis, "localStorage", {
  value: localStorageMock,
  writable: true,
});

// Polyfill for Radix UI components that use pointer capture
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false;
}

if (!Element.prototype.releasePointerCapture) {
  Element.prototype.releasePointerCapture = () => {};
}

// Polyfill for scrollIntoView used by Radix UI Select
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}
