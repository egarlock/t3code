import type { UsageTokenTotals } from "@t3tools/contracts";
import * as Effect from "effect/Effect";
import * as Path from "effect/Path";
import * as Schema from "effect/Schema";

import { expandHomePath } from "@t3tools/provider-core/server/pathExpansion";
import {
  parseTimestampMs,
  tokenCount,
  totalTokens,
  type ProviderUsageReader,
  type TranscriptUsageFormat,
  type UsageRecord,
} from "@t3tools/provider-core/server/usage";
import * as HostProcess from "@t3tools/shared/HostProcess";

import type { AcpRegistrySettings } from "../settings.ts";

/** Copilot reports AI credits in billionths (`totalNanoAiu`). */
export const COPILOT_NANO_AIU_PER_CREDIT = 1_000_000_000;

/** Each `events.jsonl` opens with one `session.start` naming the session its records belong to. */
export const CopilotScanState = Schema.Struct({
  sessionId: Schema.mutableKey(Schema.String),
});
export type CopilotScanState = typeof CopilotScanState.Type;

const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  typeof value === "object" && value !== null ? (value as Record<string, unknown>) : undefined;

/**
 * Reads one projected Copilot CLI `session-state/<id>/events.jsonl` event.
 *
 * Each model call writes one `session.usage_record`. Subagent calls are logged
 * in the parent session's file, so every record is counted exactly once.
 */
export function parseCopilotRecord(parsed: unknown, state: CopilotScanState): UsageRecord | null {
  const record = asRecord(parsed);
  if (record === undefined) return null;
  const data = asRecord(record["data"]);

  if (record["type"] === "session.start") {
    const sessionId = data?.["sessionId"];
    if (typeof sessionId === "string") state.sessionId = sessionId;
    return null;
  }
  if (record["type"] !== "session.usage_record") return null;

  const usage = asRecord(data?.["usage"]);
  if (usage === undefined) return null;

  const timestampMs = parseTimestampMs(record["timestamp"]);
  if (timestampMs === null) return null;

  const model = typeof usage["model"] === "string" ? usage["model"] : "";
  if (model.length === 0) return null;

  const inputTokens = tokenCount(usage["inputTokens"]);
  const cachedInputTokens = tokenCount(usage["cacheReadTokens"]);
  const cacheCreationTokens = tokenCount(usage["cacheWriteTokens"]);
  const outputTokens = tokenCount(usage["outputTokens"]);
  const totals: UsageTokenTotals = {
    // Copilot reports `inputTokens` inclusive of cache reads and writes.
    uncachedInputTokens: Math.max(0, inputTokens - cachedInputTokens - cacheCreationTokens),
    cachedInputTokens,
    cacheCreationTokens,
    outputTokens,
    reasoningTokens: Math.min(outputTokens, tokenCount(usage["reasoningTokens"])),
  };
  if (totalTokens(totals) === 0) return null;

  const requestId = [
    asRecord(usage["accounting"])?.["usageId"],
    usage["serviceRequestId"],
    usage["apiCallId"],
  ].find((value): value is string => typeof value === "string" && value.length > 0);

  // Bring-your-own-key calls carry no Copilot billing block.
  const nanoAiu = asRecord(usage["copilotUsage"])?.["totalNanoAiu"];
  const aiCredits =
    typeof nanoAiu === "number" && Number.isFinite(nanoAiu) && nanoAiu > 0
      ? nanoAiu / COPILOT_NANO_AIU_PER_CREDIT
      : 0;

  return {
    provider: "copilot",
    timestampMs,
    model,
    sessionId: state.sessionId,
    totals,
    // Copilot bills in AI credits, not dollars; cost comes from list rates.
    reportedCostUsd: null,
    speed: "standard",
    dedupeKey: requestId === undefined ? null : `copilot:${requestId}`,
    ...(aiCredits > 0 ? { aiCredits } : {}),
  };
}

export function parseCopilotLine(line: string, state: CopilotScanState): readonly UsageRecord[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(line);
  } catch {
    return [];
  }
  const record = parseCopilotRecord(parsed, state);
  return record === null ? [] : [record];
}

export const copilotUsageFormat: TranscriptUsageFormat<CopilotScanState> = {
  selectFields: {
    type: true,
    timestamp: true,
    data: { sessionId: true, usage: true },
  },
  usageMarkers: ['"session.usage_record"', '"session.start"'],
  parseLine: parseCopilotLine,
  parseProjected: (projected, state) => {
    const record = parseCopilotRecord(projected, state);
    return record === null ? [] : [record];
  },
  state: { initial: () => ({ sessionId: "" }), schema: CopilotScanState },
};

/**
 * Copilot CLI and Agency Copilot both log to `~/.copilot/session-state`, so the
 * reader covers sessions started outside T3 Code too. `COPILOT_HOME` moves it.
 */
export const copilotUsageReader: ProviderUsageReader<AcpRegistrySettings, Path.Path> = {
  kind: "transcripts",
  provider: "copilot",
  format: copilotUsageFormat,
  directories: Effect.fn("copilotUsageReader.directories")(function* ({ environment }) {
    const path = yield* Path.Path;
    const homeDirectory = yield* HostProcess.HomeDirectory;
    const home = expandHomePath(
      environment.COPILOT_HOME?.trim() || path.join(homeDirectory, ".copilot"),
      homeDirectory,
    );
    return [{ dir: path.resolve(home, "session-state"), fileName: "events.jsonl" }];
  }),
};
