import { describe, expect, it } from "vite-plus/test";

import { buildPeriodColumns } from "./UsageProviderChart";
import { providersWithUsage } from "./usageProviders";

describe("buildPeriodColumns", () => {
  const days = ["2026-08-01", "2026-08-02", "2026-08-03"];
  const byDay = new Map([
    [
      "2026-08-01",
      {
        day: "2026-08-01",
        costUsd: 42,
        totalTokens: 420,
        aiCredits: 7,
        byProvider: new Map([
          ["codex" as const, { costUsd: 10, totalTokens: 100, aiCredits: 0 }],
          ["claude" as const, { costUsd: 20, totalTokens: 200, aiCredits: 0 }],
          ["pi" as const, { costUsd: 5, totalTokens: 50, aiCredits: 0 }],
          ["muse" as const, { costUsd: 7, totalTokens: 70, aiCredits: 0 }],
          ["copilot" as const, { costUsd: 0, totalTokens: 0, aiCredits: 7 }],
        ]),
      },
    ],
    [
      "2026-08-03",
      {
        day: "2026-08-03",
        costUsd: 5,
        totalTokens: 50,
        aiCredits: 0,
        byProvider: new Map([["claude" as const, { costUsd: 5, totalTokens: 50, aiCredits: 0 }]]),
      },
    ],
  ]);

  it("keeps band values absolute rather than cumulative", () => {
    const [first] = buildPeriodColumns(days, byDay, "cost");

    expect(first?.bands).toEqual([
      { provider: "codex", value: 10 },
      { provider: "claude", value: 20 },
      { provider: "grok", value: 0 },
      { provider: "cursor", value: 0 },
      { provider: "opencode", value: 0 },
      { provider: "antigravity", value: 0 },
      { provider: "pi", value: 5 },
      { provider: "muse", value: 7 },
      { provider: "copilot", value: 0 },
    ]);
  });

  it("reads AI credits, which only Copilot reports", () => {
    const [first, , last] = buildPeriodColumns(days, byDay, "aic");
    expect([first?.total, last?.total]).toEqual([7, 0]);
    expect(first?.bands.find((band) => band.provider === "copilot")?.value).toBe(7);
    expect(first?.bands.find((band) => band.provider === "claude")?.value).toBe(0);
  });
});

describe("providersWithUsage", () => {
  it("keeps a provider that only reports AI credits", () => {
    expect(
      providersWithUsage([
        { provider: "codex", costUsd: 0, totalTokens: 0, aiCredits: 0 },
        { provider: "claude", costUsd: 0, totalTokens: 200, aiCredits: 0 },
        { provider: "copilot", costUsd: 0, totalTokens: 0, aiCredits: 3 },
      ]),
    ).toEqual(["claude", "copilot"]);
  });
});
