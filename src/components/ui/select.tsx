"use client";

import { Select as BaseSelect } from "@base-ui/react/select";
import { Check, ChevronDown } from "lucide-react";
import { Children, isValidElement, type ChangeEvent, type ChangeEventHandler, type ComponentPropsWithoutRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type Option = {
  value: string;
  label: ReactNode;
  disabled: boolean;
};

type SelectProps = Omit<
  ComponentPropsWithoutRef<"select">,
  "children" | "defaultValue" | "multiple" | "onChange" | "size" | "value"
> & {
  children: ReactNode;
  defaultValue?: string;
  onChange?: ChangeEventHandler<HTMLSelectElement>;
  value?: string;
};

function getOptions(children: ReactNode): Option[] {
  return Children.toArray(children).flatMap((child) => {
    if (!isValidElement<{ value?: string; disabled?: boolean; children?: ReactNode }>(child) || child.type !== "option") {
      return [];
    }

    return [{
      value: child.props.value ?? String(child.props.children ?? ""),
      label: child.props.children,
      disabled: child.props.disabled ?? false,
    }];
  });
}

export function Select({
  autoComplete,
  children,
  className,
  defaultValue,
  disabled,
  form,
  id,
  name,
  onChange,
  required,
  value,
  ...triggerProps
}: SelectProps) {
  const options = getOptions(children);

  function handleValueChange(nextValue: string | null) {
    if (!onChange) return;

    const event = {
      currentTarget: { value: nextValue ?? "" },
      target: { value: nextValue ?? "" },
    } as ChangeEvent<HTMLSelectElement>;
    onChange(event);
  }

  return (
    <BaseSelect.Root
      autoComplete={autoComplete}
      defaultValue={defaultValue}
      disabled={disabled}
      form={form}
      id={id}
      items={options}
      modal={false}
      name={name}
      onValueChange={handleValueChange}
      required={required}
      value={value}
    >
      <BaseSelect.Trigger
        className={cn(
          "relative flex w-full items-center rounded-md border border-input bg-background px-3 text-left text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60",
          className
        )}
        {...(triggerProps as ComponentPropsWithoutRef<"button">)}
      >
        <BaseSelect.Value className="min-w-0 flex-1 truncate" />
        <ChevronDown aria-hidden="true" className="absolute right-1 size-4 -translate-y-1/2 text-muted-foreground top-1/2" />
      </BaseSelect.Trigger>
      <BaseSelect.Portal>
        <BaseSelect.Positioner align="start" alignItemWithTrigger={false} className="z-[60] outline-none" side="bottom" sideOffset={4}>
          <BaseSelect.Popup className="min-w-[var(--anchor-width)] overflow-hidden rounded-md border border-border bg-card text-foreground shadow-md outline-none">
            <BaseSelect.List className="max-h-[min(16rem,var(--available-height))] overflow-y-auto p-1">
              {options.map((option) => (
                <BaseSelect.Item
                  key={option.value}
                  disabled={option.disabled}
                  value={option.value}
                  className="grid cursor-default grid-cols-[1fr_auto] items-center gap-2 rounded-sm px-2.5 py-2 text-sm outline-none select-none data-highlighted:bg-muted data-highlighted:text-foreground data-disabled:pointer-events-none data-disabled:opacity-50"
                >
                  <BaseSelect.ItemText className="min-w-0 truncate">{option.label}</BaseSelect.ItemText>
                  <BaseSelect.ItemIndicator><Check aria-hidden="true" className="size-4 text-primary" /></BaseSelect.ItemIndicator>
                </BaseSelect.Item>
              ))}
            </BaseSelect.List>
          </BaseSelect.Popup>
        </BaseSelect.Positioner>
      </BaseSelect.Portal>
    </BaseSelect.Root>
  );
}
