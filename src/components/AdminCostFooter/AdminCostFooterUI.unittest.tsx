import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { AdminCostFooterUI } from "./AdminCostFooterUI";
import type { LastTransaction } from "../Admin/useLastTransaction";

const makeTx = (overrides: Partial<LastTransaction> = {}): LastTransaction => ({
  request_type: "translate",
  prompt_tokens: 1000,
  candidates_tokens: 500,
  thinking_tokens: 0,
  cache_hit: false,
  cost: 0.00375,
  created_at: "2024-06-15T10:00:00Z",
  call_count: 1,
  ...overrides,
});

describe("AdminCostFooterUI", () => {
  it("shows 'No recent API calls' when lastTx is null", () => {
    render(<AdminCostFooterUI lastTx={null} />);
    expect(screen.getByText(/No recent API calls/)).toBeInTheDocument();
  });

  it("displays cost for a single non-cached call", () => {
    render(<AdminCostFooterUI lastTx={makeTx()} />);
    expect(screen.getByText("$0.0037")).toBeInTheDocument();
    expect(screen.getByText(/1.5k tokens/)).toBeInTheDocument();
    expect(screen.queryByText(/calls\)/)).not.toBeInTheDocument();
  });

  it("displays aggregated cost with call count for multi-paragraph", () => {
    render(
      <AdminCostFooterUI
        lastTx={makeTx({
          prompt_tokens: 2400,
          candidates_tokens: 1000,
          cost: 0.008,
          call_count: 3,
        })}
      />
    );
    expect(screen.getByText("$0.0080")).toBeInTheDocument();
    expect(screen.getByText("(3 calls)")).toBeInTheDocument();
    expect(screen.getByText(/3.4k tokens/)).toBeInTheDocument();
  });

  it("displays cache hit with $0 for all-cached transaction", () => {
    render(
      <AdminCostFooterUI
        lastTx={makeTx({
          request_type: "define",
          prompt_tokens: 0,
          candidates_tokens: 0,
          cache_hit: true,
          cost: 0,
        })}
      />
    );
    expect(screen.getByText(/cache hit/)).toBeInTheDocument();
    expect(screen.getByText(/\$0/)).toBeInTheDocument();
  });

  it("formats 'define' request type as 'Definition'", () => {
    render(
      <AdminCostFooterUI lastTx={makeTx({ request_type: "define", cost: 0.002 })} />
    );
    expect(screen.getByText(/Definition/)).toBeInTheDocument();
  });

  it("formats tokens under 1000 as plain numbers", () => {
    render(
      <AdminCostFooterUI
        lastTx={makeTx({ prompt_tokens: 300, candidates_tokens: 200, cost: 0.001 })}
      />
    );
    expect(screen.getByText(/500 tokens/)).toBeInTheDocument();
  });

  it("includes thinking tokens in the total token display", () => {
    render(
      <AdminCostFooterUI
        lastTx={makeTx({
          prompt_tokens: 500,
          candidates_tokens: 200,
          thinking_tokens: 1300,
          cost: 0.015,
        })}
      />
    );
    expect(screen.getByText(/2.0k tokens/)).toBeInTheDocument();
  });

  it("renders link to admin dashboard", () => {
    render(<AdminCostFooterUI lastTx={null} />);
    const link = screen.getByText(/Usage dashboard/);
    expect(link).toHaveAttribute("href", "/admin");
  });
});
