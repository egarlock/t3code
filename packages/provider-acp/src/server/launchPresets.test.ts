import { assert, describe, it } from "@effect/vitest";
import {
  ACP_LAUNCH_TOGGLE_OPTION_PREFIX,
  ProviderInstanceId,
  type AcpLaunchPreset,
} from "@t3tools/contracts";

import {
  ACP_LAUNCH_PRESET_NONE,
  ACP_LAUNCH_PRESET_OPTION_ID,
  acpLaunchKey,
  acpLaunchPresetDescriptor,
  acpLaunchToggleDescriptors,
  applyAcpLaunchPreset,
  applyAcpLaunchSelection,
  isAcpLaunchOptionId,
  selectedAcpLaunchPreset,
} from "./launchPresets.ts";

const instanceId = ProviderInstanceId.make("copilot");
const ado: AcpLaunchPreset = {
  id: "ado",
  label: "ADO + Teams",
  args: ["--profile-only", "ado", "--profile-only", "teams"],
  env: [],
};
const offline: AcpLaunchPreset = {
  id: "offline",
  label: "Offline",
  args: [],
  env: [
    { name: "COPILOT_OFFLINE", value: "true" },
    { name: "PATH", value: "/override" },
  ],
};
const selecting = (value: string) => ({
  instanceId,
  model: "default",
  options: [{ id: ACP_LAUNCH_PRESET_OPTION_ID, value }],
});

describe("AcpLaunchPresets", () => {
  it("offers no option without presets", () => {
    assert.isUndefined(acpLaunchPresetDescriptor([]));
  });

  it("offers the instance default first and drops duplicate preset ids", () => {
    const descriptor = acpLaunchPresetDescriptor([ado, { ...ado, label: "Shadow" }, offline]);
    assert.equal(descriptor?.type, "select");
    assert.deepEqual(
      descriptor?.type === "select" ? descriptor.options.map((choice) => choice.label) : [],
      ["Default", "ADO + Teams", "Offline"],
    );
    assert.equal(
      descriptor?.type === "select" ? descriptor.currentValue : undefined,
      ACP_LAUNCH_PRESET_NONE,
    );
  });

  it("resolves only presets that still exist", () => {
    assert.equal(selectedAcpLaunchPreset([ado, offline], selecting("offline")), offline);
    assert.isUndefined(selectedAcpLaunchPreset([ado], selecting("deleted")));
    assert.isUndefined(selectedAcpLaunchPreset([ado], selecting(ACP_LAUNCH_PRESET_NONE)));
    assert.isUndefined(selectedAcpLaunchPreset([ado], { instanceId, model: "default" }));
  });

  it("appends preset args after the instance command and layers env over it", () => {
    const spawn = {
      command: "agency",
      args: ["copilot", "--acp"],
      env: { PATH: "/usr/bin", HOME: "/home/eric" },
    };
    assert.deepEqual(applyAcpLaunchPreset(spawn, ado).args, [
      "copilot",
      "--acp",
      "--profile-only",
      "ado",
      "--profile-only",
      "teams",
    ]);
    assert.deepEqual(applyAcpLaunchPreset(spawn, offline).env, {
      PATH: "/override",
      HOME: "/home/eric",
      COPILOT_OFFLINE: "true",
    });
    assert.equal(applyAcpLaunchPreset(spawn, undefined), spawn);
  });
});

describe("AcpLaunchToggles", () => {
  const teams: AcpLaunchPreset = {
    id: "teams",
    label: "Teams",
    args: ["--profile-only", "teams"],
    env: [],
  };
  const notion: AcpLaunchPreset = {
    id: "notion",
    label: "Notion",
    args: ["--profile-only", "notion"],
    env: [{ name: "NOTION_TOKEN", value: "secret" }],
  };
  const settings = { launchPresets: [ado, offline], launchToggles: [teams, notion] };
  const toggled = (...ids: ReadonlyArray<string>) => ({
    instanceId,
    model: "default",
    options: ids.map((id) => ({ id: `${ACP_LAUNCH_TOGGLE_OPTION_PREFIX}${id}`, value: true })),
  });
  const spawn = { command: "agency", args: ["copilot", "--acp"], env: { HOME: "/home/eric" } };

  it("offers one boolean per toggle, off by default, without duplicates", () => {
    assert.deepEqual(acpLaunchToggleDescriptors([teams, { ...teams, label: "Dup" }, notion]), [
      { id: "_t3/launch-toggle:teams", label: "Teams", type: "boolean", currentValue: false },
      { id: "_t3/launch-toggle:notion", label: "Notion", type: "boolean", currentValue: false },
    ]);
  });

  it("recognizes every synthetic launch option and nothing else", () => {
    assert.isTrue(isAcpLaunchOptionId(ACP_LAUNCH_PRESET_OPTION_ID));
    assert.isTrue(isAcpLaunchOptionId("_t3/launch-toggle:teams"));
    assert.isFalse(isAcpLaunchOptionId("model"));
  });

  it("applies the preset, then checked toggles in settings order", () => {
    const selection = {
      ...toggled("notion", "teams", "deleted"),
      options: [
        { id: ACP_LAUNCH_PRESET_OPTION_ID, value: "ado" },
        ...toggled("notion", "teams", "deleted").options,
        { id: `${ACP_LAUNCH_TOGGLE_OPTION_PREFIX}off`, value: false },
      ],
    };
    const result = applyAcpLaunchSelection(spawn, settings, selection);
    assert.deepEqual(result.args, [
      "copilot",
      "--acp",
      "--profile-only",
      "ado",
      "--profile-only",
      "teams",
      "--profile-only",
      "teams",
      "--profile-only",
      "notion",
    ]);
    assert.deepEqual(result.env, { HOME: "/home/eric", NOTION_TOKEN: "secret" });
    assert.equal(applyAcpLaunchSelection(spawn, settings, toggled()), spawn);
  });

  it("keys the launch by preset and checked toggles regardless of selection order", () => {
    assert.equal(acpLaunchKey(settings, toggled()), "");
    assert.equal(acpLaunchKey(settings, selecting("ado")), "ado");
    assert.equal(
      acpLaunchKey(settings, toggled("notion", "teams")),
      acpLaunchKey(settings, toggled("teams", "notion")),
    );
    assert.notEqual(acpLaunchKey(settings, toggled("teams")), acpLaunchKey(settings, toggled()));
  });
});
