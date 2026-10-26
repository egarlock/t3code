import type { AcpLaunchPreset } from "@t3tools/contracts";

/**
 * Fork-only one-click presets for ACP providers this build is used with. Each
 * preset prefills a local-command `acpRegistry` instance, so it stays a normal
 * ACP provider that any T3 client (including the store mobile app) understands.
 * Commands are bare names resolved from the environment's PATH, so a preset
 * works unchanged on any machine with the CLI installed.
 */
export interface AcpProviderPreset {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly iconUrl: string;
  /** Registry agent an equivalent registry-source instance would use. */
  readonly registryAgentId?: string;
  readonly config: {
    readonly source: "local";
    readonly commandPath: string;
    readonly commandArgs: ReadonlyArray<string>;
    readonly iconUrl: string;
    readonly launchPresets?: ReadonlyArray<AcpLaunchPreset>;
    readonly launchToggles?: ReadonlyArray<AcpLaunchPreset>;
  };
}

const COPILOT_ICON_URL =
  "https://cdn.agentclientprotocol.com/registry/v1/latest/github-copilot-cli.svg";

const AGENCY_ICON_URL =
  "data:image/svg+xml,%3Csvg%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M21.5979%2012C21.5979%2012.3491%2021.5022%2012.6743%2021.3396%2012.9565L16.0787%2022.0435C16.2414%2021.7613%2016.337%2021.4361%2016.337%2021.087C16.337%2020.6613%2016.1983%2020.2739%2015.9687%2019.9535L4.27048%204.04652C4.04092%203.72609%203.90222%203.3387%203.90222%202.91304C3.90222%201.85609%204.75831%201%205.81527%201H14.424C15.1318%201%2015.7487%201.38261%2016.0787%201.95652L21.3396%2011.0435C21.5022%2011.3257%2021.5979%2011.6509%2021.5979%2012Z%22%20fill%3D%22url%28%23paint0_linear_4628_249%29%22%2F%3E%3Cpath%20d%3D%22M21.5979%2012C21.5979%2012.3491%2021.5022%2012.6743%2021.3396%2012.9565L16.0787%2022.0435C16.2414%2021.7613%2016.337%2021.4361%2016.337%2021.087C16.337%2020.6613%2016.1983%2020.2739%2015.9687%2019.9535L4.27048%204.04652C4.04092%203.72609%203.90222%203.3387%203.90222%202.91304C3.90222%201.85609%204.75831%201%205.81527%201H14.424C15.1318%201%2015.7487%201.38261%2016.0787%201.95652L21.3396%2011.0435C21.5022%2011.3257%2021.5979%2011.6509%2021.5979%2012Z%22%20fill%3D%22url%28%23paint1_linear_4628_249%29%22%20fill-opacity%3D%220.35%22%2F%3E%3Cpath%20d%3D%22M16.3369%2021.087C16.3369%2021.4361%2016.2412%2021.7613%2016.0786%2022.0435C15.7486%2022.6174%2015.1317%2023%2014.4238%2023H5.81514C5.28906%2023%204.8108%2022.7848%204.46166%2022.4404C4.11732%2022.0913%203.9021%2021.613%203.9021%2021.087C3.9021%2020.6613%204.0408%2020.2739%204.27036%2019.9535L10.1195%2012L15.9686%2019.9535C16.1982%2020.2739%2016.3369%2020.6613%2016.3369%2021.087Z%22%20fill%3D%22url%28%23paint2_radial_4628_249%29%22%2F%3E%3Cdefs%3E%3ClinearGradient%20id%3D%22paint0_linear_4628_249%22%20x1%3D%227.36961%22%20y1%3D%220.282609%22%20x2%3D%2219.4457%22%20y2%3D%2216.663%22%20gradientUnits%3D%22userSpaceOnUse%22%3E%3Cstop%20stop-color%3D%22%23FF9C70%22%2F%3E%3Cstop%20offset%3D%220.526953%22%20stop-color%3D%22%23F462AB%22%2F%3E%3Cstop%20offset%3D%221%22%20stop-color%3D%22%23BB45EA%22%2F%3E%3C%2FlinearGradient%3E%3ClinearGradient%20id%3D%22paint1_linear_4628_249%22%20x1%3D%2218.3696%22%20y1%3D%2218.2174%22%20x2%3D%2213.1087%22%20y2%3D%2215.2283%22%20gradientUnits%3D%22userSpaceOnUse%22%3E%3Cstop%20stop-color%3D%22%23B5BCFD%22%2F%3E%3Cstop%20offset%3D%220.694377%22%20stop-color%3D%22%23D753CB%22%20stop-opacity%3D%220%22%2F%3E%3C%2FlinearGradient%3E%3CradialGradient%20id%3D%22paint2_radial_4628_249%22%20cx%3D%220%22%20cy%3D%220%22%20r%3D%221%22%20gradientUnits%3D%22userSpaceOnUse%22%20gradientTransform%3D%22translate%283.9021%2023%29%20rotate%28-41.0425%29%20scale%2813.4748%2019.4848%29%22%3E%3Cstop%20offset%3D%220.0448771%22%20stop-color%3D%22%23CA59F7%22%2F%3E%3Cstop%20offset%3D%220.464608%22%20stop-color%3D%22%23A931D8%22%2F%3E%3Cstop%20offset%3D%221%22%20stop-color%3D%22%2355107A%22%2F%3E%3C%2FradialGradient%3E%3C%2Fdefs%3E%3C%2Fsvg%3E";

function profileToggle(id: string, label: string): AcpLaunchPreset {
  return { id, label, args: ["--profile-only", id], env: [] };
}

export const ACP_PROVIDER_PRESETS: ReadonlyArray<AcpProviderPreset> = [
  {
    id: "copilot",
    label: "Copilot",
    description: "GitHub Copilot CLI (copilot --acp)",
    iconUrl: COPILOT_ICON_URL,
    registryAgentId: "github-copilot-cli",
    config: {
      source: "local",
      commandPath: "copilot",
      commandArgs: ["--acp"],
      iconUrl: COPILOT_ICON_URL,
    },
  },
  {
    id: "agency",
    label: "Agency Copilot",
    description: "Copilot through Agency, with MCP profile toggles",
    iconUrl: AGENCY_ICON_URL,
    config: {
      source: "local",
      commandPath: "agency",
      commandArgs: ["copilot", "--no-default-mcps", "--disable-builtin-mcps", "--acp"],
      iconUrl: AGENCY_ICON_URL,
      launchPresets: [
        {
          id: "ado-teams",
          label: "ADO + Teams",
          args: ["--profile-only", "ado", "--profile-only", "teams"],
          env: [],
        },
      ],
      launchToggles: [
        profileToggle("ado", "ADO"),
        profileToggle("teams", "Teams"),
        profileToggle("work", "Work IQ"),
        profileToggle("web", "Web"),
        profileToggle("icm", "ICM"),
      ],
    },
  },
];

function executableName(path: string): string {
  return (path.split(/[\\/]/).pop() ?? "").replace(/\.(exe|cmd)$/i, "").toLowerCase();
}

/**
 * True when an existing ACP instance already runs the preset, either as a local
 * command with the same executable and leading arguments or as the equivalent
 * registry agent, so the dialog can mark it added.
 */
export function isConfiguredAcpProviderPreset(
  instances: Readonly<Record<string, { readonly driver: string; readonly config?: unknown }>>,
  preset: AcpProviderPreset,
): boolean {
  const presetCommand = executableName(preset.config.commandPath);
  return Object.values(instances).some((instance) => {
    if (instance.driver !== "acpRegistry" || !instance.config) return false;
    if (typeof instance.config !== "object") return false;
    const config = instance.config as Record<string, unknown>;
    if (config.source !== "local") {
      return preset.registryAgentId !== undefined && config.agentId === preset.registryAgentId;
    }
    if (typeof config.commandPath !== "string") return false;
    if (executableName(config.commandPath) !== presetCommand) return false;
    const args = Array.isArray(config.commandArgs) ? config.commandArgs : [];
    return preset.config.commandArgs.every((arg, index) => args[index] === arg);
  });
}
