"use client";

import { Input as AntInput, type InputProps as AntInputProps } from "antd";
import { cn } from "@/lib/utils";

function getSize(className?: string) {
  if (className?.match(/\bh-[67]\b/)) return "small";
  if (className?.match(/\bh-(9|10)\b/)) return "large";
  return "middle";
}

export function Input({ className, ...props }: AntInputProps) {
  return <AntInput {...props} className={cn("w-full", className)} size={getSize(className)} />;
}

export const TextArea = AntInput.TextArea;
