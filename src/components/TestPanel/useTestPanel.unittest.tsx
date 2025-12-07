import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTestPanel } from "./useTestPanel";
import { AuthProvider } from "../../contexts/AuthContext/AuthContext";
import type { ReactNode } from "react";

// Mock Supabase client
vi.mock("../../../supabase/client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
      upsert: vi.fn().mockResolvedValue({ error: null }),
    }),
    rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
  },
}));

// Mock localStorage
const localStorageMock = {
  store: {} as Record<string, string>,
  getItem: vi.fn((key: string) => localStorageMock.store[key] || null),
  setItem: vi.fn((key: string, value: string) => {
    localStorageMock.store[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete localStorageMock.store[key];
  }),
  clear: vi.fn(() => {
    localStorageMock.store = {};
  }),
  get length() {
    return Object.keys(localStorageMock.store).length;
  },
  key: vi.fn((index: number) => Object.keys(localStorageMock.store)[index] || null),
};

Object.defineProperty(window, "localStorage", { value: localStorageMock });

const wrapper = ({ children }: { children: ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe("useTestPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  describe("initial state", () => {
    it("should have correct initial values", () => {
      const { result } = renderHook(() => useTestPanel(), { wrapper });

      // Initial state before any async operations complete
      expect(result.current.testType).toBeNull();
      expect(result.current.questionCount).toBe(10);
      expect(result.current.currentTest).toEqual([]);
      expect(result.current.currentQuestionIndex).toBe(0);
      expect(result.current.showResults).toBe(false);
      expect(result.current.testId).toBeNull();
      expect(result.current.minQuestionCount).toBe(5);
    });
  });

  describe("setQuestionCount", () => {
    it("should update question count", () => {
      const { result } = renderHook(() => useTestPanel(), { wrapper });

      act(() => {
        result.current.setQuestionCount(20);
      });

      expect(result.current.questionCount).toBe(20);
    });

    it("should update to minimum value", () => {
      const { result } = renderHook(() => useTestPanel(), { wrapper });

      act(() => {
        result.current.setQuestionCount(5);
      });

      expect(result.current.questionCount).toBe(5);
    });
  });

  describe("resetTest", () => {
    it("should reset test state to initial values", () => {
      const { result } = renderHook(() => useTestPanel(), { wrapper });

      // Manually set some state then reset
      act(() => {
        result.current.setQuestionCount(25);
      });

      expect(result.current.questionCount).toBe(25);

      act(() => {
        result.current.resetTest();
      });

      expect(result.current.testType).toBeNull();
      expect(result.current.currentTest).toEqual([]);
      expect(result.current.currentQuestionIndex).toBe(0);
      expect(result.current.showResults).toBe(false);
    });
  });

  describe("derived values", () => {
    it("should have correct minQuestionCount constant", () => {
      const { result } = renderHook(() => useTestPanel(), { wrapper });
      expect(result.current.minQuestionCount).toBe(5);
    });

    it("should have currentQuestion as null when no test active", () => {
      const { result } = renderHook(() => useTestPanel(), { wrapper });
      expect(result.current.currentQuestion).toBeNull();
    });
  });

  describe("startTest without words", () => {
    it("should not start test when no words available", async () => {
      const { result } = renderHook(() => useTestPanel(), { wrapper });

      // With empty words, startTest should not change testType
      await act(async () => {
        await result.current.startTest("flashcard");
      });

      expect(result.current.testType).toBeNull();
      expect(result.current.currentTest).toEqual([]);
    });
  });
});
