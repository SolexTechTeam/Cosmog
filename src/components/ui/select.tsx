"use client";

import { Select as AntSelect } from "antd";
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
  searchable?: boolean;
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

function getSize(className?: string) {
  if (className?.match(/\bh-[67]\b/)) return "small";
  if (className?.match(/\bh-(9|10)\b/)) return "large";
  return "middle";
}

export function Select({
  children,
  className,
  defaultValue,
  disabled,
  id,
  onChange,
  required,
  searchable = false,
  value,
}: SelectProps) {
  const options = getOptions(children);

  function handleValueChange(nextValue: string | number | null) {
    if (!onChange) return;

    const event = {
      currentTarget: { value: nextValue == null ? "" : String(nextValue) },
      target: { value: nextValue == null ? "" : String(nextValue) },
    } as ChangeEvent<HTMLSelectElement>;
    onChange(event);
  }

  return (
    <AntSelect
      aria-required={required || undefined}
      className={cn("w-full", className)}
      defaultValue={defaultValue}
      disabled={disabled}
      id={id}
      onChange={handleValueChange}
      optionFilterProp="label"
      options={options}
      listHeight={256}
      showSearch={searchable}
      size={getSize(className)}
      value={value}
    />
  );
}
