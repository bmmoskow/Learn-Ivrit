import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AdRevenueEstimator } from "./AdRevenueEstimator";

const mockNetworkEstimates = [
  {
    policy: {
      id: "1",
      network_name: "Google AdSense",
      tier_name: "Basic",
      display_cpm: 2.5,
      video_cpm: 5.0,
      display_fill_rate: 0.85,
      video_fill_rate: 0.5,
      refresh_interval_seconds: 30,
      revenue_share_percent: 68,
      min_monthly_pageviews: 0,
      min_requirements_notes: "No minimum requirements",
      source_url: "https://support.google.com/adsense/answer/180195",
      cpm_source_url: "https://www.ezoic.com/publisher-resources/adsense-cpm-rates/",
    },
    displayImpressions: 1000,
    videoImpressions: 500,
    grossDisplayRevenue: 2.5,
    grossVideoRevenue: 2.5,
    netDisplayRevenue: 1.7,
    netVideoRevenue: 1.7,
    netTotalRevenue: 3.4,
    meetsMinimum: true,
  },
  {
    policy: {
      id: "2",
      network_name: "Ezoic",
      tier_name: "Access Now",
      display_cpm: 4.0,
      video_cpm: 8.0,
      display_fill_rate: 0.85,
      video_fill_rate: 0.6,
      refresh_interval_seconds: 30,
      revenue_share_percent: 90,
      min_monthly_pageviews: 10000,
      min_requirements_notes: "Must have 10,000 monthly pageviews",
      source_url: "https://www.ezoic.com/monetization/",
      cpm_source_url: null,
    },
    displayImpressions: 1200,
    videoImpressions: 600,
    grossDisplayRevenue: 4.8,
    grossVideoRevenue: 4.8,
    netDisplayRevenue: 4.32,
    netVideoRevenue: 4.32,
    netTotalRevenue: 8.64,
    meetsMinimum: false,
  },
  {
    policy: {
      id: "3",
      network_name: "Mediavine",
      tier_name: "Pro",
      display_cpm: 12.0,
      video_cpm: 20.0,
      display_fill_rate: 0.85,
      video_fill_rate: 0.7,
      refresh_interval_seconds: 30,
      revenue_share_percent: 75,
      min_monthly_pageviews: 50000,
      min_requirements_notes: null,
      source_url: null,
      cpm_source_url: null,
    },
    displayImpressions: 1500,
    videoImpressions: 700,
    grossDisplayRevenue: 18.0,
    grossVideoRevenue: 14.0,
    netDisplayRevenue: 13.5,
    netVideoRevenue: 10.5,
    netTotalRevenue: 24.0,
    meetsMinimum: false,
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
  let mockUseAdRevenue: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const module = await import("./useAdRevenue");
    mockUseAdRevenue = module.useAdRevenue;

    mockUseAdRevenue.mockReturnValue({
      data: {
        engagement: mockEngagement,
        networkEstimates: mockNetworkEstimates,
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

    it("calls setPeriod when period changes", () => {
      const mockSetPeriod = vi.fn();
      mockUseAdRevenue.mockReturnValue({
        data: null,
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

    it("renders refresh button", () => {
      render(<AdRevenueEstimator />);

      expect(screen.getByText("Refresh")).toBeInTheDocument();
    });

    it("calls refetch when refresh button is clicked", () => {
      const mockRefetch = vi.fn();
      mockUseAdRevenue.mockReturnValue({
        data: null,
        loading: false,
        period: "30d",
        setPeriod: vi.fn(),
        refetch: mockRefetch,
      });

      render(<AdRevenueEstimator />);

      const refreshButton = screen.getByText("Refresh");
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

      expect(screen.getByText(/\/mo projected/)).toBeInTheDocument();
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

    it("displays best net revenue card with correct data", () => {
      render(<AdRevenueEstimator />);

      expect(screen.getByText("Best Net Revenue")).toBeInTheDocument();
      const revenueValues = screen.getAllByText("$3.40");
      expect(revenueValues.length).toBeGreaterThan(0);
    });

    it("displays network name and tier for best revenue", () => {
      render(<AdRevenueEstimator />);

      const bestRevenueCard = document.querySelector(".border-l-4.border-green-500");
      expect(bestRevenueCard).toHaveTextContent("Google AdSense");
      expect(bestRevenueCard).toHaveTextContent("Basic");
    });

    it("shows $0.00 when no network estimates available", () => {
      mockUseAdRevenue.mockReturnValue({
        data: {
          engagement: mockEngagement,
          networkEstimates: [],
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
      expect(screen.getByText("Display CPM")).toBeInTheDocument();
      expect(screen.getByText("Rev Share")).toBeInTheDocument();
      expect(screen.getByText("Revenue")).toBeInTheDocument();
      expect(screen.getByText("Eligible")).toBeInTheDocument();
    });

    it("displays all network names", () => {
      render(<AdRevenueEstimator />);

      expect(screen.getByText("Google AdSense")).toBeInTheDocument();
      expect(screen.getByText("Ezoic")).toBeInTheDocument();
      expect(screen.getByText("Mediavine")).toBeInTheDocument();
    });

    it("displays tier names for each network", () => {
      render(<AdRevenueEstimator />);

      expect(screen.getByText("Basic")).toBeInTheDocument();
      expect(screen.getByText("Access Now")).toBeInTheDocument();
      expect(screen.getByText("Pro")).toBeInTheDocument();
    });

    it("displays CPM values correctly", () => {
      render(<AdRevenueEstimator />);

      expect(screen.getByText("$2.5")).toBeInTheDocument();
      expect(screen.getByText("$4")).toBeInTheDocument();
      expect(screen.getByText("$12")).toBeInTheDocument();
    });

    it("displays revenue share percentages correctly", () => {
      render(<AdRevenueEstimator />);

      expect(screen.getByText("68%")).toBeInTheDocument();
      expect(screen.getByText("90%")).toBeInTheDocument();
      expect(screen.getByText("75%")).toBeInTheDocument();
    });

    it("displays net revenue correctly", () => {
      render(<AdRevenueEstimator />);

      expect(screen.getByText("$24.00")).toBeInTheDocument();
      expect(screen.getByText("$8.64")).toBeInTheDocument();
    });

    it("shows Yes for networks that meet minimum requirements", () => {
      render(<AdRevenueEstimator />);

      const yesElements = screen.getAllByText("Yes");
      expect(yesElements.length).toBe(1);
    });

    it("shows minimum pageview requirement for networks that don't meet it", () => {
      render(<AdRevenueEstimator />);

      expect(screen.getByText(/Need 10,000 pv\/mo/)).toBeInTheDocument();
      expect(screen.getByText(/Need 50,000 pv\/mo/)).toBeInTheDocument();
    });

    it("renders external links for networks with URLs", () => {
      render(<AdRevenueEstimator />);

      const links = document.querySelectorAll('a[target="_blank"]');
      expect(links.length).toBeGreaterThan(0);
    });

    it("renders network name without link when URL is not available", () => {
      const estimatesWithoutLink = [
        {
          ...mockNetworkEstimates[0],
          policy: {
            ...mockNetworkEstimates[0].policy,
            network_name: "Unknown Network",
          },
        },
      ];

      mockUseAdRevenue.mockReturnValue({
        data: {
          engagement: mockEngagement,
          networkEstimates: estimatesWithoutLink,
          period: "30d",
        },
        loading: false,
        period: "30d",
        setPeriod: vi.fn(),
        refetch: vi.fn(),
      });

      render(<AdRevenueEstimator />);

      expect(screen.getByText("Unknown Network")).toBeInTheDocument();
    });

    it("shows empty state when no network estimates available", () => {
      mockUseAdRevenue.mockReturnValue({
        data: {
          engagement: mockEngagement,
          networkEstimates: [],
          period: "30d",
        },
        loading: false,
        period: "30d",
        setPeriod: vi.fn(),
        refetch: vi.fn(),
      });

      render(<AdRevenueEstimator />);

      expect(screen.getByText("No ad network policies configured.")).toBeInTheDocument();
    });
  });

  describe("Minimum Requirements Notes", () => {
    it("displays minimum requirements section when notes are available", () => {
      render(<AdRevenueEstimator />);

      expect(screen.getByText("Minimum Requirements by Plan")).toBeInTheDocument();
    });

    it("displays minimum requirement notes for each network", () => {
      render(<AdRevenueEstimator />);

      expect(screen.getByText(/No minimum requirements/)).toBeInTheDocument();
      expect(screen.getByText(/Must have 10,000 monthly pageviews/)).toBeInTheDocument();
    });

    it("displays pageview requirements in notes", () => {
      render(<AdRevenueEstimator />);

      const notes = document.querySelectorAll(".text-xs.text-muted-foreground");
      const hasPageviewNote = Array.from(notes).some(
        (note) => note.textContent?.includes("10,000 pv/mo")
      );
      expect(hasPageviewNote).toBe(true);
    });

    it("does not display notes section when no notes are available", () => {
      const estimatesWithoutNotes = mockNetworkEstimates.map((est) => ({
        ...est,
        policy: {
          ...est.policy,
          min_requirements_notes: null,
        },
      }));

      mockUseAdRevenue.mockReturnValue({
        data: {
          engagement: mockEngagement,
          networkEstimates: estimatesWithoutNotes,
          period: "30d",
        },
        loading: false,
        period: "30d",
        setPeriod: vi.fn(),
        refetch: vi.fn(),
      });

      render(<AdRevenueEstimator />);

      const minReqSection = document.querySelector(".border-t.border-border");
      const gridContainer = minReqSection?.querySelector(".grid.gap-1");
      expect(gridContainer?.children.length).toBe(0);
    });
  });

  describe("Money Formatting", () => {
    it("formats small amounts with 4 decimal places", () => {
      const estimatesWithSmallRevenue = [
        {
          ...mockNetworkEstimates[0],
          netTotalRevenue: 0.0012,
        },
      ];

      mockUseAdRevenue.mockReturnValue({
        data: {
          engagement: mockEngagement,
          networkEstimates: estimatesWithSmallRevenue,
          period: "30d",
        },
        loading: false,
        period: "30d",
        setPeriod: vi.fn(),
        refetch: vi.fn(),
      });

      render(<AdRevenueEstimator />);

      const smallAmounts = screen.getAllByText("$0.0012");
      expect(smallAmounts.length).toBeGreaterThan(0);
    });

    it("formats larger amounts with 2 decimal places", () => {
      render(<AdRevenueEstimator />);

      const amounts340 = screen.getAllByText("$3.40");
      expect(amounts340.length).toBeGreaterThan(0);

      const amounts2400 = screen.getAllByText("$24.00");
      expect(amounts2400.length).toBeGreaterThan(0);
    });
  });

  describe("Source Links", () => {
    it("renders CPM source links when available", () => {
      render(<AdRevenueEstimator />);

      const cpmLink = screen.getByText("$2.5").closest("a");
      expect(cpmLink).toHaveAttribute("href", "https://www.ezoic.com/publisher-resources/adsense-cpm-rates/");
      expect(cpmLink).toHaveAttribute("target", "_blank");
      expect(cpmLink).toHaveAttribute("rel", "noopener noreferrer");
    });

    it("renders revenue share source links when available", () => {
      render(<AdRevenueEstimator />);

      const revShareLink = screen.getByText("68%").closest("a");
      expect(revShareLink).toHaveAttribute("href", "https://support.google.com/adsense/answer/180195");
    });

    it("renders values without links when source URL is null", () => {
      render(<AdRevenueEstimator />);

      const ezoicCpm = screen.getByText("$4");
      expect(ezoicCpm.closest("a")).toBeNull();
    });
  });

  describe("Network Links", () => {
    it("renders external link icon for networks with URLs", () => {
      render(<AdRevenueEstimator />);

      const externalLinkIcons = document.querySelectorAll(".lucide-external-link");
      expect(externalLinkIcons.length).toBeGreaterThan(0);
    });

    it("opens network links in new tab", () => {
      render(<AdRevenueEstimator />);

      const adsenseLink = screen.getByText("Google AdSense").closest("a");
      expect(adsenseLink).toHaveAttribute("target", "_blank");
      expect(adsenseLink).toHaveAttribute("rel", "noopener noreferrer");
    });

    it("links to correct network URLs", () => {
      render(<AdRevenueEstimator />);

      const adsenseLink = screen.getByText("Google AdSense").closest("a");
      expect(adsenseLink).toHaveAttribute("href", "https://adsense.google.com/start/");

      const ezoicLink = screen.getByText("Ezoic").closest("a");
      expect(ezoicLink).toHaveAttribute("href", "https://www.ezoic.com/monetization/");
    });
  });

  describe("Eligibility Indicators", () => {
    it("shows green checkmark for eligible networks", () => {
      render(<AdRevenueEstimator />);

      const checkIcons = document.querySelectorAll(".lucide-check-circle");
      expect(checkIcons.length).toBe(1);
    });

    it("shows warning icon for ineligible networks", () => {
      render(<AdRevenueEstimator />);

      const warningIcons = document.querySelectorAll(".lucide-alert-triangle");
      expect(warningIcons.length).toBe(2);
    });
  });

  describe("No Data State", () => {
    it("does not render engagement cards when data is null", () => {
      mockUseAdRevenue.mockReturnValue({
        data: null,
        loading: false,
        period: "30d",
        setPeriod: vi.fn(),
        refetch: vi.fn(),
      });

      render(<AdRevenueEstimator />);

      expect(screen.queryByText("Page Views")).not.toBeInTheDocument();
      expect(screen.queryByText("Active Minutes")).not.toBeInTheDocument();
    });

    it("does not render network table when data is null", () => {
      mockUseAdRevenue.mockReturnValue({
        data: null,
        loading: false,
        period: "30d",
        setPeriod: vi.fn(),
        refetch: vi.fn(),
      });

      render(<AdRevenueEstimator />);

      expect(screen.queryByText("Revenue by Ad Network")).not.toBeInTheDocument();
    });
  });

  describe("Explanatory Text", () => {
    it("displays formula explanation", () => {
      render(<AdRevenueEstimator />);

      expect(
        screen.getByText(/Net revenue = .*impressions.*CPM.*fill rate.*revenue share/i)
      ).toBeInTheDocument();
    });

    it("mentions fill rate assumption", () => {
      render(<AdRevenueEstimator />);

      expect(screen.getByText(/fill rate is estimated at 85%/i)).toBeInTheDocument();
    });

    it("mentions video ads are not included", () => {
      render(<AdRevenueEstimator />);

      expect(screen.getByText(/video ads are possible but not included/i)).toBeInTheDocument();
    });
  });

  describe("Projected Monthly Pageviews Calculation", () => {
    it("calculates monthly projection correctly for 7 day period", () => {
      mockUseAdRevenue.mockReturnValue({
        data: {
          engagement: {
            ...mockEngagement,
            totalViews: 700,
          },
          networkEstimates: [],
          period: "7d",
        },
        loading: false,
        period: "7d",
        setPeriod: vi.fn(),
        refetch: vi.fn(),
      });

      render(<AdRevenueEstimator />);

      expect(screen.getByText(/~3,000\/mo projected/)).toBeInTheDocument();
    });

    it("calculates monthly projection correctly for 90 day period", () => {
      mockUseAdRevenue.mockReturnValue({
        data: {
          engagement: {
            ...mockEngagement,
            totalViews: 9000,
          },
          networkEstimates: [],
          period: "90d",
        },
        loading: false,
        period: "90d",
        setPeriod: vi.fn(),
        refetch: vi.fn(),
      });

      render(<AdRevenueEstimator />);

      expect(screen.getByText(/~3,000\/mo projected/)).toBeInTheDocument();
    });
  });
});
