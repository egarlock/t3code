import {
  ACP_LAUNCH_TOGGLE_OPTION_PREFIX,
  type AcpLaunchPreset,
  type ModelSelection,
  type ProviderOptionChoice,
  type ProviderOptionDescriptor,
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

/** True for synthetic launch options, which must never reach the agent as config. */
export function isAcpLaunchOptionId(id: string): boolean {
  return id === ACP_LAUNCH_PRESET_OPTION_ID || id.startsWith(ACP_LAUNCH_TOGGLE_OPTION_PREFIX);
}

/** One boolean composer option per launch toggle, off by default. */
export function acpLaunchToggleDescriptors(
  toggles: ReadonlyArray<AcpLaunchPreset>,
): ReadonlyArray<ProviderOptionDescriptor> {
  const seen = new Set<string>();
  const descriptors: Array<ProviderOptionDescriptor> = [];
  for (const toggle of toggles) {
    if (seen.has(toggle.id)) continue;
    seen.add(toggle.id);
    descriptors.push({
      id: `${ACP_LAUNCH_TOGGLE_OPTION_PREFIX}${toggle.id}`,
      label: toggle.label,
      type: "boolean",
      currentValue: false,
    });
  }
  return descriptors;
}

/** Toggles switched on by a selection, in settings order. */
export function selectedAcpLaunchToggles(
  toggles: ReadonlyArray<AcpLaunchPreset>,
  selection: ModelSelection | undefined,
): ReadonlyArray<AcpLaunchPreset> {
  const enabled = new Set(
    (selection?.options ?? []).flatMap((option) =>
      option.value === true && option.id.startsWith(ACP_LAUNCH_TOGGLE_OPTION_PREFIX)
        ? [option.id.slice(ACP_LAUNCH_TOGGLE_OPTION_PREFIX.length)]
        : [],
    ),
  );
  const seen = new Set<string>();
  return toggles.filter((toggle) => {
    if (!enabled.has(toggle.id) || seen.has(toggle.id)) return false;
    seen.add(toggle.id);
    return true;
  });
}

/** Identifies the process a selection launches, so a change respawns the runtime. */
export function acpLaunchKey(
  settings: {
    readonly launchPresets: ReadonlyArray<AcpLaunchPreset>;
    readonly launchToggles: ReadonlyArray<AcpLaunchPreset>;
  },
  selection: ModelSelection | undefined,
): string {
  const presetId = selectedAcpLaunchPreset(settings.launchPresets, selection)?.id ?? "";
  const toggleIds = selectedAcpLaunchToggles(settings.launchToggles, selection).map(
    (toggle) => toggle.id,
  );
  return toggleIds.length === 0 ? presetId : JSON.stringify([presetId, ...toggleIds]);
}

/** Applies the selected preset, then each selected toggle, over the base spawn. */
export function applyAcpLaunchSelection(
  spawn: AcpSpawnInput,
  settings: {
    readonly launchPresets: ReadonlyArray<AcpLaunchPreset>;
    readonly launchToggles: ReadonlyArray<AcpLaunchPreset>;
  },
  selection: ModelSelection | undefined,
): AcpSpawnInput {
  return [
    selectedAcpLaunchPreset(settings.launchPresets, selection),
    ...selectedAcpLaunchToggles(settings.launchToggles, selection),
  ].reduce(applyAcpLaunchPreset, spawn);
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
