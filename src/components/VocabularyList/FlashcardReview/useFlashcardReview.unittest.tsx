import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useFlashcardReview } from "./useFlashcardReview";
import type { WordWithStats } from "../../../utils/adaptiveAlgorithm/adaptiveAlgorithmUtils";

// Review is guest-mode here: pure, no auth, no backend. We mock the auth context
// and the shared adaptive selection so the hook deterministically receives a
// small fixed deck and we can focus on the flip/navigation behavior.
vi.mock("../../../contexts/AuthContext/AuthContext", () => ({
  useAuth: () => ({ user: null, isGuest: true }),
}));

const makeWord = (id: string, hebrew: string, english: string): WordWithStats => ({
  id,
  user_id: "guest",
  hebrew_word: hebrew,
  english_translation: english,
  definition: english,
  transliteration: "",
  created_at: null,
  updated_at: null,
});

const DECK = [
  makeWord("1", "שלום", "hello"),
  makeWord("2", "תודה", "thanks"),
  makeWord("3", "כן", "yes"),
];

const selectAdaptiveWordsMock = vi.fn();

vi.mock("../../../utils/adaptiveAlgorithm/selectAdaptiveWords", () => ({
  selectAdaptiveWords: (...args: unknown[]) => selectAdaptiveWordsMock(...args),
}));

describe("useFlashcardReview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectAdaptiveWordsMock.mockResolvedValue(DECK);
  });

  it("loads an adaptively-selected deck and starts on the first card, face down", async () => {
    const { result } = renderHook(() => useFlashcardReview());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.words).toEqual(DECK);
    expect(result.current.currentIndex).toBe(0);
    expect(result.current.showAnswer).toBe(false);
    expect(result.current.currentWord).toEqual(DECK[0]);
    expect(result.current.hasPrevious).toBe(false);
    expect(result.current.hasNext).toBe(true);
  });

  it("reveals the answer without advancing", async () => {
    const { result } = renderHook(() => useFlashcardReview());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.revealAnswer();
    });

    expect(result.current.showAnswer).toBe(true);
    expect(result.current.currentIndex).toBe(0);
  });

  it("advances to the next card and re-hides the answer", async () => {
    const { result } = renderHook(() => useFlashcardReview());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.revealAnswer();
    });
    act(() => {
      result.current.goToNext();
    });

    expect(result.current.currentIndex).toBe(1);
    expect(result.current.showAnswer).toBe(false);
    expect(result.current.currentWord).toEqual(DECK[1]);
  });

  it("goes back to the previous card", async () => {
    const { result } = renderHook(() => useFlashcardReview());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.goToNext();
    });
    act(() => {
      result.current.goToPrevious();
    });

    expect(result.current.currentIndex).toBe(0);
    expect(result.current.showAnswer).toBe(false);
  });

  it("does not advance past the last card", async () => {
    const { result } = renderHook(() => useFlashcardReview());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.goToNext();
    });
    act(() => {
      result.current.goToNext();
    });
    // Already on the last card (index 2 of a 3-card deck).
    expect(result.current.currentIndex).toBe(2);
    expect(result.current.hasNext).toBe(false);

    act(() => {
      result.current.goToNext();
    });
    expect(result.current.currentIndex).toBe(2);
  });

  it("does not step back before the first card", async () => {
    const { result } = renderHook(() => useFlashcardReview());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.goToPrevious();
    });

    expect(result.current.currentIndex).toBe(0);
  });

  it("exposes no scoring surface (review is practice only)", async () => {
    const { result } = renderHook(() => useFlashcardReview());
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Guard against regressions that would re-introduce self-grading.
    expect(result.current).not.toHaveProperty("handleCorrect");
    expect(result.current).not.toHaveProperty("handleIncorrect");
    expect(result.current).not.toHaveProperty("onAnswer");
  });
});
