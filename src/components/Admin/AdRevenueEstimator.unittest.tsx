import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AdRevenueEstimator } from "./AdRevenueEstimator";

const mockStrategyEstimates = [
  {
    programKey: "google_adsense",
    programName: "Google Adsense",
    company: "Google",
    strategyName: "single_high_viewability_unit",
    strategyDescription: "Use one strong above-the-fold unit",
    officialUrl: "https://support.google.com/adsense/answer/180195",
    cpm: 2.5,
    estimatedRevenue: 3.4,
    estimatedImpressions: 1000,
    estimatedRpm: 0.68,
    formula: "estimated_revenue = (pageviews * ad_slots_per_page * fill_rate * viewability_rate * cpm / 1000)",
    programCpm: {
      value: "$2.5",
      source: "https://www.ezoic.com/publisher-resources/adsense-cpm-rates/",
      confidence: "medium",
    },
    trafficRequirement: {
      value: "No minimum traffic requirement",
      source: "https://support.google.com/adsense",
      confidence: "high",
    },
    inputs: {
      pageviews: 5000,
    },
    parameters: {
      ad_slots_per_page: { value: 2, source: "None", confidence: "medium" },
      fill_rate: { value: 0.9, source: "None", confidence: "medium" },
      viewability_rate: { value: 0.7, source: "None", confidence: "medium" },
      cpm: { value: 2.5, source: "None", confidence: "medium" },
    },
  },
  {
    programKey: "ezoic_access_now",
    programName: "Ezoic Access Now",
    company: "Ezoic",
    strategyName: "balanced_multi_slot_layout",
    strategyDescription: "Use moderate in-content and sidebar units",
    officialUrl: "https://www.ezoic.com/monetization/",
    cpm: 4.0,
    estimatedRevenue: 8.64,
    estimatedImpressions: 1200,
    estimatedRpm: 1.73,
    formula: "estimated_revenue = (pageviews * ad_slots_per_page * fill_rate * viewability_rate * cpm / 1000)",
    programCpm: {
      value: "$4.0",
      source: "https://www.ezoic.com/cpm-rates/",
      confidence: "medium",
    },
    trafficRequirement: {
      value: "10,000 sessions/month",
      source: "https://www.ezoic.com/requirements/",
      confidence: "high",
    },
    inputs: {
      pageviews: 5000,
    },
    parameters: {
      ad_slots_per_page: { value: 3, source: "None", confidence: "medium" },
      fill_rate: { value: 0.85, source: "None", confidence: "medium" },
      viewability_rate: { value: 0.65, source: "None", confidence: "medium" },
      cpm: { value: 4.0, source: "None", confidence: "medium" },
    },
  },
  {
    programKey: "mediavine_pro",
    programName: "Mediavine Pro",
    company: "Mediavine",
    strategyName: "session_depth_strategy",
    strategyDescription: "Increase pages per session",
    officialUrl: "https://www.mediavine.com/",
    cpm: 12.0,
    estimatedRevenue: 24.0,
    estimatedImpressions: 1500,
    estimatedRpm: 4.8,
    formula: "estimated_revenue = (sessions * pages_per_session * ad_slots_per_page * fill_rate * viewability_rate * cpm / 1000)",
    programCpm: {
      value: "$12.0",
      source: "https://www.mediavine.com/cpm/",
      confidence: "low",
    },
    trafficRequirement: {
      value: "50,000 sessions/month",
      source: "https://www.mediavine.com/apply/",
      confidence: "high",
    },
    inputs: {
      sessions: 5000,
      pagesPerSession: 1,
    },
    parameters: {
      ad_slots_per_page: { value: 4, source: "None", confidence: "high" },
      fill_rate: { value: 0.95, source: "None", confidence: "high" },
      viewability_rate: { value: 0.75, source: "None", confidence: "high" },
      cpm: { value: 12.0, source: "None", confidence: "low" },
    },
  },
];

const mockEngagement = {
  totalViews: 5000,
  totalActiveSeconds: 150000,
  totalActiveMinutes: 2500,
  avgSessionSeconds: 30,
};

vi.mock("./useAdRevenue", () => ({
  useAdRevenue: vi.fn(),
}));

describe("AdRevenueEstimator", () => {
  let mockUseAdRevenue: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const module = await import("./useAdRevenue");
    mockUseAdRevenue = module.useAdRevenue as ReturnType<typeof vi.fn>;

    mockUseAdRevenue.mockReturnValue({
      data: {
        engagement: mockEngagement,
        strategyEstimates: mockStrategyEstimates,
        period: "30d",
      },
      loading: false,
      period: "30d",
      setPeriod: vi.fn(),
      refetch: vi.fn(),
    });
  });

  describe("Period Selection and Controls", () => {
    it("renders period selector with correct default value", () => {
      render(<AdRevenueEstimator />);

      const periodSelect = screen.getByDisplayValue("Last 30 days");
      expect(periodSelect).toBeInTheDocument();
    });

    it("renders all period options", () => {
      render(<AdRevenueEstimator />);

      const periodSelect = screen.getByRole("combobox");
      fireEvent.click(periodSelect);

      expect(screen.getByText("Last 7 days")).toBeInTheDocument();
      expect(screen.getByText("Last 30 days")).toBeInTheDocument();
      expect(screen.getByText("Last 90 days")).toBeInTheDocument();
    });

    it("renders refresh button", () => {
      render(<AdRevenueEstimator />);

      const refreshButton = screen.getByRole("button", { name: /refresh/i });
      expect(refreshButton).toBeInTheDocument();
    });

    it("calls setPeriod when period is changed", () => {
      const mockSetPeriod = vi.fn();
      mockUseAdRevenue.mockReturnValue({
        data: {
          engagement: mockEngagement,
          strategyEstimates: mockStrategyEstimates,
          period: "30d",
        },
        loading: false,
        period: "30d",
        setPeriod: mockSetPeriod,
        refetch: vi.fn(),
      });

      render(<AdRevenueEstimator />);

      const periodSelect = screen.getByRole("combobox");
      fireEvent.change(periodSelect, { target: { value: "7d" } });

      expect(mockSetPeriod).toHaveBeenCalledWith("7d");
    });

    it("calls refetch when refresh button is clicked", () => {
      const mockRefetch = vi.fn();
      mockUseAdRevenue.mockReturnValue({
        data: {
          engagement: mockEngagement,
          strategyEstimates: mockStrategyEstimates,
          period: "30d",
        },
        loading: false,
        period: "30d",
        setPeriod: vi.fn(),
        refetch: mockRefetch,
      });

      render(<AdRevenueEstimator />);

      const refreshButton = screen.getByRole("button", { name: /refresh/i });
      fireEvent.click(refreshButton);

      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  describe("Loading State", () => {
    it("shows loading message when loading is true", () => {
      mockUseAdRevenue.mockReturnValue({
        data: null,
        loading: true,
        period: "30d",
        setPeriod: vi.fn(),
        refetch: vi.fn(),
      });

      render(<AdRevenueEstimator />);

      expect(screen.getByText("Loading analytics...")).toBeInTheDocument();
    });

    it("does not show loading message when loading is false", () => {
      render(<AdRevenueEstimator />);

      expect(screen.queryByText("Loading analytics...")).not.toBeInTheDocument();
    });
  });

  describe("Engagement Summary Cards", () => {
    it("displays page views card with correct data", () => {
      render(<AdRevenueEstimator />);

      expect(screen.getByText("Page Views")).toBeInTheDocument();
      expect(screen.getByText("5,000")).toBeInTheDocument();
    });

    it("displays projected monthly pageviews", () => {
      render(<AdRevenueEstimator />);

      expect(screen.getByText(/~5,000\/mo projected/)).toBeInTheDocument();
    });

    it("displays active minutes card with correct data", () => {
      render(<AdRevenueEstimator />);

      expect(screen.getByText("Active Minutes")).toBeInTheDocument();
      expect(screen.getByText("2,500")).toBeInTheDocument();
    });

    it("displays average session card with correct data", () => {
      render(<AdRevenueEstimator />);

      expect(screen.getByText("Avg Session")).toBeInTheDocument();
      expect(screen.getByText("30s")).toBeInTheDocument();
    });

    it("displays best strategy revenue card with correct data", () => {
      render(<AdRevenueEstimator />);

      expect(screen.getByText("Best Strategy")).toBeInTheDocument();
      const revenueElements = screen.getAllByText("$24.00");
      expect(revenueElements.length).toBeGreaterThan(0);
    });

    it("displays company name for best revenue", () => {
      render(<AdRevenueEstimator />);

      const bestStrategyCards = screen.getAllByText("Mediavine");
      expect(bestStrategyCards.length).toBeGreaterThan(0);
    });

    it("shows $0.00 when no strategy estimates available", () => {
      mockUseAdRevenue.mockReturnValue({
        data: {
          engagement: mockEngagement,
          strategyEstimates: [],
          period: "30d",
        },
        loading: false,
        period: "30d",
        setPeriod: vi.fn(),
        refetch: vi.fn(),
      });

      render(<AdRevenueEstimator />);

      const bestRevCards = screen.getAllByText("$0.00");
      expect(bestRevCards.length).toBeGreaterThan(0);
    });
  });

  describe("Network Revenue Table", () => {
    it("renders table headers correctly", () => {
      render(<AdRevenueEstimator />);

      expect(screen.getByText("Network")).toBeInTheDocument();
      expect(screen.getByText("Plan/Strategy")).toBeInTheDocument();
      expect(screen.getByText("CPM")).toBeInTheDocument();
      expect(screen.getByText("Est. Impressions")).toBeInTheDocument();
      expect(screen.getByText("Est. RPM")).toBeInTheDocument();
      expect(screen.getByText("Revenue")).toBeInTheDocument();
    });

    it("displays all network names", () => {
      render(<AdRevenueEstimator />);

      const googleElements = screen.getAllByText("Google");
      const ezoicElements = screen.getAllByText("Ezoic");
      const mediavineElements = screen.getAllByText("Mediavine");

      expect(googleElements.length).toBeGreaterThan(0);
      expect(ezoicElements.length).toBeGreaterThan(0);
      expect(mediavineElements.length).toBeGreaterThan(0);
    });

    it("displays strategy names for each network", () => {
      render(<AdRevenueEstimator />);

      expect(screen.getByText("single high viewability unit")).toBeInTheDocument();
      expect(screen.getByText("balanced multi slot layout")).toBeInTheDocument();
      expect(screen.getByText("session depth strategy")).toBeInTheDocument();
    });

    it("displays CPM values correctly", () => {
      render(<AdRevenueEstimator />);

      expect(screen.getByText("$2.50")).toBeInTheDocument();
      expect(screen.getByText("$4.00")).toBeInTheDocument();
      expect(screen.getByText("$12.00")).toBeInTheDocument();
    });

    it("displays estimated impressions correctly", () => {
      render(<AdRevenueEstimator />);

      expect(screen.getByText("1,000")).toBeInTheDocument();
      expect(screen.getByText("1,200")).toBeInTheDocument();
      expect(screen.getByText("1,500")).toBeInTheDocument();
    });

    it("displays estimated RPM correctly", () => {
      render(<AdRevenueEstimator />);

      expect(screen.getByText("$0.68")).toBeInTheDocument();
      expect(screen.getByText("$1.73")).toBeInTheDocument();
      expect(screen.getByText("$4.80")).toBeInTheDocument();
    });

    it("displays revenue correctly", () => {
      render(<AdRevenueEstimator />);

      expect(screen.getAllByText("$3.40").length).toBeGreaterThan(0);
      expect(screen.getAllByText("$8.64").length).toBeGreaterThan(0);
      expect(screen.getAllByText("$24.00").length).toBeGreaterThan(0);
    });

    it("displays program names in the table", () => {
      render(<AdRevenueEstimator />);

      expect(screen.getAllByText("Google Adsense").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Ezoic Access Now").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Mediavine Pro").length).toBeGreaterThan(0);
    });

    it("renders external links for networks with URLs", () => {
      render(<AdRevenueEstimator />);

      const links = screen.getAllByRole("link");
      const adsenseLinks = links.filter((link) =>
        link.getAttribute("href")?.includes("support.google.com/adsense")
      );
      expect(adsenseLinks.length).toBeGreaterThan(0);
    });

    it("renders strategy info buttons with tooltips", () => {
      const { container } = render(<AdRevenueEstimator />);

      const infoButtons = container.querySelectorAll('button[class*="inline-flex items-center"]');
      expect(infoButtons.length).toBeGreaterThan(0);
    });

    it("shows empty state when no strategy estimates available", () => {
      mockUseAdRevenue.mockReturnValue({
        data: {
          engagement: mockEngagement,
          strategyEstimates: [],
          period: "30d",
        },
        loading: false,
        period: "30d",
        setPeriod: vi.fn(),
        refetch: vi.fn(),
      });

      render(<AdRevenueEstimator />);

      expect(
        screen.getByText("No ad network configuration found. Upload a configuration to see revenue estimates.")
      ).toBeInTheDocument();
    });
  });

  describe("Money Formatting", () => {
    it("formats small amounts with 4 decimal places", () => {
      const smallRevenueEstimates = [
        {
          ...mockStrategyEstimates[0],
          estimatedRevenue: 0.0012,
        },
      ];

      mockUseAdRevenue.mockReturnValue({
        data: {
          engagement: mockEngagement,
          strategyEstimates: smallRevenueEstimates,
          period: "30d",
        },
        loading: false,
        period: "30d",
        setPeriod: vi.fn(),
        refetch: vi.fn(),
      });

      render(<AdRevenueEstimator />);

      expect(screen.getAllByText("$0.0012").length).toBeGreaterThan(0);
    });

    it("formats larger amounts with 2 decimal places", () => {
      render(<AdRevenueEstimator />);

      expect(screen.getAllByText("$24.00").length).toBeGreaterThan(0);
    });
  });

  describe("Projected Monthly Pageviews Calculation", () => {
    it("calculates monthly projection correctly for 7 day period", () => {
      mockUseAdRevenue.mockReturnValue({
        data: {
          engagement: mockEngagement,
          strategyEstimates: mockStrategyEstimates,
          period: "7d",
        },
        loading: false,
        period: "7d",
        setPeriod: vi.fn(),
        refetch: vi.fn(),
      });

      render(<AdRevenueEstimator />);

      expect(screen.getByText(/~21,429\/mo projected/)).toBeInTheDocument();
    });

    it("calculates monthly projection correctly for 90 day period", () => {
      mockUseAdRevenue.mockReturnValue({
        data: {
          engagement: mockEngagement,
          strategyEstimates: mockStrategyEstimates,
          period: "90d",
        },
        loading: false,
        period: "90d",
        setPeriod: vi.fn(),
        refetch: vi.fn(),
      });

      render(<AdRevenueEstimator />);

      expect(screen.getByText(/~1,667\/mo projected/)).toBeInTheDocument();
    });
  });

  describe("Company and Program Display", () => {
    it("displays company names as muted text", () => {
      render(<AdRevenueEstimator />);

      const googleElements = screen.getAllByText("Google");
      expect(googleElements.length).toBeGreaterThan(0);
    });

    it("displays program names prominently", () => {
      render(<AdRevenueEstimator />);

      expect(screen.getAllByText("Google Adsense").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Ezoic Access Now").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Mediavine Pro").length).toBeGreaterThan(0);
    });
  });

  describe("Strategy Tooltips", () => {
    it("renders info icons for strategy tooltips", () => {
      const { container } = render(<AdRevenueEstimator />);

      const infoIcons = container.querySelectorAll('svg[class*="lucide-info"]');
      expect(infoIcons.length).toBeGreaterThan(0);
    });

    it("displays strategy name in tooltip trigger", () => {
      render(<AdRevenueEstimator />);

      expect(screen.getByText("single high viewability unit")).toBeInTheDocument();
      expect(screen.getByText("balanced multi slot layout")).toBeInTheDocument();
      expect(screen.getByText("session depth strategy")).toBeInTheDocument();
    });

    it("renders strategy tooltips as buttons", () => {
      const { container } = render(<AdRevenueEstimator />);

      const tooltipButtons = container.querySelectorAll('button[class*="inline-flex items-center"]');
      expect(tooltipButtons.length).toBeGreaterThan(0);
    });
  });

  describe("External Links and Sources", () => {
    it("renders network program links with external link icons", async () => {
      const { container } = render(<AdRevenueEstimator />);

      const programLinks = container.querySelectorAll('a[class*="font-medium text-primary"]');
      expect(programLinks.length).toBeGreaterThan(0);

      const externalLinkIcons = container.querySelectorAll('svg.lucide-external-link');
      expect(externalLinkIcons.length).toBeGreaterThan(0);
    });

    it("renders all program links with target _blank and noopener noreferrer", () => {
      const { container } = render(<AdRevenueEstimator />);

      const programLinks = container.querySelectorAll('a[class*="font-medium text-primary"]');
      programLinks.forEach((link) => {
        expect(link).toHaveAttribute("target", "_blank");
        expect(link).toHaveAttribute("rel", "noopener noreferrer");
      });
    });

    it("renders Google AdSense program link", () => {
      const { container } = render(<AdRevenueEstimator />);

      const adsenseLink = Array.from(container.querySelectorAll('a')).find(
        link => link.getAttribute('href')?.includes('google.com/adsense')
      );
      expect(adsenseLink).toBeInTheDocument();
    });

    it("renders Mediavine program link", () => {
      const { container } = render(<AdRevenueEstimator />);

      const mediavineLink = Array.from(container.querySelectorAll('a')).find(
        link => link.textContent?.includes("Mediavine")
      );
      expect(mediavineLink).toBeInTheDocument();
    });
  });

  describe("Tooltip Persistence", () => {
    it("renders tooltip trigger buttons with info icons", () => {
      const { container } = render(<AdRevenueEstimator />);

      const infoButtons = container.querySelectorAll('button[class*="inline-flex items-center"]');
      expect(infoButtons.length).toBeGreaterThan(0);

      // Check that info icons are present
      const infoIcons = container.querySelectorAll('svg.lucide-info');
      expect(infoIcons.length).toBeGreaterThan(0);
    });

    it("renders strategy names in tooltip trigger buttons", () => {
      const { container } = render(<AdRevenueEstimator />);

      const strategyButtons = container.querySelectorAll('button[class*="inline-flex items-center"] span');
      const strategyTexts = Array.from(strategyButtons).map(btn => btn.textContent);

      expect(strategyTexts).toContain("single high viewability unit");
      expect(strategyTexts).toContain("balanced multi slot layout");
      expect(strategyTexts).toContain("session depth strategy");
    });

    it("tooltip trigger buttons have proper accessibility", () => {
      const { container } = render(<AdRevenueEstimator />);

      const infoButtons = container.querySelectorAll('button[class*="inline-flex items-center"]');
      infoButtons.forEach((button) => {
        // Buttons should be clickable
        expect(button).toBeInstanceOf(HTMLButtonElement);
      });
    });

    it("renders correct number of tooltip triggers for strategies", () => {
      const { container } = render(<AdRevenueEstimator />);

      const infoIcons = container.querySelectorAll('svg.lucide-info');
      // Should have one info icon per strategy
      expect(infoIcons.length).toBe(3);
    });
  });

  describe("Best Revenue Card Logic", () => {
    it("selects strategy with highest revenue as best", () => {
      render(<AdRevenueEstimator />);

      const bestRevCards = screen.getAllByText("$24.00");
      expect(bestRevCards.length).toBeGreaterThan(0);

      expect(screen.getAllByText("Mediavine").length).toBeGreaterThan(0);
    });

    it("handles tie in revenue by selecting first occurrence", () => {
      const tiedEstimates = [
        { ...mockStrategyEstimates[0], estimatedRevenue: 10.0 },
        { ...mockStrategyEstimates[1], estimatedRevenue: 10.0 },
      ];

      mockUseAdRevenue.mockReturnValue({
        data: {
          engagement: mockEngagement,
          strategyEstimates: tiedEstimates,
          period: "30d",
        },
        loading: false,
        period: "30d",
        setPeriod: vi.fn(),
        refetch: vi.fn(),
      });

      render(<AdRevenueEstimator />);

      expect(screen.getAllByText("$10.00").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Google").length).toBeGreaterThan(0);
    });

    it("shows No Program when best revenue is null", () => {
      mockUseAdRevenue.mockReturnValue({
        data: {
          engagement: mockEngagement,
          strategyEstimates: [],
          period: "30d",
        },
        loading: false,
        period: "30d",
        setPeriod: vi.fn(),
        refetch: vi.fn(),
      });

      render(<AdRevenueEstimator />);

      const bestStrategyCard = screen.getByText("Best Strategy").closest("div");
      expect(bestStrategyCard).toBeInTheDocument();

      const programNameElements = screen.queryByText(/No Program/i);
      expect(programNameElements).not.toBeInTheDocument();
    });
  });

  describe("Edge Cases and Error Handling", () => {
    it("handles zero page views gracefully", () => {
      mockUseAdRevenue.mockReturnValue({
        data: {
          engagement: {
            totalViews: 0,
            totalActiveSeconds: 0,
            totalActiveMinutes: 0,
            avgSessionSeconds: 0,
          },
          strategyEstimates: mockStrategyEstimates,
          period: "30d",
        },
        loading: false,
        period: "30d",
        setPeriod: vi.fn(),
        refetch: vi.fn(),
      });

      render(<AdRevenueEstimator />);

      expect(screen.getAllByText("0").length).toBeGreaterThan(0);
      expect(screen.getByText(/~0\/mo projected/)).toBeInTheDocument();
    });

    it("handles null data gracefully", () => {
      mockUseAdRevenue.mockReturnValue({
        data: null,
        loading: false,
        period: "30d",
        setPeriod: vi.fn(),
        refetch: vi.fn(),
      });

      render(<AdRevenueEstimator />);

      expect(screen.queryByText("Page Views")).not.toBeInTheDocument();
      expect(screen.queryByText("Revenue by Ad Network")).not.toBeInTheDocument();
    });

    it("handles missing period in data gracefully", () => {
      mockUseAdRevenue.mockReturnValue({
        data: {
          engagement: mockEngagement,
          strategyEstimates: mockStrategyEstimates,
          period: undefined as unknown as string,
        },
        loading: false,
        period: "30d",
        setPeriod: vi.fn(),
        refetch: vi.fn(),
      });

      render(<AdRevenueEstimator />);

      expect(screen.getByText("5,000")).toBeInTheDocument();
    });

    it("handles very large numbers correctly", () => {
      mockUseAdRevenue.mockReturnValue({
        data: {
          engagement: {
            totalViews: 1500000,
            totalActiveSeconds: 45000000,
            totalActiveMinutes: 750000,
            avgSessionSeconds: 180,
          },
          strategyEstimates: mockStrategyEstimates,
          period: "30d",
        },
        loading: false,
        period: "30d",
        setPeriod: vi.fn(),
        refetch: vi.fn(),
      });

      render(<AdRevenueEstimator />);

      expect(screen.getByText("1,500,000")).toBeInTheDocument();
      expect(screen.getByText("750,000")).toBeInTheDocument();
      expect(screen.getByText("180s")).toBeInTheDocument();
    });

    it("handles strategies with zero revenue", () => {
      const zeroRevenueEstimates = [
        { ...mockStrategyEstimates[0], estimatedRevenue: 0 },
      ];

      mockUseAdRevenue.mockReturnValue({
        data: {
          engagement: mockEngagement,
          strategyEstimates: zeroRevenueEstimates,
          period: "30d",
        },
        loading: false,
        period: "30d",
        setPeriod: vi.fn(),
        refetch: vi.fn(),
      });

      render(<AdRevenueEstimator />);

      expect(screen.getAllByText("$0.00").length).toBeGreaterThan(0);
    });
  });

  describe("Table Styling and Structure", () => {
    it("renders table with correct semantic structure", () => {
      const { container } = render(<AdRevenueEstimator />);

      const table = container.querySelector("table");
      expect(table).toBeInTheDocument();

      const thead = container.querySelector("thead");
      expect(thead).toBeInTheDocument();

      const tbody = container.querySelector("tbody");
      expect(tbody).toBeInTheDocument();
    });

    it("highlights best strategy card with green border", () => {
      render(<AdRevenueEstimator />);

      const bestStrategyCard = screen.getByText("Best Strategy").closest("div")?.parentElement;
      expect(bestStrategyCard?.className).toContain("border-l-4");
      expect(bestStrategyCard?.className).toContain("border-green-500");
    });

    it("renders revenue with right-aligned and bold styling", () => {
      const { container } = render(<AdRevenueEstimator />);

      const revenueCells = container.querySelectorAll('td[class*="text-right font-bold"]');
      expect(revenueCells.length).toBeGreaterThan(0);
    });
  });

  describe("Revenue Calculation Display", () => {
    it("displays estimated impressions with correct formatting", () => {
      render(<AdRevenueEstimator />);

      expect(screen.getByText("1,000")).toBeInTheDocument();
      expect(screen.getByText("1,200")).toBeInTheDocument();
      expect(screen.getByText("1,500")).toBeInTheDocument();
    });

    it("displays RPM values with dollar signs", () => {
      render(<AdRevenueEstimator />);

      expect(screen.getByText("$0.68")).toBeInTheDocument();
      expect(screen.getByText("$1.73")).toBeInTheDocument();
      expect(screen.getByText("$4.80")).toBeInTheDocument();
    });

    it("formats CPM consistently across all rows", () => {
      render(<AdRevenueEstimator />);

      expect(screen.getByText("$2.50")).toBeInTheDocument();
      expect(screen.getByText("$4.00")).toBeInTheDocument();
      expect(screen.getByText("$12.00")).toBeInTheDocument();
    });
  });

  describe("Responsive Design Elements", () => {
    it("uses grid layout for summary cards", () => {
      const { container } = render(<AdRevenueEstimator />);

      const grid = container.querySelector('div[class*="grid"]');
      expect(grid).toHaveClass("md:grid-cols-4");
    });

    it("applies overflow-x-auto to table container", () => {
      const { container } = render(<AdRevenueEstimator />);

      const tableContainer = container.querySelector('div[class*="overflow-x-auto"]');
      expect(tableContainer).toBeInTheDocument();
    });

    it("uses flex-wrap for control buttons", () => {
      const { container } = render(<AdRevenueEstimator />);

      const controlsContainer = container.querySelector('div[class*="flex-wrap"]');
      expect(controlsContainer).toBeInTheDocument();
    });
  });

  describe("Helper Text and Descriptions", () => {
    it("displays descriptive subtitle for revenue table", () => {
      render(<AdRevenueEstimator />);

      expect(
        screen.getByText("Estimated revenue based on ground truth metrics and network-specific formulas. Hover over strategies for detailed parameters.")
      ).toBeInTheDocument();
    });

    it("displays Revenue by Ad Network heading", () => {
      render(<AdRevenueEstimator />);

      expect(screen.getByText("Revenue by Ad Network")).toBeInTheDocument();
    });
  });
});
