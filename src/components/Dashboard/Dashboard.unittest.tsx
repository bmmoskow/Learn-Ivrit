import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { Dashboard } from "./Dashboard";
import type { DashboardStats } from "./useDashboard";

vi.mock("./useDashboard", () => ({
  useDashboard: vi.fn(),
  formatTestType: vi.fn((type: string) => type),
  formatDate: vi.fn((date: string) => date),
}));

const mockStats: DashboardStats = {
  totalWords: 50,
  testsCompleted: 10,
  averageScore: 85,
  studyStreak: 5,
  weakWords: [
    {
      id: "1",
      hebrew_word: "שלום",
      english_translation: "peace, hello",
      statistics: {
        confidence_score: 45,
        correct_count: 3,
        total_attempts: 10,
        consecutive_correct: 1,
      },
    },
  ],
  recentTests: [
    {
      id: "test-1",
      test_type: "flashcard",
      score_percentage: 90,
      correct_answers: 9,
      total_questions: 10,
      duration_seconds: 120,
      completed_at: "2024-01-15",
    },
  ],
};

describe("Dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render loading state", async () => {
    const { useDashboard } = await import("./useDashboard");
    vi.mocked(useDashboard).mockReturnValue({
      stats: mockStats,
      loading: true,
    });

    render(<Dashboard />);
    const spinner = document.querySelector(".animate-spin");
    expect(spinner).toBeInTheDocument();
  });

  it("should render dashboard with stats", async () => {
    const { useDashboard } = await import("./useDashboard");
    vi.mocked(useDashboard).mockReturnValue({
      stats: mockStats,
      loading: false,
    });

    render(<Dashboard />);
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Track your Hebrew learning progress")).toBeInTheDocument();
  });

  it("should display total words stat", async () => {
    const { useDashboard } = await import("./useDashboard");
    vi.mocked(useDashboard).mockReturnValue({
      stats: mockStats,
      loading: false,
    });

    render(<Dashboard />);
    expect(screen.getByText("50")).toBeInTheDocument();
    expect(screen.getByText("Words Learned")).toBeInTheDocument();
  });

  it("should display tests completed stat", async () => {
    const { useDashboard } = await import("./useDashboard");
    vi.mocked(useDashboard).mockReturnValue({
      stats: mockStats,
      loading: false,
    });

    render(<Dashboard />);
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("Tests Completed")).toBeInTheDocument();
  });

  it("should display average score stat", async () => {
    const { useDashboard } = await import("./useDashboard");
    vi.mocked(useDashboard).mockReturnValue({
      stats: mockStats,
      loading: false,
    });

    render(<Dashboard />);
    expect(screen.getByText("85%")).toBeInTheDocument();
    expect(screen.getByText("Average Score")).toBeInTheDocument();
  });

  it("should display study streak stat", async () => {
    const { useDashboard } = await import("./useDashboard");
    vi.mocked(useDashboard).mockReturnValue({
      stats: mockStats,
      loading: false,
    });

    render(<Dashboard />);
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("Day Streak")).toBeInTheDocument();
  });

  it("should render weak words section", async () => {
    const { useDashboard } = await import("./useDashboard");
    vi.mocked(useDashboard).mockReturnValue({
      stats: mockStats,
      loading: false,
    });

    render(<Dashboard />);
    expect(screen.getByText("Words to Practice")).toBeInTheDocument();
    expect(screen.getByText("שלום")).toBeInTheDocument();
    expect(screen.getByText("peace, hello")).toBeInTheDocument();
  });

  it("should show no data message when no weak words", async () => {
    const { useDashboard } = await import("./useDashboard");
    vi.mocked(useDashboard).mockReturnValue({
      stats: { ...mockStats, weakWords: [] },
      loading: false,
    });

    render(<Dashboard />);
    expect(screen.getByText("No test data yet. Take a test to see which words need practice!")).toBeInTheDocument();
  });

  it("should render recent tests section", async () => {
    const { useDashboard } = await import("./useDashboard");
    vi.mocked(useDashboard).mockReturnValue({
      stats: mockStats,
      loading: false,
    });

    render(<Dashboard />);
    expect(screen.getByText("Recent Tests")).toBeInTheDocument();
  });

  it("should show no tests message when no recent tests", async () => {
    const { useDashboard } = await import("./useDashboard");
    vi.mocked(useDashboard).mockReturnValue({
      stats: { ...mockStats, recentTests: [] },
      loading: false,
    });

    render(<Dashboard />);
    expect(screen.getByText("No tests completed yet. Start testing your knowledge!")).toBeInTheDocument();
  });

  it("should display weak word statistics correctly", async () => {
    const { useDashboard } = await import("./useDashboard");
    vi.mocked(useDashboard).mockReturnValue({
      stats: mockStats,
      loading: false,
    });

    render(<Dashboard />);
    expect(screen.getByText("45% mastery")).toBeInTheDocument();
    expect(screen.getByText("3/10 correct")).toBeInTheDocument();
    expect(screen.getByText("Streak: 1")).toBeInTheDocument();
  });

  it("should display recent test details correctly", async () => {
    const { useDashboard } = await import("./useDashboard");
    vi.mocked(useDashboard).mockReturnValue({
      stats: mockStats,
      loading: false,
    });

    render(<Dashboard />);
    expect(screen.getByText("90%")).toBeInTheDocument();
    expect(screen.getByText("9/10 correct")).toBeInTheDocument();
  });
});
