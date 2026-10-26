import { describe, expect, it } from "vite-plus/test";
import { makeProviderSettingsSchema, ProviderDriverKind, TrimmedString } from "@t3tools/contracts";
import * as Schema from "effect/Schema";

import { providerClients } from "./providerDriverMeta";
import {
  deriveProviderSettingsFields,
  formatLaunchPresetEnv,
  nextProviderConfigWithFieldValue,
  parseLaunchPresetArgs,
  parseLaunchPresetEnv,
} from "./ProviderSettingsForm";

describe("ProviderSettingsForm helpers", () => {
  it("keeps every masked field as a stored secret", () => {
    const settingsSchema = makeProviderSettingsSchema({
      token: TrimmedString.pipe(
        Schema.annotateKey({ providerSettingsForm: { control: "password" } }),
      ),
    });

    expect(deriveProviderSettingsFields({ settingsSchema })).toMatchObject([
      { key: "token", secret: true },
    ]);
  });

  it("preserves unknown config keys while omitting empty configurable fields", () => {
    const opencode = providerClients.get(ProviderDriverKind.make("opencode"));
    expect(opencode).toBeDefined();

    const serverUrl = deriveProviderSettingsFields(opencode!).find(
      (field) => field.key === "serverUrl",
    );
    expect(serverUrl).toBeDefined();

    const next = nextProviderConfigWithFieldValue(
      { forkOwned: 1, serverUrl: "http://127.0.0.1:4096" },
      serverUrl!,
      "",
    );

    expect(next).toEqual({ forkOwned: 1 });
  });

  it("stores false boolean fields when true is the default", () => {
    const next = nextProviderConfigWithFieldValue(
      undefined,
      {
        key: "experimental",
        control: "switch",
        label: "Experimental",
        clearWhenEmpty: "omit",
        defaultBooleanValue: true,
      },
      false,
    );

    expect(next).toEqual({ experimental: false });
  });

  it("parses launch preset arguments as one literal per line", () => {
    expect(parseLaunchPresetArgs("--profile-only\n  ado \n\n--model=gpt 5\n")).toEqual([
      "--profile-only",
      "ado",
      "--model=gpt 5",
    ]);
  });

  it("round-trips launch preset environment lines, keeping = inside values", () => {
    const env = parseLaunchPresetEnv("COPILOT_OFFLINE=true\n\nURL=http://h/?a=b\n =ignored\nEMPTY");
    expect(env).toEqual([
      { name: "COPILOT_OFFLINE", value: "true" },
      { name: "URL", value: "http://h/?a=b" },
      { name: "EMPTY", value: "" },
    ]);
    expect(parseLaunchPresetEnv(formatLaunchPresetEnv(env))).toEqual(env);
  });
});
