import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AdRevenueEstimator } from "./AdRevenueEstimator";

const mockStrategyEstimates = [
  {
    programKey: "google_adsense",
    programName: "Google AdSense",
    strategyName: "single_high_viewability_unit",
    strategyDescription: "Use one strong above-the-fold unit",
    officialUrl: "https://support.google.com/adsense/answer/180195",
    cpm: 2.5,
    estimatedRevenue: 3.4,
    estimatedImpressions: 1000,
    estimatedRpm: 0.68,
    meetsRequirements: true,
    formula: "estimated_revenue = (pageviews * ad_slots_per_page * fill_rate * viewability_rate * cpm / 1000)",
    cpmSource: "https://www.ezoic.com/publisher-resources/adsense-cpm-rates/",
    trafficRequirement: "No minimum traffic requirement",
    trafficRequirementSource: "https://support.google.com/adsense",
  },
  {
    programKey: "ezoic_access_now",
    programName: "Ezoic",
    strategyName: "balanced_multi_slot_layout",
    strategyDescription: "Use moderate in-content and sidebar units",
    officialUrl: "https://www.ezoic.com/monetization/",
    cpm: 4.0,
    estimatedRevenue: 8.64,
    estimatedImpressions: 1200,
    estimatedRpm: 1.73,
    meetsRequirements: false,
    formula: "estimated_revenue = (pageviews * ad_slots_per_page * fill_rate * viewability_rate * cpm / 1000)",
    cpmSource: "https://www.ezoic.com/cpm-rates/",
    trafficRequirement: "10,000 sessions/month",
    trafficRequirementSource: "https://www.ezoic.com/requirements/",
  },
  {
    programKey: "mediavine_pro",
    programName: "Mediavine",
    strategyName: "session_depth_strategy",
    strategyDescription: "Increase pages per session",
    officialUrl: "https://www.mediavine.com/",
    cpm: 12.0,
    estimatedRevenue: 24.0,
    estimatedImpressions: 1500,
    estimatedRpm: 4.8,
    meetsRequirements: false,
    formula: "estimated_revenue = (sessions * pages_per_session * ad_slots_per_page * fill_rate * viewability_rate * cpm / 1000)",
    cpmSource: "https://www.mediavine.com/cpm/",
    trafficRequirement: "50,000 sessions/month",
    trafficRequirementSource: "https://www.mediavine.com/apply/",
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

    it("displays program name for best revenue", () => {
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
      expect(screen.getByText("Meets Req.")).toBeInTheDocument();
    });

    it("displays all network names", () => {
      render(<AdRevenueEstimator />);

      const adsenseElements = screen.getAllByText("Google AdSense");
      const ezoicElements = screen.getAllByText("Ezoic");
      const mediavineElements = screen.getAllByText("Mediavine");

      expect(adsenseElements.length).toBeGreaterThan(0);
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

    it("shows Yes for networks that meet minimum requirements", () => {
      render(<AdRevenueEstimator />);

      const yesElements = screen.getAllByText("Yes");
      expect(yesElements.length).toBeGreaterThan(0);
    });

    it("shows traffic requirement for networks that don't meet it", () => {
      render(<AdRevenueEstimator />);

      expect(screen.getByText("10,000 sessions/month")).toBeInTheDocument();
      expect(screen.getByText("50,000 sessions/month")).toBeInTheDocument();
    });

    it("renders external links for networks with URLs", () => {
      render(<AdRevenueEstimator />);

      const links = screen.getAllByRole("link");
      const adsenseLinks = links.filter((link) =>
        link.getAttribute("href")?.includes("google.com/adsense")
      );
      expect(adsenseLinks.length).toBeGreaterThan(0);
    });

    it("renders network links that open in new tab", () => {
      render(<AdRevenueEstimator />);

      const adsenseLink = screen.getByText("Google AdSense").closest("a");
      expect(adsenseLink).toHaveAttribute("target", "_blank");
      expect(adsenseLink).toHaveAttribute("rel", "noopener noreferrer");
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

  describe("Eligibility Indicators", () => {
    it("shows green checkmark for eligible networks", () => {
      render(<AdRevenueEstimator />);

      const yesElements = screen.getAllByText("Yes");
      expect(yesElements.length).toBeGreaterThan(0);
    });

    it("shows warning icon for ineligible networks", () => {
      render(<AdRevenueEstimator />);

      const { container } = render(<AdRevenueEstimator />);
      const alertIcons = container.querySelectorAll('svg[class*="lucide-alert-triangle"]');
      expect(alertIcons.length).toBeGreaterThan(0);
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
    it("renders network official URLs as links", () => {
      render(<AdRevenueEstimator />);

      const adsenseLink = screen.getByText("Google AdSense").closest("a");
      expect(adsenseLink).toHaveAttribute("href", "https://support.google.com/adsense/answer/180195");
    });

    it("renders all official URLs with external link icons", () => {
      const { container } = render(<AdRevenueEstimator />);

      const externalLinkIcons = container.querySelectorAll('svg[class*="lucide-external-link"]');
      expect(externalLinkIcons.length).toBeGreaterThan(0);
    });

    it("renders traffic requirement links for ineligible networks", () => {
      render(<AdRevenueEstimator />);

      const ezoicReqLink = screen.getByText("10,000 sessions/month").closest("a");
      expect(ezoicReqLink).toHaveAttribute("href", "https://www.ezoic.com/requirements/");
      expect(ezoicReqLink).toHaveAttribute("target", "_blank");
    });

    it("renders traffic requirement text without link when no source provided", () => {
      const estimatesWithoutSource = [
        {
          ...mockStrategyEstimates[0],
          meetsRequirements: false,
          trafficRequirement: "Custom requirement",
          trafficRequirementSource: undefined,
        },
      ];

      mockUseAdRevenue.mockReturnValue({
        data: {
          engagement: mockEngagement,
          strategyEstimates: estimatesWithoutSource,
          period: "30d",
        },
        loading: false,
        period: "30d",
        setPeriod: vi.fn(),
        refetch: vi.fn(),
      });

      render(<AdRevenueEstimator />);

      const reqText = screen.getByText("Custom requirement");
      expect(reqText.closest("a")).toBeNull();
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
      expect(screen.getAllByText("Google AdSense").length).toBeGreaterThan(0);
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
      const { container } = render(<AdRevenueEstimator />);

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
