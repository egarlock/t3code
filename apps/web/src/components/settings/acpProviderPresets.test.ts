import { resolveAcpProviderIconUrl } from "@t3tools/contracts";
import { describe, expect, it } from "vite-plus/test";

import { ACP_PROVIDER_PRESETS, isConfiguredAcpProviderPreset } from "./acpProviderPresets";

const copilot = ACP_PROVIDER_PRESETS.find((preset) => preset.id === "copilot")!;
const agency = ACP_PROVIDER_PRESETS.find((preset) => preset.id === "agency")!;

describe("ACP provider presets", () => {
  it("uses icons the client accepts", () => {
    for (const preset of ACP_PROVIDER_PRESETS) {
      expect(resolveAcpProviderIconUrl(preset.config.iconUrl)).toBe(preset.config.iconUrl);
    }
  });

  it("detects a local instance running the same command by absolute path", () => {
    const instances = {
      agency: {
        driver: "acpRegistry",
        config: {
          source: "local",
          commandPath: "/Users/me/.config/agency/CurrentVersion/agency",
          commandArgs: ["copilot", "--no-default-mcps", "--disable-builtin-mcps", "--acp"],
        },
      },
    };
    expect(isConfiguredAcpProviderPreset(instances, agency)).toBe(true);
    expect(isConfiguredAcpProviderPreset(instances, copilot)).toBe(false);
  });

  it("does not confuse different arguments for the same executable", () => {
    const instances = {
      other: {
        driver: "acpRegistry",
        config: { source: "local", commandPath: "agency", commandArgs: ["claude", "--acp"] },
      },
    };
    expect(isConfiguredAcpProviderPreset(instances, agency)).toBe(false);
  });

  it("treats the Copilot registry agent as the Copilot preset", () => {
    const instances = {
      copilot: {
        driver: "acpRegistry",
        config: { source: "registry", agentId: "github-copilot-cli", commandPath: "copilot" },
      },
    };
    expect(isConfiguredAcpProviderPreset(instances, copilot)).toBe(true);
    expect(isConfiguredAcpProviderPreset(instances, agency)).toBe(false);
  });

  it("ignores other drivers", () => {
    const instances = {
      codex: { driver: "codex", config: { source: "local", commandPath: "copilot" } },
    };
    expect(isConfiguredAcpProviderPreset(instances, copilot)).toBe(false);
  });
});
