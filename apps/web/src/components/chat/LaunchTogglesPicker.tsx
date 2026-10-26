import {
  type ProviderDriverKind,
  type ProviderInstanceId,
  type ProviderOptionDescriptor,
  type ProviderOptionSelection,
  type ScopedThreadRef,
  type ServerProviderModel,
} from "@t3tools/contracts";
import {
  buildProviderOptionSelectionsFromDescriptors,
  getProviderOptionDescriptors,
} from "@t3tools/shared/model";
import { isLaunchToggleDescriptor } from "@t3tools/client-runtime/model-traits";
import { PlugIcon } from "lucide-react";
import { memo } from "react";

import { useComposerDraftStore, type DraftId } from "../../composerDraftStore";
import { cn } from "~/lib/utils";
import { getProviderModelCapabilities } from "../../providerModels";
import { Menu, MenuCheckboxItem, MenuGroup, MenuPopup, MenuTrigger } from "../ui/menu";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../ui/tooltip";
import {
  ComposerControl,
  ComposerControlChevron,
  ComposerControlIcon,
  type ComposerControlSize,
} from "./ComposerControl";
import { useComposerMenuProps } from "./composerEventScope";
import { useComposerMenuState } from "./useComposerMenuState";

type BooleanDescriptor = Extract<ProviderOptionDescriptor, { type: "boolean" }>;

/** Trigger text: the checked toggle labels, or a neutral name when none are on. */
export function launchTogglesTriggerLabel(toggles: ReadonlyArray<BooleanDescriptor>): string {
  const checked = toggles.filter((toggle) => toggle.currentValue === true);
  return checked.length === 0 ? "Toggles" : checked.map((toggle) => toggle.label).join(", ");
}

export interface LaunchTogglesProps {
  provider: ProviderDriverKind;
  instanceId?: ProviderInstanceId;
  threadRef?: ScopedThreadRef;
  draftId?: DraftId;
  model: string;
  models: ReadonlyArray<ServerProviderModel>;
  modelOptions: ReadonlyArray<ProviderOptionSelection> | undefined;
  planModeEnabled: boolean;
  /** Saves outside the composer draft store, such as a settings default. */
  onModelOptionsChange?: (options: ReadonlyArray<ProviderOptionSelection> | undefined) => void;
}

function getLaunchToggleDescriptors(
  props: Pick<
    LaunchTogglesProps,
    "provider" | "model" | "models" | "modelOptions" | "planModeEnabled"
  >,
) {
  const descriptors = getProviderOptionDescriptors({
    caps: getProviderModelCapabilities(
      props.models,
      props.model,
      props.provider,
      props.planModeEnabled,
    ),
    selections: props.modelOptions,
  });
  const toggles = descriptors.filter((descriptor): descriptor is BooleanDescriptor =>
    isLaunchToggleDescriptor(descriptor),
  );
  return { descriptors, toggles };
}

export function hasLaunchToggles(
  props: Pick<
    LaunchTogglesProps,
    "provider" | "model" | "models" | "modelOptions" | "planModeEnabled"
  >,
): boolean {
  return getLaunchToggleDescriptors(props).toggles.length > 0;
}

function useLaunchToggles({
  provider,
  instanceId,
  threadRef,
  draftId,
  model,
  models,
  modelOptions,
  planModeEnabled,
  onModelOptionsChange,
}: LaunchTogglesProps) {
  const setProviderModelOptions = useComposerDraftStore((store) => store.setProviderModelOptions);
  const { descriptors, toggles } = getLaunchToggleDescriptors({
    provider,
    model,
    models,
    modelOptions,
    planModeEnabled,
  });
  const setToggle = (id: string, checked: boolean) => {
    // Write every descriptor so the other composer options keep their values.
    const next = buildProviderOptionSelectionsFromDescriptors(
      descriptors.map((descriptor) =>
        descriptor.id === id && descriptor.type === "boolean"
          ? { ...descriptor, currentValue: checked }
          : descriptor,
      ),
    );
    if (onModelOptionsChange) {
      onModelOptionsChange(next);
      return;
    }
    const target = threadRef ?? draftId;
    if (!target) return;
    setProviderModelOptions(target, provider, next, {
      ...(instanceId ? { instanceId } : {}),
      model,
      persistSticky: true,
    });
  };
  return { toggles, setToggle };
}

/** Checkbox items for the launch toggles, for use inside an existing menu. */
export const LaunchTogglesMenuContent = memo(function LaunchTogglesMenuContent(
  props: LaunchTogglesProps,
) {
  const { toggles, setToggle } = useLaunchToggles(props);
  if (toggles.length === 0) return null;
  return (
    <MenuGroup>
      <div className="px-2 py-1.5 font-medium text-muted-foreground text-xs">Launch toggles</div>
      {toggles.map((toggle) => (
        <MenuCheckboxItem
          key={toggle.id}
          checked={toggle.currentValue === true}
          onCheckedChange={(checked) => setToggle(toggle.id, checked)}
        >
          {toggle.label}
        </MenuCheckboxItem>
      ))}
    </MenuGroup>
  );
});

/** Dropdown for switching launch toggles on and off independently, in the composer or settings. */
export const LaunchTogglesPicker = memo(function LaunchTogglesPicker({
  size = "sm",
  hidden = false,
  isComposerOwned,
  triggerClassName,
  ...props
}: LaunchTogglesProps & {
  size?: ComposerControlSize;
  hidden?: boolean;
  isComposerOwned?: boolean;
  triggerClassName?: string;
}) {
  const composerFloatingLayerProps = useComposerMenuProps();
  const [isMenuOpen, setIsMenuOpen] = useComposerMenuState(hidden);
  const { toggles } = useLaunchToggles(props);
  if (toggles.length === 0) return null;
  const label = launchTogglesTriggerLabel(toggles);

  return (
    <Menu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
      <Tooltip>
        <TooltipTrigger
          render={
            <MenuTrigger
              render={
                <ComposerControl
                  aria-label={`Launch toggles: ${label}`}
                  size={size}
                  className={cn(
                    "min-w-0 max-w-48 shrink justify-start overflow-hidden whitespace-nowrap",
                    triggerClassName,
                  )}
                />
              }
            />
          }
        >
          <ComposerControlIcon icon={PlugIcon} size={size} />
          <span data-composer-control-label className="min-w-0 truncate">
            {label}
          </span>
          <ComposerControlChevron size={size} />
        </TooltipTrigger>
        <TooltipPopup side="top">Launch toggles: {label}</TooltipPopup>
      </Tooltip>
      <MenuPopup align="start" {...(isComposerOwned ? composerFloatingLayerProps : {})}>
        <LaunchTogglesMenuContent {...props} />
      </MenuPopup>
    </Menu>
  );
});
