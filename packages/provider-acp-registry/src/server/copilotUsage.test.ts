import { describe, expect, it } from "@effect/vitest";

import { copilotUsageFormat, parseCopilotLine } from "./copilotUsage.ts";

/** Shaped after a real Copilot CLI `session.usage_record` event. */
const copilotLine = (usage: Record<string, unknown>) =>
  JSON.stringify({
    type: "session.usage_record",
    timestamp: "2026-10-23T05:12:00.000Z",
    data: {
      usage: {
        model: "claude-opus-5.5",
        inputTokens: 1200,
        outputTokens: 300,
        cacheReadTokens: 900,
        cacheWriteTokens: 100,
        reasoningTokens: 40,
        accounting: { usageId: "usage-1" },
        serviceRequestId: "svc-1",
        copilotUsage: { totalNanoAiu: 2_500_000_000 },
        ...usage,
      },
    },
  });

const sessionStart = (sessionId: string) =>
  JSON.stringify({ type: "session.start", data: { sessionId, version: 1 } });

describe("parseCopilotLine", () => {
  it("splits cache tokens out of input and converts nano AIU to credits", () => {
    expect(parseCopilotLine(copilotLine({}), { sessionId: "session-1" })).toEqual([
      {
        provider: "copilot",
        timestampMs: Date.parse("2026-10-23T05:12:00.000Z"),
        model: "claude-opus-5.5",
        sessionId: "session-1",
        totals: {
          uncachedInputTokens: 200,
          cachedInputTokens: 900,
          cacheCreationTokens: 100,
          outputTokens: 300,
          reasoningTokens: 40,
        },
        reportedCostUsd: null,
        speed: "standard",
        dedupeKey: "copilot:usage-1",
        aiCredits: 2.5,
      },
    ]);
  });

  it("omits AI credits for bring-your-own-key calls", () => {
    const [record] = parseCopilotLine(copilotLine({ copilotUsage: undefined }), { sessionId: "" });
    expect(record?.totals.outputTokens).toBe(300);
    expect(record).not.toHaveProperty("aiCredits");
  });

  it("falls back to the service request id for dedupe", () => {
    const [record] = parseCopilotLine(copilotLine({ accounting: undefined }), { sessionId: "" });
    expect(record?.dedupeKey).toBe("copilot:svc-1");
  });

  it("ignores other events and records without tokens", () => {
    const state = { sessionId: "" };
    expect(parseCopilotLine(JSON.stringify({ type: "assistant.message" }), state)).toEqual([]);
    expect(
      parseCopilotLine(
        copilotLine({ inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 }),
        state,
      ),
    ).toEqual([]);
  });

  it("attributes records to the session named by session.start", () => {
    const state = copilotUsageFormat.state!.initial();
    expect(parseCopilotLine(sessionStart("abc-123"), state)).toEqual([]);
    expect(parseCopilotLine(copilotLine({}), state)[0]?.sessionId).toBe("abc-123");
  });

  it("matches every line the format depends on", () => {
    for (const line of [sessionStart("abc"), copilotLine({})]) {
      expect(copilotUsageFormat.usageMarkers.some((marker) => line.includes(marker))).toBe(true);
    }
  });
});
