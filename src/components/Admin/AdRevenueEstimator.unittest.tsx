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
});
