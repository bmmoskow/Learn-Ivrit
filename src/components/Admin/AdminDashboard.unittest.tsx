import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AdminDashboard } from "./AdminDashboard";

const mockLogs = [
  {
    id: "1",
    created_at: "2024-03-15T10:00:00Z",
    request_type: "translate",
    model: "gemini-2.0-flash-exp",
    user_id: "user-123",
    prompt_tokens: 100,
    candidates_tokens: 50,
    thinking_tokens: 10,
    computed_cost: 0.0015,
    cache_hit: false,
  },
  {
    id: "2",
    created_at: "2024-03-15T11:00:00Z",
    request_type: "define",
    model: "gemini-2.0-flash-exp",
    user_id: "guest-user",
    prompt_tokens: 80,
    candidates_tokens: 40,
    thinking_tokens: 0,
    computed_cost: 0.0012,
    cache_hit: true,
  },
  {
    id: "3",
    created_at: "2024-03-15T12:00:00Z",
    request_type: "ocr",
    model: "gemini-1.5-flash",
    user_id: "user-456",
    prompt_tokens: 200,
    candidates_tokens: 100,
    thinking_tokens: 20,
    computed_cost: 0.0032,
    cache_hit: false,
  },
];

vi.mock("./useAdmin", () => ({
  useAdmin: vi.fn(),
}));

vi.mock("./adminUtils", () => ({
  summarize: vi.fn(),
  REQUEST_TYPES: [
    { value: "", label: "All Types" },
    { value: "translate", label: "Translate" },
    { value: "define", label: "Define" },
  ],
  TIME_PERIODS: [
    { value: "1d", label: "Last 24 Hours" },
    { value: "7d", label: "Last 7 Days" },
    { value: "30d", label: "Last 30 Days" },
  ],
}));

vi.mock("./AdRevenueEstimator", () => ({
  AdRevenueEstimator: () => <div data-testid="ad-revenue-estimator">Ad Revenue Estimator</div>,
}));

describe("AdminDashboard", () => {
  let mockUseAdmin: ReturnType<typeof vi.fn>;
  let mockSummarize: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const adminModule = await import("./useAdmin");
    const utilsModule = await import("./adminUtils");
    mockUseAdmin = adminModule.useAdmin;
    mockSummarize = utilsModule.summarize;

    mockUseAdmin.mockReturnValue({
      logs: mockLogs,
      loading: false,
      period: "7d",
      typeFilter: "",
      setPeriod: vi.fn(),
      setTypeFilter: vi.fn(),
      fetchLogs: vi.fn(),
    });

    mockSummarize.mockReturnValue({
      totalCalls: 3,
      totalCost: 0.0059,
      cacheHits: 1,
      estimatedSavedCost: 0.0012,
      byType: {
        translate: { count: 1, cost: 0.0015 },
        define: { count: 1, cost: 0.0012 },
        ocr: { count: 1, cost: 0.0032 },
      },
      byUser: {
        "user-123": { count: 1, cost: 0.0015 },
        "guest-user": { count: 1, cost: 0.0012 },
        "user-456": { count: 1, cost: 0.0032 },
      },
    });
  });

  it("renders dashboard title and description", () => {
    render(<AdminDashboard />);

    expect(screen.getByText("API Usage Dashboard")).toBeInTheDocument();
    expect(screen.getByText(/monitor gemini api calls/i)).toBeInTheDocument();
  });

  it("displays summary cards with correct data", () => {
    render(<AdminDashboard />);

    expect(screen.getByText("Total API Calls")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();

    expect(screen.getByText("Estimated Cost")).toBeInTheDocument();
    expect(screen.getByText("$0.0059")).toBeInTheDocument();

    expect(screen.getByText("Avg Cost / Call")).toBeInTheDocument();
    expect(screen.getByText("$0.001967")).toBeInTheDocument();
  });

  it("displays cache savings information", () => {
    render(<AdminDashboard />);

    expect(screen.getByText(/cache hits.*api calls saved/i)).toBeInTheDocument();
    const cacheHits = screen.getAllByText("1");
    expect(cacheHits.length).toBeGreaterThan(0);

    expect(screen.getByText(/est.*cost savings/i)).toBeInTheDocument();
    const costSavings = screen.getAllByText("$0.0012");
    expect(costSavings.length).toBeGreaterThan(0);

    expect(screen.getByText(/avg savings.*cache hit/i)).toBeInTheDocument();
  });

  it("calculates average cost per call correctly", () => {
    render(<AdminDashboard />);

    const avgCost = 0.0059 / 3;
    expect(screen.getByText(`$${avgCost.toFixed(6)}`)).toBeInTheDocument();
  });

  it("handles zero total calls for average cost calculation", () => {
    mockSummarize.mockReturnValue({
      totalCalls: 0,
      totalCost: 0,
      cacheHits: 0,
      estimatedSavedCost: 0,
      byType: {},
      byUser: {},
    });

    render(<AdminDashboard />);

    const zeroValues = screen.getAllByText("$0.00");
    expect(zeroValues.length).toBeGreaterThan(0);
  });

  it("handles zero cache hits for average savings calculation", () => {
    mockSummarize.mockReturnValue({
      totalCalls: 3,
      totalCost: 0.0059,
      cacheHits: 0,
      estimatedSavedCost: 0,
      byType: {},
      byUser: {},
    });

    render(<AdminDashboard />);

    const avgSavingsTexts = screen.getAllByText("$0.00");
    expect(avgSavingsTexts.length).toBeGreaterThan(0);
  });

  it("renders period filter with correct options", () => {
    render(<AdminDashboard />);

    const periodSelect = screen.getByDisplayValue("Last 7 Days");
    expect(periodSelect).toBeInTheDocument();

    fireEvent.click(periodSelect);
    expect(screen.getByText("Last 24 Hours")).toBeInTheDocument();
    expect(screen.getByText("Last 30 Days")).toBeInTheDocument();
  });

  it("renders type filter with correct options", () => {
    render(<AdminDashboard />);

    const typeSelect = screen.getByDisplayValue("All Types");
    expect(typeSelect).toBeInTheDocument();

    fireEvent.click(typeSelect);
    expect(screen.getByText("Translate")).toBeInTheDocument();
    expect(screen.getByText("Define")).toBeInTheDocument();
  });

  it("calls setPeriod when period filter changes", () => {
    const mockSetPeriod = vi.fn();
    mockUseAdmin.mockReturnValue({
      logs: mockLogs,
      loading: false,
      period: "7d",
      typeFilter: "",
      setPeriod: mockSetPeriod,
      setTypeFilter: vi.fn(),
      fetchLogs: vi.fn(),
    });

    render(<AdminDashboard />);

    const periodSelect = screen.getByDisplayValue("Last 7 Days");
    fireEvent.change(periodSelect, { target: { value: "30d" } });

    expect(mockSetPeriod).toHaveBeenCalledWith("30d");
  });

  it("calls setTypeFilter when type filter changes", () => {
    const mockSetTypeFilter = vi.fn();
    mockUseAdmin.mockReturnValue({
      logs: mockLogs,
      loading: false,
      period: "7d",
      typeFilter: "",
      setPeriod: vi.fn(),
      setTypeFilter: mockSetTypeFilter,
      fetchLogs: vi.fn(),
    });

    render(<AdminDashboard />);

    const typeSelect = screen.getByDisplayValue("All Types");
    fireEvent.change(typeSelect, { target: { value: "translate" } });

    expect(mockSetTypeFilter).toHaveBeenCalledWith("translate");
  });

  it("calls fetchLogs when refresh button is clicked", () => {
    const mockFetchLogs = vi.fn();
    mockUseAdmin.mockReturnValue({
      logs: mockLogs,
      loading: false,
      period: "7d",
      typeFilter: "",
      setPeriod: vi.fn(),
      setTypeFilter: vi.fn(),
      fetchLogs: mockFetchLogs,
    });

    render(<AdminDashboard />);

    const refreshButton = screen.getByText("Refresh");
    fireEvent.click(refreshButton);

    expect(mockFetchLogs).toHaveBeenCalled();
  });

  it("calls fetchLogs on mount via useEffect", () => {
    const mockFetchLogs = vi.fn();
    mockUseAdmin.mockReturnValue({
      logs: [],
      loading: false,
      period: "7d",
      typeFilter: "",
      setPeriod: vi.fn(),
      setTypeFilter: vi.fn(),
      fetchLogs: mockFetchLogs,
    });

    render(<AdminDashboard />);

    expect(mockFetchLogs).toHaveBeenCalled();
  });

  it("displays breakdown by request type", () => {
    render(<AdminDashboard />);

    expect(screen.getByText("By Request Type")).toBeInTheDocument();

    const table = screen.getByText("By Request Type").closest("div");
    expect(table).toHaveTextContent("translate");
    expect(table).toHaveTextContent("define");
    expect(table).toHaveTextContent("ocr");
  });

  it("displays breakdown by user", () => {
    render(<AdminDashboard />);

    expect(screen.getByText("By User")).toBeInTheDocument();

    const table = screen.getByText("By User").closest("div");
    expect(table).toHaveTextContent("user-123");
    expect(table).toHaveTextContent("guest-user");
    expect(table).toHaveTextContent("user-456");
  });

  it("renders AdRevenueEstimator component", () => {
    render(<AdminDashboard />);

    const adRevHeadings = screen.getAllByText("Ad Revenue Estimator");
    expect(adRevHeadings.length).toBeGreaterThan(0);
    expect(screen.getByTestId("ad-revenue-estimator")).toBeInTheDocument();
  });

  it("displays recent logs table with correct data", () => {
    render(<AdminDashboard />);

    expect(screen.getByText("Recent Calls")).toBeInTheDocument();

    const translateCells = screen.getAllByText("translate");
    expect(translateCells.length).toBeGreaterThan(0);

    const defineCells = screen.getAllByText("define");
    expect(defineCells.length).toBeGreaterThan(0);

    const ocrCells = screen.getAllByText("ocr");
    expect(ocrCells.length).toBeGreaterThan(0);

    expect(screen.getAllByText("gemini-2.0-flash-exp").length).toBeGreaterThan(0);
    expect(screen.getByText("gemini-1.5-flash")).toBeInTheDocument();

    expect(screen.getByText("Guest")).toBeInTheDocument();
  });

  it("truncates user IDs in logs table", () => {
    render(<AdminDashboard />);

    const userCells = screen.getAllByText(/user-/);
    userCells.forEach((cell) => {
      if (cell.textContent !== "Guest") {
        expect(cell.textContent?.length).toBeLessThanOrEqual(8);
      }
    });
  });

  it("displays cache hit status correctly", () => {
    render(<AdminDashboard />);

    expect(screen.getByText("Hit")).toBeInTheDocument();
    expect(screen.getAllByText("Miss")).toHaveLength(2);
  });

  it("limits logs display to 50 entries", () => {
    const manyLogs = Array.from({ length: 100 }, (_, i) => ({
      id: `log-${i}`,
      created_at: "2024-03-15T10:00:00Z",
      request_type: "translate",
      model: "gemini-2.0-flash-exp",
      user_id: `user-${i}`,
      prompt_tokens: 100,
      candidates_tokens: 50,
      thinking_tokens: 10,
      computed_cost: 0.0015,
      cache_hit: false,
    }));

    mockUseAdmin.mockReturnValue({
      logs: manyLogs,
      loading: false,
      period: "7d",
      typeFilter: "",
      setPeriod: vi.fn(),
      setTypeFilter: vi.fn(),
      fetchLogs: vi.fn(),
    });

    mockSummarize.mockReturnValue({
      totalCalls: 100,
      totalCost: 0.15,
      cacheHits: 0,
      estimatedSavedCost: 0,
      byType: {
        translate: { count: 100, cost: 0.15 },
      },
      byUser: {},
    });

    render(<AdminDashboard />);

    const tableBody = document.querySelector("tbody");
    const dataRows = tableBody?.querySelectorAll("tr") || [];
    expect(dataRows.length).toBeLessThanOrEqual(50);
  });

  it("shows loading indicator when loading", () => {
    mockUseAdmin.mockReturnValue({
      logs: [],
      loading: true,
      period: "7d",
      typeFilter: "",
      setPeriod: vi.fn(),
      setTypeFilter: vi.fn(),
      fetchLogs: vi.fn(),
    });

    render(<AdminDashboard />);

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("shows empty state when no logs are available", () => {
    mockUseAdmin.mockReturnValue({
      logs: [],
      loading: false,
      period: "7d",
      typeFilter: "",
      setPeriod: vi.fn(),
      setTypeFilter: vi.fn(),
      fetchLogs: vi.fn(),
    });

    render(<AdminDashboard />);

    expect(screen.getByText(/no api calls logged for this period/i)).toBeInTheDocument();
  });

  it("displays thinking tokens with zero when missing", () => {
    render(<AdminDashboard />);

    const thinkingTokenCells = screen.getAllByRole("cell");
    const hasZeroThinkingTokens = thinkingTokenCells.some(
      (cell) => cell.textContent === "0"
    );
    expect(hasZeroThinkingTokens).toBe(true);
  });

  it("formats dates correctly in logs table", () => {
    render(<AdminDashboard />);

    const dateCells = document.querySelectorAll("td.whitespace-nowrap");
    dateCells.forEach((cell) => {
      expect(cell.textContent).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/);
    });
  });

  it("displays model name with fallback to em dash", () => {
    const logsWithNullModel = [
      {
        ...mockLogs[0],
        model: null,
      },
    ];

    mockUseAdmin.mockReturnValue({
      logs: logsWithNullModel,
      loading: false,
      period: "7d",
      typeFilter: "",
      setPeriod: vi.fn(),
      setTypeFilter: vi.fn(),
      fetchLogs: vi.fn(),
    });

    render(<AdminDashboard />);

    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("renders all table headers correctly", () => {
    render(<AdminDashboard />);

    expect(screen.getByText("Time")).toBeInTheDocument();
    const typeCells = screen.getAllByText("Type");
    expect(typeCells.length).toBeGreaterThan(0);
    expect(screen.getByText("Model")).toBeInTheDocument();
    const userCells = screen.getAllByText("User");
    expect(userCells.length).toBeGreaterThan(0);
    expect(screen.getByText("Prompt Tokens")).toBeInTheDocument();
    expect(screen.getByText("Candidates Tokens")).toBeInTheDocument();
    expect(screen.getByText("Thinking Tokens")).toBeInTheDocument();
    const costCells = screen.getAllByText("Cost");
    expect(costCells.length).toBeGreaterThan(0);
    expect(screen.getByText("Cache")).toBeInTheDocument();
  });

  it("displays cost with 6 decimal places in logs table", () => {
    render(<AdminDashboard />);

    const costCells = document.querySelectorAll("td");
    const costTexts = Array.from(costCells).map(cell => cell.textContent);

    expect(costTexts.some(text => text?.includes("$0.001500"))).toBe(true);
    expect(costTexts.some(text => text?.includes("$0.001200"))).toBe(true);
    expect(costTexts.some(text => text?.includes("$0.003200"))).toBe(true);
  });
});
