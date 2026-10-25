import { assert, describe, it } from "@effect/vitest";
import { ProviderInstanceId, type AcpLaunchPreset } from "@t3tools/contracts";

import {
  ACP_LAUNCH_PRESET_NONE,
  ACP_LAUNCH_PRESET_OPTION_ID,
  acpLaunchPresetDescriptor,
  applyAcpLaunchPreset,
  selectedAcpLaunchPreset,
} from "./AcpLaunchPresets.ts";

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
