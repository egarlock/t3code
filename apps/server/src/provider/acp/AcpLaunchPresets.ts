import type {
  AcpLaunchPreset,
  ModelSelection,
  ProviderOptionChoice,
  ProviderOptionDescriptor,
} from "@t3tools/contracts";

import type { AcpSpawnInput } from "./AcpSessionRuntime.ts";

/**
 * Launch presets let one ACP instance start its agent process with different
 * extra arguments and environment, chosen per thread through a synthetic
 * composer option. The selection changes the process itself, so the ACP
 * adapter respawns the runtime (and reloads the session) when it changes;
 * it is never sent to the agent as a session config option.
 */
export const ACP_LAUNCH_PRESET_OPTION_ID = "_t3/launch-preset";

/** Choice ID for launching with only the instance's own command and environment. */
export const ACP_LAUNCH_PRESET_NONE = "_t3/none";

export function acpLaunchPresetDescriptor(
  presets: ReadonlyArray<AcpLaunchPreset>,
): ProviderOptionDescriptor | undefined {
  if (presets.length === 0) return undefined;
  const seen = new Set<string>([ACP_LAUNCH_PRESET_NONE]);
  const choices: Array<ProviderOptionChoice> = [
    { id: ACP_LAUNCH_PRESET_NONE, label: "Default", isDefault: true },
  ];
  for (const preset of presets) {
    if (seen.has(preset.id)) continue;
    seen.add(preset.id);
    choices.push({ id: preset.id, label: preset.label });
  }
  return {
    id: ACP_LAUNCH_PRESET_OPTION_ID,
    label: "Launch preset",
    description: "Extra arguments and environment used to start the agent for this thread.",
    type: "select",
    options: choices,
    currentValue: ACP_LAUNCH_PRESET_NONE,
  };
}

/** Preset ID a selection launches with, or `undefined` for the instance default. */
export function acpLaunchPresetId(selection: ModelSelection | undefined): string | undefined {
  const value = selection?.options?.find(
    (option) => option.id === ACP_LAUNCH_PRESET_OPTION_ID,
  )?.value;
  return typeof value === "string" && value !== ACP_LAUNCH_PRESET_NONE ? value : undefined;
}

export function selectedAcpLaunchPreset(
  presets: ReadonlyArray<AcpLaunchPreset>,
  selection: ModelSelection | undefined,
): AcpLaunchPreset | undefined {
  const id = acpLaunchPresetId(selection);
  return id === undefined ? undefined : presets.find((preset) => preset.id === id);
}

export function applyAcpLaunchPreset(
  spawn: AcpSpawnInput,
  preset: AcpLaunchPreset | undefined,
): AcpSpawnInput {
  if (preset === undefined || (preset.args.length === 0 && preset.env.length === 0)) {
    return spawn;
  }
  return {
    ...spawn,
    args: [...spawn.args, ...preset.args],
    ...(preset.env.length === 0
      ? {}
      : {
          env: {
            ...spawn.env,
            ...Object.fromEntries(preset.env.map((variable) => [variable.name, variable.value])),
          },
        }),
  };
}
